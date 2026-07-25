use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Component, Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Instant,
};

use chrono::{DateTime, SecondsFormat, Utc};
use uuid::Uuid;
use walkdir::WalkDir;

use crate::{
    database::Database,
    domain::{
        error::{DomainError, ErrorCode},
        models::{IndexStatus, ScanProgress, ScanRun, ScanStatus},
    },
    repositories::{
        DocumentRecord, DocumentRepository, GroupedDiscoveryRecord, GroupingSuggestionRecord,
        IndexSourceRecord, IndexSourceRepository, ScanErrorRecord, ScanRepository, ScanRunRecord,
        TopicRecord, TopicRepository,
    },
};

use super::{
    source_service::{now_timestamp, source_path_accessible},
    GroupingDecision, GroupingService, NameNormalizer, SourceService,
};

const DEFAULT_BATCH_SIZE: usize = 128;
const CURSOR_SEPARATOR: char = '\u{1f}';

pub type ProgressSink = Arc<dyn Fn(ScanProgress) + Send + Sync + 'static>;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ReconcileSummary {
    pub discovered_count: u64,
    pub processed_count: u64,
    pub missing_count: u64,
    pub failure_count: u64,
}

struct ScanSourceResult {
    completed: bool,
    complete_traversal: bool,
}

pub struct ScanCoordinator {
    database: Arc<Database>,
    jobs: Mutex<HashMap<String, Arc<AtomicBool>>>,
    active_sources: Mutex<HashSet<String>>,
    maintenance: Mutex<MaintenanceState>,
    batch_size: usize,
}

#[derive(Default)]
struct MaintenanceState {
    active: bool,
    mutation_active: bool,
}

pub struct MaintenanceGuard<'a> {
    coordinator: &'a ScanCoordinator,
}

pub struct MutationGuard<'a> {
    coordinator: &'a ScanCoordinator,
}

impl Drop for MaintenanceGuard<'_> {
    fn drop(&mut self) {
        if let Ok(mut state) = self.coordinator.maintenance.lock() {
            state.active = false;
        }
    }
}

impl Drop for MutationGuard<'_> {
    fn drop(&mut self) {
        if let Ok(mut state) = self.coordinator.maintenance.lock() {
            state.mutation_active = false;
        }
    }
}

impl ScanCoordinator {
    pub fn new(database: Arc<Database>) -> Arc<Self> {
        Self::with_batch_size(database, DEFAULT_BATCH_SIZE)
    }

    fn with_batch_size(database: Arc<Database>, batch_size: usize) -> Arc<Self> {
        Arc::new(Self {
            database,
            jobs: Mutex::new(HashMap::new()),
            active_sources: Mutex::new(HashSet::new()),
            maintenance: Mutex::new(MaintenanceState::default()),
            batch_size: batch_size.max(1),
        })
    }

    pub fn database(&self) -> &Database {
        &self.database
    }

    pub fn begin_maintenance(&self) -> Result<MaintenanceGuard<'_>, DomainError> {
        let active_sources = self
            .active_sources
            .lock()
            .map_err(|_| internal_lock_error())?;
        let mut maintenance = self.maintenance.lock().map_err(|_| internal_lock_error())?;
        if maintenance.active || maintenance.mutation_active || !active_sources.is_empty() {
            return Err(operation_already_running());
        }
        maintenance.active = true;
        Ok(MaintenanceGuard { coordinator: self })
    }

    pub fn begin_mutation(&self) -> Result<MutationGuard<'_>, DomainError> {
        let mut maintenance = self.maintenance.lock().map_err(|_| internal_lock_error())?;
        if maintenance.active || maintenance.mutation_active {
            return Err(operation_already_running());
        }
        maintenance.mutation_active = true;
        Ok(MutationGuard { coordinator: self })
    }

    pub fn start_scan(
        self: &Arc<Self>,
        source_ids: Vec<String>,
        progress_sink: ProgressSink,
    ) -> Result<ScanRun, DomainError> {
        let sources = self.resolve_sources(&source_ids)?;
        let selected_ids = sources
            .iter()
            .map(|source| source.id.clone())
            .collect::<Vec<_>>();
        self.reserve_sources(&selected_ids, true)?;

        let run = ScanRunRecord {
            id: Uuid::new_v4().to_string(),
            source_ids: selected_ids,
            status: "queued".into(),
            cursor_path: None,
            started_at: None,
            completed_at: None,
            discovered_count: 0,
            processed_count: 0,
            topic_count: 0,
            suggestion_count: 0,
            failure_count: 0,
            error_summary: None,
        };
        if let Err(error) = ScanRepository::new(&self.database).upsert_run(&run) {
            self.release_sources(&run.source_ids);
            return Err(error);
        }
        if let Err(error) = self.spawn(run.clone(), progress_sink) {
            self.release_sources(&run.source_ids);
            return Err(error);
        }
        scan_record_to_model(run)
    }

    pub fn cancel_scan(&self, scan_id: &str) -> Result<ScanRun, DomainError> {
        let repository = ScanRepository::new(&self.database);
        let mut run = repository.get_run(scan_id)?.ok_or_else(scan_not_found)?;
        if matches!(run.status.as_str(), "queued" | "running") {
            if let Some(cancel) = self
                .jobs
                .lock()
                .map_err(|_| internal_lock_error())?
                .get(scan_id)
            {
                cancel.store(true, Ordering::Release);
            }
            run.status = "cancelled".into();
            run.completed_at = Some(now_timestamp());
            repository.upsert_run(&run)?;
        }
        scan_record_to_model(run)
    }

    pub fn get_scan_status(&self, scan_id: &str) -> Result<ScanProgress, DomainError> {
        let run = ScanRepository::new(&self.database)
            .get_run(scan_id)?
            .ok_or_else(scan_not_found)?;
        scan_record_to_progress(run)
    }

    pub fn index_status(&self) -> Result<IndexStatus, DomainError> {
        let record = ScanRepository::new(&self.database).index_status()?;
        Ok(IndexStatus {
            scan_status: record.scan_status.as_deref().map(scan_status).transpose()?,
            discovered_count: count(record.discovered_count)?,
            processed_count: count(record.processed_count)?,
            document_count: count(record.document_count)?,
            topic_count: count(record.topic_count)?,
            suggestion_count: count(record.suggestion_count)?,
            failure_count: count(record.failure_count)?,
            last_completed_at: record.last_completed_at,
        })
    }

    pub fn reconcile_directories(
        &self,
        source_id: &str,
        directories: Vec<PathBuf>,
    ) -> Result<ReconcileSummary, DomainError> {
        let source_ids = [source_id.to_owned()];
        self.reserve_sources(&source_ids, true)?;
        let result = self.reconcile_directories_reserved(source_id, directories);
        self.release_sources(&source_ids);
        result
    }

    fn reconcile_directories_reserved(
        &self,
        source_id: &str,
        directories: Vec<PathBuf>,
    ) -> Result<ReconcileSummary, DomainError> {
        let source_repository = IndexSourceRepository::new(&self.database);
        let source = source_repository
            .get(source_id)?
            .ok_or_else(|| DomainError {
                code: ErrorCode::SourceNotFound,
                message: "The index source does not exist.".into(),
                field: Some("sourceId".into()),
            })?;
        if !source.enabled || !source_path_accessible(Path::new(&source.path)) {
            source_repository.update_scan_state(&source.id, "unavailable", None, None)?;
            return Err(DomainError {
                code: ErrorCode::SourceUnavailable,
                message: "The index source is unavailable for reconciliation.".into(),
                field: Some(source.id),
            });
        }

        let root = Path::new(&source.path);
        let directories = reconcile_directories(root, directories)?;
        let extensions = SourceService::new(&self.database).enabled_extensions()?;
        let scan_timestamp = format!("watch:{}", Uuid::new_v4());
        let run = ScanRunRecord {
            id: scan_timestamp.clone(),
            source_ids: vec![source.id.clone()],
            status: "running".into(),
            cursor_path: None,
            started_at: Some(now_timestamp()),
            completed_at: None,
            discovered_count: 0,
            processed_count: 0,
            topic_count: 0,
            suggestion_count: 0,
            failure_count: 0,
            error_summary: None,
        };
        let repository = DocumentRepository::new(&self.database);
        let mut summary = ReconcileSummary::default();

        for directory in directories {
            let mut discoveries = Vec::with_capacity(self.batch_size);
            let mut complete = true;
            if directory.is_dir() {
                for entry in WalkDir::new(&directory)
                    .follow_links(false)
                    .sort_by_file_name()
                {
                    let entry = match entry {
                        Ok(entry) => entry,
                        Err(_) => {
                            complete = false;
                            summary.failure_count += 1;
                            continue;
                        }
                    };
                    if !entry.file_type().is_file() {
                        continue;
                    }
                    let extension = entry
                        .path()
                        .extension()
                        .and_then(|value| value.to_str())
                        .map(str::to_lowercase)
                        .unwrap_or_default();
                    if !extensions.contains(&extension) {
                        continue;
                    }
                    summary.discovered_count += 1;
                    match self.discovery(&source, entry.path(), &run, &discoveries) {
                        Ok(discovery) => discoveries.push(discovery),
                        Err(_) => {
                            complete = false;
                            summary.failure_count += 1;
                        }
                    }
                    if discoveries.len() >= self.batch_size {
                        repository.upsert_grouped_discovery_batch(&discoveries)?;
                        summary.processed_count += discoveries.len() as u64;
                        discoveries.clear();
                    }
                }
            } else if directory.exists() {
                complete = false;
                summary.failure_count += 1;
            }
            if !discoveries.is_empty() {
                repository.upsert_grouped_discovery_batch(&discoveries)?;
                summary.processed_count += discoveries.len() as u64;
            }
            if directory == root && !source_path_accessible(root) {
                complete = false;
                source_repository.update_scan_state(&source.id, "unavailable", None, None)?;
            }
            if complete {
                summary.missing_count += repository.mark_missing_not_seen_under(
                    &source.id,
                    &directory,
                    &scan_timestamp,
                )?;
            }
        }
        Ok(summary)
    }

    pub fn resume_unfinished(
        self: &Arc<Self>,
        progress_sink: ProgressSink,
    ) -> Result<Vec<ScanRun>, DomainError> {
        let runs = ScanRepository::new(&self.database).list_unfinished()?;
        let mut resumed = Vec::with_capacity(runs.len());
        for run in runs {
            self.reserve_sources(&run.source_ids, false)?;
            if let Err(error) = self.spawn(run.clone(), progress_sink.clone()) {
                self.release_sources(&run.source_ids);
                return Err(error);
            }
            resumed.push(scan_record_to_model(run)?);
        }
        Ok(resumed)
    }

    fn resolve_sources(
        &self,
        source_ids: &[String],
    ) -> Result<Vec<IndexSourceRecord>, DomainError> {
        let repository = IndexSourceRepository::new(&self.database);
        let mut sources = if source_ids.is_empty() {
            repository.list_enabled()?
        } else {
            let mut sources = Vec::with_capacity(source_ids.len());
            let mut seen = HashSet::new();
            for source_id in source_ids {
                if !seen.insert(source_id) {
                    continue;
                }
                let source = repository.get(source_id)?.ok_or_else(|| DomainError {
                    code: ErrorCode::SourceNotFound,
                    message: "An index source selected for scanning does not exist.".into(),
                    field: Some("sourceIds".into()),
                })?;
                if !source.enabled {
                    return Err(DomainError {
                        code: ErrorCode::SourceUnavailable,
                        message: "A paused index source cannot be scanned.".into(),
                        field: Some(source.id),
                    });
                }
                sources.push(source);
            }
            sources
        };
        if sources.is_empty() {
            return Err(DomainError {
                code: ErrorCode::InvalidInput,
                message: "At least one enabled index source is required.".into(),
                field: Some("sourceIds".into()),
            });
        }
        sources.sort_by(|left, right| left.id.cmp(&right.id));
        Ok(sources)
    }

    fn resolve_run_sources(
        &self,
        source_ids: &[String],
    ) -> Result<Vec<IndexSourceRecord>, DomainError> {
        let repository = IndexSourceRepository::new(&self.database);
        let mut sources = Vec::with_capacity(source_ids.len());
        let mut seen = HashSet::new();
        for source_id in source_ids {
            if !seen.insert(source_id) {
                continue;
            }
            sources.push(repository.get(source_id)?.ok_or_else(|| DomainError {
                code: ErrorCode::SourceNotFound,
                message: "An index source selected for scanning does not exist.".into(),
                field: Some("sourceIds".into()),
            })?);
        }
        sources.sort_by(|left, right| left.id.cmp(&right.id));
        Ok(sources)
    }

    fn ensure_sources_idle(&self, source_ids: &[String]) -> Result<(), DomainError> {
        let selected = source_ids.iter().collect::<HashSet<_>>();
        let conflict = ScanRepository::new(&self.database)
            .list_unfinished()?
            .into_iter()
            .any(|run| {
                run.source_ids
                    .iter()
                    .any(|source_id| selected.contains(source_id))
            });
        if conflict {
            return Err(scan_already_running());
        }
        Ok(())
    }

    fn reserve_sources(
        &self,
        source_ids: &[String],
        check_persisted_runs: bool,
    ) -> Result<(), DomainError> {
        let mut active = self
            .active_sources
            .lock()
            .map_err(|_| internal_lock_error())?;
        if self
            .maintenance
            .lock()
            .map_err(|_| internal_lock_error())?
            .active
        {
            return Err(scan_already_running());
        }
        if source_ids
            .iter()
            .any(|source_id| active.contains(source_id))
        {
            return Err(scan_already_running());
        }
        if check_persisted_runs {
            self.ensure_sources_idle(source_ids)?;
        }
        active.extend(source_ids.iter().cloned());
        Ok(())
    }

    fn release_sources(&self, source_ids: &[String]) {
        if let Ok(mut active) = self.active_sources.lock() {
            for source_id in source_ids {
                active.remove(source_id);
            }
        }
    }

    fn spawn(
        self: &Arc<Self>,
        run: ScanRunRecord,
        progress_sink: ProgressSink,
    ) -> Result<(), DomainError> {
        let cancel = Arc::new(AtomicBool::new(false));
        {
            let mut jobs = self.jobs.lock().map_err(|_| internal_lock_error())?;
            if jobs.contains_key(&run.id) {
                return Ok(());
            }
            jobs.insert(run.id.clone(), cancel.clone());
        }

        let coordinator = Arc::clone(self);
        let scan_id = run.id.clone();
        let source_ids = run.source_ids.clone();
        std::thread::spawn(move || {
            if let Err(error) = coordinator.run_scan(run, cancel, &progress_sink) {
                coordinator.fail_scan(&scan_id, &error, &progress_sink);
            }
            if let Ok(mut jobs) = coordinator.jobs.lock() {
                jobs.remove(&scan_id);
            }
            coordinator.release_sources(&source_ids);
        });
        Ok(())
    }

    fn run_scan(
        &self,
        mut run: ScanRunRecord,
        cancel: Arc<AtomicBool>,
        progress_sink: &ProgressSink,
    ) -> Result<(), DomainError> {
        let started = Instant::now();
        if run.started_at.is_none() {
            run.started_at = Some(now_timestamp());
        }
        run.status = "running".into();
        run.completed_at = None;
        ScanRepository::new(&self.database).upsert_run(&run)?;
        emit_progress(progress_sink, &run, started);

        let extensions = SourceService::new(&self.database).enabled_extensions()?;
        let sources = self.resolve_run_sources(&run.source_ids)?;
        let resume_cursor = run.cursor_path.clone();
        let source_repository = IndexSourceRepository::new(&self.database);

        for source in sources {
            if self.finish_if_cancelled(&mut run, &cancel, progress_sink, started)? {
                return Ok(());
            }
            let scan_started_at = now_timestamp();
            let source = source_repository
                .update_scan_state(&source.id, "scanning", Some(&scan_started_at), None)?
                .ok_or_else(|| DomainError {
                    code: ErrorCode::SourceNotFound,
                    message: "An index source selected for scanning does not exist.".into(),
                    field: Some("sourceIds".into()),
                })?;
            if !source.enabled {
                continue;
            }

            let root = Path::new(&source.path);
            if !source_path_accessible(root) {
                self.record_scan_error(&mut run, &source.path, "source_unavailable")?;
                source_repository.update_scan_state(&source.id, "unavailable", None, None)?;
                emit_progress(progress_sink, &run, started);
                continue;
            }

            let source_result = self.scan_source(
                &source,
                &extensions,
                resume_cursor.as_deref(),
                &mut run,
                &cancel,
                progress_sink,
                started,
            )?;
            if !source_result.completed {
                source_repository.update_scan_state(&source.id, "ready", None, None)?;
                self.complete_cancelled(&mut run, progress_sink, started)?;
                return Ok(());
            }

            let still_accessible = source_path_accessible(Path::new(&source.path));
            if source_result.complete_traversal && still_accessible {
                DocumentRepository::new(&self.database)
                    .mark_missing_not_seen(&source.id, &run.id)?;
                let completed_at = now_timestamp();
                source_repository.update_scan_state(
                    &source.id,
                    "ready",
                    None,
                    Some(&completed_at),
                )?;
            } else {
                let status = if still_accessible {
                    "error"
                } else {
                    "unavailable"
                };
                source_repository.update_scan_state(&source.id, status, None, None)?;
            }
        }

        run.status = "completed".into();
        run.completed_at = Some(now_timestamp());
        run.cursor_path = None;
        ScanRepository::new(&self.database).upsert_run(&run)?;
        emit_progress(progress_sink, &run, started);
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    fn scan_source(
        &self,
        source: &IndexSourceRecord,
        extensions: &std::collections::BTreeSet<String>,
        resume_cursor: Option<&str>,
        run: &mut ScanRunRecord,
        cancel: &AtomicBool,
        progress_sink: &ProgressSink,
        started: Instant,
    ) -> Result<ScanSourceResult, DomainError> {
        let mut batch = Vec::with_capacity(self.batch_size);
        let mut last_cursor = None;
        let mut complete_traversal = true;
        let walker = WalkDir::new(&source.path)
            .follow_links(false)
            .sort_by_file_name()
            .into_iter();

        for entry in walker {
            if cancel.load(Ordering::Acquire) {
                return Ok(ScanSourceResult {
                    completed: false,
                    complete_traversal: false,
                });
            }
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    let path = error
                        .path()
                        .map(|path| path.to_string_lossy().into_owned())
                        .unwrap_or_else(|| source.path.clone());
                    self.record_scan_error(run, &path, walk_error_type(&error))?;
                    complete_traversal = false;
                    emit_progress(progress_sink, run, started);
                    continue;
                }
            };
            if !entry.file_type().is_file() {
                continue;
            }
            let path_text = entry.path().to_string_lossy().into_owned();
            let cursor = cursor_value(&source.id, &path_text);
            if resume_cursor.is_some_and(|saved| cursor.as_str() <= saved) {
                continue;
            }
            let extension = entry
                .path()
                .extension()
                .and_then(|value| value.to_str())
                .map(str::to_lowercase)
                .unwrap_or_default();
            if !extensions.contains(&extension) {
                continue;
            }

            run.discovered_count += 1;
            match self.discovery(source, entry.path(), run, &batch) {
                Ok(discovery) => batch.push(discovery),
                Err(error) => {
                    self.record_scan_error(run, &path_text, error_type(&error))?;
                    complete_traversal = false;
                    emit_progress(progress_sink, run, started);
                }
            }
            last_cursor = Some(cursor);
            if batch.len() >= self.batch_size {
                self.flush_batch(run, &mut batch, last_cursor.take(), progress_sink, started)?;
            }
        }
        self.flush_batch(run, &mut batch, last_cursor, progress_sink, started)?;
        Ok(ScanSourceResult {
            completed: !cancel.load(Ordering::Acquire),
            complete_traversal,
        })
    }

    fn discovery(
        &self,
        source: &IndexSourceRecord,
        path: &Path,
        run: &ScanRunRecord,
        transient: &[GroupedDiscoveryRecord],
    ) -> Result<GroupedDiscoveryRecord, DomainError> {
        let file_name = path
            .file_name()
            .and_then(|value| value.to_str())
            .ok_or_else(file_system_error)?;
        let normalized = NameNormalizer::normalize(file_name)?;
        let metadata = fs::metadata(path).map_err(|_| file_system_error())?;
        let absolute_path = path.to_string_lossy().into_owned();
        let file_identity = stable_file_identity(path, &metadata);
        let repository = DocumentRepository::new(&self.database);
        let existing_by_path = repository.get_by_source_path(&source.id, &absolute_path)?;
        let existing = match (existing_by_path, file_identity.as_deref()) {
            (Some(existing), _) => Some(existing),
            (None, Some(file_identity)) => {
                let candidates =
                    repository.list_by_source_file_identity(&source.id, file_identity)?;
                match candidates.as_slice() {
                    [candidate]
                        if candidate.manual_topic
                            && !Path::new(&candidate.absolute_path).exists() =>
                    {
                        Some(candidate.clone())
                    }
                    _ => None,
                }
            }
            (None, None) => None,
        };
        let now = now_timestamp();
        let document_id = existing
            .as_ref()
            .map(|document| document.id.clone())
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let initial_topic_id = existing
            .as_ref()
            .map(|document| document.topic_id.clone())
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let mut topic = TopicRecord {
            id: initial_topic_id.clone(),
            canonical_name: normalized.normalized_name.clone(),
            display_name: normalized.normalized_name.clone(),
            display_name_manual: false,
            grouping_confidence: "low".into(),
            newest_created_document_id: None,
            recently_modified_document_id: None,
            created_at: now.clone(),
            updated_at: now,
        };
        let document = DocumentRecord {
            id: document_id,
            source_id: source.id.clone(),
            topic_id: initial_topic_id,
            absolute_path,
            file_identity,
            file_name: normalized.original_file_name,
            normalized_name: normalized.normalized_name,
            extension: normalized.extension,
            version_label: normalized.version_label,
            version_sort_key: normalized.version_sort_key,
            size_bytes: i64::try_from(metadata.len()).map_err(|_| file_system_error())?,
            created_at: metadata.created().ok().map(system_time_text),
            modified_at: metadata.modified().ok().map(system_time_text),
            availability: "available".into(),
            manual_topic: existing
                .as_ref()
                .is_some_and(|document| document.manual_topic),
            indexed_at: run.id.clone(),
        };
        if existing.is_some() {
            topic = TopicRepository::new(&self.database)
                .get(&document.topic_id)?
                .ok_or_else(invalid_scan_status)?;
            return Ok(GroupedDiscoveryRecord {
                topic,
                document,
                topic_is_new: false,
                suggestion: None,
            });
        }

        let mut document = document;
        let mut suggestion = None;
        let topic_is_new =
            match GroupingService::new(&self.database).classify(&document, transient)? {
                GroupingDecision::AutoGroup(grouping_match) => {
                    topic = grouping_match.topic;
                    document.topic_id = topic.id.clone();
                    false
                }
                GroupingDecision::Suggest(grouping_match) => {
                    topic.grouping_confidence = "medium".into();
                    let mut source_topic_ids = vec![topic.id.clone(), grouping_match.topic.id];
                    source_topic_ids.sort();
                    let suggestion_id = format!("grouping:{}", source_topic_ids.join(":"));
                    suggestion = Some(GroupingSuggestionRecord {
                        id: suggestion_id,
                        source_topic_ids,
                        proposed_display_name: grouping_match.topic.display_name,
                        confidence: "medium".into(),
                        score: grouping_match.score,
                        evidence: grouping_match.evidence,
                        status: "pending".into(),
                        created_at: now_timestamp(),
                        updated_at: now_timestamp(),
                    });
                    true
                }
                GroupingDecision::Independent => true,
            };
        Ok(GroupedDiscoveryRecord {
            topic,
            document,
            topic_is_new,
            suggestion,
        })
    }

    fn flush_batch(
        &self,
        run: &mut ScanRunRecord,
        batch: &mut Vec<GroupedDiscoveryRecord>,
        cursor: Option<String>,
        progress_sink: &ProgressSink,
        started: Instant,
    ) -> Result<(), DomainError> {
        if batch.is_empty() {
            if cursor.is_none() {
                return Ok(());
            }
        } else {
            DocumentRepository::new(&self.database).upsert_grouped_discovery_batch(batch)?;
            run.processed_count += batch.len() as i64;
            run.topic_count += batch.iter().filter(|item| item.topic_is_new).count() as i64;
            run.suggestion_count += batch
                .iter()
                .filter(|item| item.suggestion.is_some())
                .count() as i64;
            batch.clear();
        }
        if let Some(cursor) = cursor {
            run.cursor_path = Some(cursor);
        }
        ScanRepository::new(&self.database).upsert_run(run)?;
        emit_progress(progress_sink, run, started);
        Ok(())
    }

    fn record_scan_error(
        &self,
        run: &mut ScanRunRecord,
        path: &str,
        error_type: &str,
    ) -> Result<(), DomainError> {
        run.failure_count += 1;
        run.error_summary = Some(format!("{} path(s) could not be read", run.failure_count));
        let error = ScanErrorRecord {
            id: None,
            scan_id: run.id.clone(),
            path: path.into(),
            error_type: error_type.into(),
            occurred_at: now_timestamp(),
            retry_status: "pending".into(),
        };
        ScanRepository::new(&self.database).add_error(&error)?;
        ScanRepository::new(&self.database).upsert_run(run)
    }

    fn finish_if_cancelled(
        &self,
        run: &mut ScanRunRecord,
        cancel: &AtomicBool,
        progress_sink: &ProgressSink,
        started: Instant,
    ) -> Result<bool, DomainError> {
        if cancel.load(Ordering::Acquire) {
            self.complete_cancelled(run, progress_sink, started)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    fn complete_cancelled(
        &self,
        run: &mut ScanRunRecord,
        progress_sink: &ProgressSink,
        started: Instant,
    ) -> Result<(), DomainError> {
        run.status = "cancelled".into();
        run.completed_at = Some(now_timestamp());
        ScanRepository::new(&self.database).upsert_run(run)?;
        emit_progress(progress_sink, run, started);
        Ok(())
    }

    fn fail_scan(&self, scan_id: &str, error: &DomainError, progress_sink: &ProgressSink) {
        let repository = ScanRepository::new(&self.database);
        if let Ok(Some(mut run)) = repository.get_run(scan_id) {
            if run.status == "cancelled" {
                return;
            }
            run.status = "failed".into();
            run.completed_at = Some(now_timestamp());
            run.error_summary = Some(format!("scan failed: {:?}", error.code));
            if repository.upsert_run(&run).is_ok() {
                emit_progress(progress_sink, &run, Instant::now());
            }
        }
    }
}

#[cfg(unix)]
fn stable_file_identity(_path: &Path, metadata: &fs::Metadata) -> Option<String> {
    use std::os::unix::fs::MetadataExt;

    Some(format!("unix:{}:{}", metadata.dev(), metadata.ino()))
}

#[cfg(target_os = "windows")]
fn stable_file_identity(path: &Path, _metadata: &fs::Metadata) -> Option<String> {
    use std::os::windows::{fs::OpenOptionsExt, io::AsRawHandle};

    use windows::Win32::{
        Foundation::HANDLE,
        Storage::FileSystem::{
            GetFileInformationByHandle, BY_HANDLE_FILE_INFORMATION, FILE_READ_ATTRIBUTES,
            FILE_SHARE_DELETE, FILE_SHARE_READ, FILE_SHARE_WRITE,
        },
    };

    let file = fs::OpenOptions::new()
        .access_mode(FILE_READ_ATTRIBUTES.0)
        .share_mode(FILE_SHARE_READ.0 | FILE_SHARE_WRITE.0 | FILE_SHARE_DELETE.0)
        .open(path)
        .ok()?;
    let mut information = BY_HANDLE_FILE_INFORMATION::default();
    unsafe {
        GetFileInformationByHandle(HANDLE(file.as_raw_handle()), &mut information).ok()?;
    }
    let file_index =
        (u64::from(information.nFileIndexHigh) << 32) | u64::from(information.nFileIndexLow);
    Some(format!(
        "windows:{}:{}",
        information.dwVolumeSerialNumber, file_index
    ))
}

#[cfg(not(any(unix, target_os = "windows")))]
fn stable_file_identity(_path: &Path, _metadata: &fs::Metadata) -> Option<String> {
    None
}

fn reconcile_directories(
    root: &Path,
    directories: Vec<PathBuf>,
) -> Result<Vec<PathBuf>, DomainError> {
    let mut directories = if directories.is_empty() {
        vec![root.to_path_buf()]
    } else {
        directories
    };
    for directory in &directories {
        if !directory.is_absolute()
            || directory
                .components()
                .any(|component| component == Component::ParentDir)
            || !path_starts_with(directory, root)
        {
            return Err(DomainError {
                code: ErrorCode::PathOutsideSource,
                message: "A reconciliation path is outside its index source.".into(),
                field: Some("path".into()),
            });
        }
    }
    directories.sort();
    directories.dedup();
    let mut collapsed: Vec<PathBuf> = Vec::with_capacity(directories.len());
    for directory in directories {
        if collapsed
            .iter()
            .any(|ancestor| path_starts_with(&directory, ancestor))
        {
            continue;
        }
        collapsed.push(directory);
    }
    Ok(collapsed)
}

fn path_starts_with(path: &Path, base: &Path) -> bool {
    #[cfg(target_os = "windows")]
    {
        comparison_path(path).starts_with(comparison_path(base))
    }
    #[cfg(not(target_os = "windows"))]
    {
        path.starts_with(base)
    }
}

#[cfg(target_os = "windows")]
fn comparison_path(path: &Path) -> PathBuf {
    let path = path.to_string_lossy();
    let path = if let Some(path) = path.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{path}")
    } else if let Some(path) = path.strip_prefix(r"\\?\") {
        path.to_owned()
    } else {
        path.into_owned()
    };
    PathBuf::from(path.to_lowercase())
}

fn emit_progress(progress_sink: &ProgressSink, run: &ScanRunRecord, started: Instant) {
    if let Ok(mut progress) = scan_record_to_progress(run.clone()) {
        progress.elapsed_ms = started.elapsed().as_millis().try_into().unwrap_or(u64::MAX);
        progress_sink(progress);
    }
}

fn scan_record_to_model(record: ScanRunRecord) -> Result<ScanRun, DomainError> {
    let status = scan_status(&record.status)?;
    Ok(ScanRun {
        id: record.id,
        source_ids: record.source_ids,
        status,
        started_at: record.started_at,
        completed_at: record.completed_at,
        discovered_count: count(record.discovered_count)?,
        processed_count: count(record.processed_count)?,
        topic_count: count(record.topic_count)?,
        suggestion_count: count(record.suggestion_count)?,
        failure_count: count(record.failure_count)?,
    })
}

fn scan_status(status: &str) -> Result<ScanStatus, DomainError> {
    Ok(match status {
        "queued" => ScanStatus::Queued,
        "running" => ScanStatus::Running,
        "completed" => ScanStatus::Completed,
        "cancelled" => ScanStatus::Cancelled,
        "failed" => ScanStatus::Failed,
        _ => return Err(invalid_scan_status()),
    })
}

fn scan_record_to_progress(record: ScanRunRecord) -> Result<ScanProgress, DomainError> {
    let current_path = record
        .cursor_path
        .as_deref()
        .and_then(|value| value.split_once(CURSOR_SEPARATOR))
        .map(|(_, path)| path.to_owned());
    let elapsed_ms = record
        .started_at
        .as_deref()
        .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
        .map(|started| Utc::now().signed_duration_since(started.with_timezone(&Utc)))
        .and_then(|duration| duration.num_milliseconds().try_into().ok())
        .unwrap_or_default();
    Ok(ScanProgress {
        run: scan_record_to_model(record)?,
        current_path,
        elapsed_ms,
    })
}

fn count(value: i64) -> Result<u64, DomainError> {
    value.try_into().map_err(|_| invalid_scan_status())
}

fn cursor_value(source_id: &str, path: &str) -> String {
    format!("{source_id}{CURSOR_SEPARATOR}{path}")
}

fn system_time_text(value: std::time::SystemTime) -> String {
    DateTime::<Utc>::from(value).to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn walk_error_type(error: &walkdir::Error) -> &'static str {
    error
        .io_error()
        .map(|error| match error.kind() {
            std::io::ErrorKind::PermissionDenied => "permission_denied",
            std::io::ErrorKind::NotFound => "path_not_found",
            _ => "directory_read_failed",
        })
        .unwrap_or("directory_read_failed")
}

fn error_type(error: &DomainError) -> &'static str {
    match error.code {
        ErrorCode::InvalidInput => "invalid_file_name",
        ErrorCode::FileSystemError => "metadata_read_failed",
        _ => "metadata_processing_failed",
    }
}

fn scan_not_found() -> DomainError {
    DomainError {
        code: ErrorCode::ScanNotFound,
        message: "The scan run does not exist.".into(),
        field: Some("scanId".into()),
    }
}

fn scan_already_running() -> DomainError {
    DomainError {
        code: ErrorCode::ScanAlreadyRunning,
        message: "An index source already has an active scan.".into(),
        field: Some("sourceIds".into()),
    }
}

fn operation_already_running() -> DomainError {
    DomainError {
        code: ErrorCode::ScanAlreadyRunning,
        message: "Another index operation is currently active.".into(),
        field: None,
    }
}

fn file_system_error() -> DomainError {
    DomainError {
        code: ErrorCode::FileSystemError,
        message: "File system metadata could not be read.".into(),
        field: None,
    }
}

fn invalid_scan_status() -> DomainError {
    DomainError {
        code: ErrorCode::DatabaseError,
        message: "The local metadata database contains invalid scan progress.".into(),
        field: None,
    }
}

fn internal_lock_error() -> DomainError {
    DomainError {
        code: ErrorCode::InternalError,
        message: "The scan coordinator is temporarily unavailable.".into(),
        field: None,
    }
}

#[cfg(test)]
mod tests {
    use std::{
        fs::{self, File},
        io::Write,
        sync::mpsc,
        thread,
        time::Duration,
    };

    use super::*;

    fn wait_for_terminal(coordinator: &ScanCoordinator, scan_id: &str) -> ScanProgress {
        for _ in 0..500 {
            let progress = coordinator.get_scan_status(scan_id).unwrap();
            if matches!(
                progress.run.status,
                ScanStatus::Completed | ScanStatus::Cancelled | ScanStatus::Failed
            ) {
                return progress;
            }
            thread::sleep(Duration::from_millis(10));
        }
        panic!("scan did not finish within the test deadline")
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn reconciliation_compares_verbatim_and_regular_windows_paths() {
        let drive_directory = PathBuf::from(r"c:\documents\team");
        assert_eq!(
            reconcile_directories(
                Path::new(r"\\?\C:\Documents"),
                vec![drive_directory.clone()]
            )
            .unwrap(),
            vec![drive_directory]
        );

        let unc_directory = PathBuf::from(r"\\server\share\team");
        assert_eq!(
            reconcile_directories(
                Path::new(r"\\?\UNC\server\share"),
                vec![unc_directory.clone()]
            )
            .unwrap(),
            vec![unc_directory]
        );
    }

    #[test]
    fn scans_metadata_only_and_ignores_disabled_extensions() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let root = tempfile::tempdir().unwrap();
        let mut document = File::create(root.path().join("Plan_V2.0.docx")).unwrap();
        document
            .write_all(b"body must not enter the index")
            .unwrap();
        File::create(root.path().join("ignored.exe")).unwrap();
        let source = SourceService::new(&database)
            .add_source(root.path().to_str().unwrap())
            .unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 1);
        let run = coordinator
            .start_scan(vec![source.id.clone()], Arc::new(|_| {}))
            .unwrap();
        let progress = wait_for_terminal(&coordinator, &run.id);
        assert_eq!(progress.run.status, ScanStatus::Completed);
        assert_eq!(progress.run.processed_count, 1);
        let index_status = coordinator.index_status().unwrap();
        assert_eq!(index_status.scan_status, Some(ScanStatus::Completed));
        assert_eq!(index_status.document_count, 1);
        assert_eq!(index_status.topic_count, 1);
        assert_eq!(index_status.failure_count, 0);
        assert!(index_status.last_completed_at.is_some());

        let documents = database
            .read(|connection| {
                connection.query_row(
                    "SELECT file_name, normalized_name, extension, size_bytes, COUNT(*) FROM documents",
                    [],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2)?,
                            row.get::<_, i64>(3)?,
                            row.get::<_, i64>(4)?,
                        ))
                    },
                )
            })
            .unwrap();
        assert_eq!(documents.0, "Plan_V2.0.docx");
        assert_eq!(documents.1, "plan");
        assert_eq!(documents.2, "docx");
        assert_eq!(documents.3, 29);
        assert_eq!(documents.4, 1);
    }

    #[test]
    fn records_unavailable_source_and_continues_other_sources() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let valid_root = tempfile::tempdir().unwrap();
        File::create(valid_root.path().join("valid.pdf")).unwrap();
        let valid = SourceService::new(&database)
            .add_source(valid_root.path().to_str().unwrap())
            .unwrap();
        let missing = IndexSourceRecord {
            id: "missing-source".into(),
            path: valid_root
                .path()
                .join("missing")
                .to_string_lossy()
                .into_owned(),
            display_name: "missing".into(),
            enabled: true,
            status: "ready".into(),
            added_at: now_timestamp(),
            last_scan_at: None,
            last_success_at: None,
        };
        IndexSourceRepository::new(&database)
            .upsert(&missing)
            .unwrap();

        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 1);
        let run = coordinator
            .start_scan(vec![missing.id, valid.id], Arc::new(|_| {}))
            .unwrap();
        let progress = wait_for_terminal(&coordinator, &run.id);
        assert_eq!(progress.run.status, ScanStatus::Completed);
        assert_eq!(progress.run.processed_count, 1);
        assert_eq!(progress.run.failure_count, 1);
        assert_eq!(
            ScanRepository::new(&database)
                .list_errors(&run.id)
                .unwrap()
                .len(),
            1
        );
    }

    #[test]
    fn completes_an_empty_source_without_documents() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let root = tempfile::tempdir().unwrap();
        let source = SourceService::new(&database)
            .add_source(root.path().to_str().unwrap())
            .unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 1);
        let run = coordinator
            .start_scan(vec![source.id], Arc::new(|_| {}))
            .unwrap();
        let progress = wait_for_terminal(&coordinator, &run.id);

        assert_eq!(progress.run.status, ScanStatus::Completed);
        assert_eq!(progress.run.discovered_count, 0);
        assert_eq!(progress.run.processed_count, 0);
    }

    #[test]
    fn scans_a_custom_enabled_extension() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let root = tempfile::tempdir().unwrap();
        File::create(root.path().join("notes.customdoc")).unwrap();
        let source_service = SourceService::new(&database);
        let source = source_service
            .add_source(root.path().to_str().unwrap())
            .unwrap();
        source_service
            .update_extensions(&["customdoc".into()])
            .unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 1);
        let run = coordinator
            .start_scan(vec![source.id], Arc::new(|_| {}))
            .unwrap();
        let progress = wait_for_terminal(&coordinator, &run.id);

        assert_eq!(progress.run.status, ScanStatus::Completed);
        assert_eq!(progress.run.processed_count, 1);
    }

    #[test]
    fn groups_identical_names_across_directories_within_one_batch() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let root = tempfile::tempdir().unwrap();
        fs::create_dir_all(root.path().join("team-a")).unwrap();
        fs::create_dir_all(root.path().join("team-b")).unwrap();
        File::create(root.path().join("team-a/Project Plan V1.docx")).unwrap();
        File::create(root.path().join("team-b/Project Plan V2.docx")).unwrap();
        let source = SourceService::new(&database)
            .add_source(root.path().to_str().unwrap())
            .unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 128);
        let run = coordinator
            .start_scan(vec![source.id], Arc::new(|_| {}))
            .unwrap();
        let progress = wait_for_terminal(&coordinator, &run.id);

        assert_eq!(progress.run.status, ScanStatus::Completed);
        assert_eq!(progress.run.processed_count, 2);
        assert_eq!(progress.run.topic_count, 1);
        let (topics, documents) = database
            .read(|connection| {
                Ok((
                    connection.query_row("SELECT COUNT(*) FROM topics", [], |row| {
                        row.get::<_, i64>(0)
                    })?,
                    connection.query_row(
                        "SELECT COUNT(DISTINCT topic_id) FROM documents",
                        [],
                        |row| row.get::<_, i64>(0),
                    )?,
                ))
            })
            .unwrap();
        assert_eq!((topics, documents), (1, 1));
    }

    #[test]
    fn persists_medium_confidence_grouping_suggestions() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let root = tempfile::tempdir().unwrap();
        File::create(root.path().join("Quarterly Finance Report V1.docx")).unwrap();
        File::create(root.path().join("Quarterly Financial Report V2.docx")).unwrap();
        let source = SourceService::new(&database)
            .add_source(root.path().to_str().unwrap())
            .unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 128);
        let run = coordinator
            .start_scan(vec![source.id], Arc::new(|_| {}))
            .unwrap();
        let progress = wait_for_terminal(&coordinator, &run.id);

        assert_eq!(progress.run.status, ScanStatus::Completed);
        assert_eq!(progress.run.topic_count, 2);
        assert_eq!(progress.run.suggestion_count, 1);
        let suggestion = database
            .read(|connection| {
                connection.query_row(
                    "SELECT confidence, status, score FROM grouping_suggestions",
                    [],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, f64>(2)?,
                        ))
                    },
                )
            })
            .unwrap();
        assert_eq!(suggestion.0, "medium");
        assert_eq!(suggestion.1, "pending");
        assert!(suggestion.2 >= 0.50);
    }

    #[test]
    fn cancels_an_active_background_scan() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let root = tempfile::tempdir().unwrap();
        File::create(root.path().join("pending.pdf")).unwrap();
        let source = SourceService::new(&database)
            .add_source(root.path().to_str().unwrap())
            .unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 1);
        let (running_sender, running_receiver) = mpsc::channel();
        let (release_sender, release_receiver) = mpsc::channel();
        let release_receiver = Mutex::new(release_receiver);
        let sink: ProgressSink = Arc::new(move |progress| {
            if progress.run.status == ScanStatus::Running && progress.run.discovered_count == 0 {
                running_sender.send(()).unwrap();
                release_receiver.lock().unwrap().recv().unwrap();
            }
        });
        let run = coordinator
            .start_scan(vec![source.id.clone()], sink)
            .unwrap();
        running_receiver
            .recv_timeout(Duration::from_secs(1))
            .unwrap();

        let cancelled = coordinator.cancel_scan(&run.id).unwrap();
        assert_eq!(cancelled.status, ScanStatus::Cancelled);
        let restart = coordinator.start_scan(vec![source.id.clone()], Arc::new(|_| {}));
        assert_eq!(restart.unwrap_err().code, ErrorCode::ScanAlreadyRunning);
        release_sender.send(()).unwrap();
        let progress = wait_for_terminal(&coordinator, &run.id);
        assert_eq!(progress.run.status, ScanStatus::Cancelled);
        assert_eq!(progress.run.processed_count, 0);
        assert_eq!(
            IndexSourceRepository::new(&database)
                .get(&source.id)
                .unwrap()
                .unwrap()
                .status,
            "ready"
        );
    }

    #[test]
    fn maintenance_excludes_scans_and_reconciliation() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let root = tempfile::tempdir().unwrap();
        File::create(root.path().join("document.pdf")).unwrap();
        let source = SourceService::new(&database)
            .add_source(root.path().to_str().unwrap())
            .unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database, 1);

        let maintenance = coordinator.begin_maintenance().unwrap();
        let scan = coordinator.start_scan(vec![source.id.clone()], Arc::new(|_| {}));
        assert_eq!(scan.unwrap_err().code, ErrorCode::ScanAlreadyRunning);
        let reconcile = coordinator.reconcile_directories(&source.id, vec![root.path().into()]);
        assert_eq!(reconcile.unwrap_err().code, ErrorCode::ScanAlreadyRunning);
        drop(maintenance);

        let run = coordinator
            .start_scan(vec![source.id], Arc::new(|_| {}))
            .unwrap();
        assert_eq!(
            wait_for_terminal(&coordinator, &run.id).run.status,
            ScanStatus::Completed
        );
    }

    #[test]
    fn maintenance_and_database_mutations_exclude_each_other() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let coordinator = ScanCoordinator::with_batch_size(database, 1);

        let mutation = coordinator.begin_mutation().unwrap();
        assert_eq!(
            coordinator.begin_maintenance().err().unwrap().code,
            ErrorCode::ScanAlreadyRunning
        );
        assert_eq!(
            coordinator.begin_mutation().err().unwrap().code,
            ErrorCode::ScanAlreadyRunning
        );
        drop(mutation);

        let mutation = coordinator.begin_mutation().unwrap();
        drop(mutation);

        let maintenance = coordinator.begin_maintenance().unwrap();
        assert_eq!(
            coordinator.begin_mutation().err().unwrap().code,
            ErrorCode::ScanAlreadyRunning
        );
        drop(maintenance);

        let mutation = coordinator.begin_mutation().unwrap();
        drop(mutation);
        assert!(coordinator.begin_maintenance().is_ok());
    }

    #[test]
    fn cancels_persisted_work_and_resumes_unfinished_run() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let root = tempfile::tempdir().unwrap();
        File::create(root.path().join("resume.md")).unwrap();
        let source = SourceService::new(&database)
            .add_source(root.path().to_str().unwrap())
            .unwrap();
        let scans = ScanRepository::new(&database);
        let cancelled = ScanRunRecord {
            id: "cancelled-run".into(),
            source_ids: vec![source.id.clone()],
            status: "queued".into(),
            cursor_path: None,
            started_at: None,
            completed_at: None,
            discovered_count: 0,
            processed_count: 0,
            topic_count: 0,
            suggestion_count: 0,
            failure_count: 0,
            error_summary: None,
        };
        scans.upsert_run(&cancelled).unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 1);
        assert_eq!(
            coordinator.cancel_scan(&cancelled.id).unwrap().status,
            ScanStatus::Cancelled
        );

        let resumable = ScanRunRecord {
            id: "resumable-run".into(),
            source_ids: vec![source.id],
            status: "running".into(),
            cursor_path: None,
            started_at: Some(now_timestamp()),
            completed_at: None,
            discovered_count: 0,
            processed_count: 0,
            topic_count: 0,
            suggestion_count: 0,
            failure_count: 0,
            error_summary: None,
        };
        scans.upsert_run(&resumable).unwrap();
        let resumed = coordinator.resume_unfinished(Arc::new(|_| {})).unwrap();
        assert_eq!(resumed.len(), 1);
        let progress = wait_for_terminal(&coordinator, &resumable.id);
        assert_eq!(progress.run.status, ScanStatus::Completed);
        assert_eq!(progress.run.processed_count, 1);
    }

    #[test]
    fn reconciles_new_and_removed_documents_within_one_directory() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let root = tempfile::tempdir().unwrap();
        let team_a = root.path().join("team-a");
        let team_b = root.path().join("team-b");
        fs::create_dir_all(&team_a).unwrap();
        fs::create_dir_all(&team_b).unwrap();
        let moved = team_a.join("Moved.docx");
        File::create(&moved).unwrap();
        let source = SourceService::new(&database)
            .add_source(root.path().to_str().unwrap())
            .unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 16);
        let run = coordinator
            .start_scan(vec![source.id.clone()], Arc::new(|_| {}))
            .unwrap();
        assert_eq!(
            wait_for_terminal(&coordinator, &run.id).run.status,
            ScanStatus::Completed
        );

        fs::rename(&moved, team_b.join("Moved.docx")).unwrap();
        File::create(team_a.join("Added.pdf")).unwrap();
        let summary = coordinator
            .reconcile_directories(&source.id, vec![team_a.clone()])
            .unwrap();

        assert_eq!(summary.discovered_count, 1);
        assert_eq!(summary.processed_count, 1);
        assert_eq!(summary.missing_count, 1);
        let states = database
            .read(|connection| {
                let mut statement = connection
                    .prepare("SELECT file_name, availability FROM documents ORDER BY file_name")?;
                let states = statement
                    .query_map([], |row| {
                        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                    })?
                    .collect::<rusqlite::Result<Vec<_>>>()?;
                Ok(states)
            })
            .unwrap();
        assert_eq!(
            states,
            vec![
                ("Added.pdf".into(), "available".into()),
                ("Moved.docx".into(), "missing".into()),
            ]
        );
    }

    #[test]
    fn root_reconciliation_flushes_batches_and_keeps_transient_grouping() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let root = tempfile::tempdir().unwrap();
        for version in 1..=5 {
            File::create(root.path().join(format!("Project Plan V{version}.docx"))).unwrap();
        }
        let source = SourceService::new(&database)
            .add_source(root.path().to_str().unwrap())
            .unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 2);

        let summary = coordinator
            .reconcile_directories(&source.id, vec![root.path().to_path_buf()])
            .unwrap();

        assert_eq!(summary.processed_count, 5);
        let (document_count, topic_count) = database
            .read(|connection| {
                Ok((
                    connection.query_row("SELECT COUNT(*) FROM documents", [], |row| {
                        row.get::<_, i64>(0)
                    })?,
                    connection.query_row(
                        "SELECT COUNT(DISTINCT topic_id) FROM documents",
                        [],
                        |row| row.get::<_, i64>(0),
                    )?,
                ))
            })
            .unwrap();
        assert_eq!((document_count, topic_count), (5, 1));
    }

    #[test]
    fn root_reconciliation_keeps_index_when_source_is_offline() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let parent = tempfile::tempdir().unwrap();
        let source_root = parent.path().join("source");
        let disconnected_root = parent.path().join("disconnected");
        fs::create_dir(&source_root).unwrap();
        File::create(source_root.join("Preserved.pdf")).unwrap();
        let source = SourceService::new(&database)
            .add_source(source_root.to_str().unwrap())
            .unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 1);
        let initial = coordinator
            .start_scan(vec![source.id.clone()], Arc::new(|_| {}))
            .unwrap();
        assert_eq!(
            wait_for_terminal(&coordinator, &initial.id).run.status,
            ScanStatus::Completed
        );
        fs::rename(&source_root, &disconnected_root).unwrap();

        let error = coordinator
            .reconcile_directories(&source.id, vec![source_root])
            .unwrap_err();

        assert_eq!(error.code, ErrorCode::SourceUnavailable);
        let availability = database
            .read(|connection| {
                connection.query_row("SELECT availability FROM documents", [], |row| {
                    row.get::<_, String>(0)
                })
            })
            .unwrap();
        assert_eq!(availability, "available");
        assert_eq!(
            IndexSourceRepository::new(&database)
                .get(&source.id)
                .unwrap()
                .unwrap()
                .status,
            "unavailable"
        );
    }

    #[test]
    fn resumed_scan_keeps_offline_index_and_continues_online_sources() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let parent = tempfile::tempdir().unwrap();
        let offline_root = parent.path().join("offline-source");
        let moved_root = parent.path().join("disconnected-source");
        let online_root = parent.path().join("online-source");
        fs::create_dir(&offline_root).unwrap();
        fs::create_dir(&online_root).unwrap();
        File::create(offline_root.join("Preserved.docx")).unwrap();
        File::create(online_root.join("Continued.pdf")).unwrap();
        let service = SourceService::new(&database);
        let offline = service.add_source(offline_root.to_str().unwrap()).unwrap();
        let online = service.add_source(online_root.to_str().unwrap()).unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 1);
        let initial = coordinator
            .start_scan(vec![offline.id.clone()], Arc::new(|_| {}))
            .unwrap();
        assert_eq!(
            wait_for_terminal(&coordinator, &initial.id).run.status,
            ScanStatus::Completed
        );
        fs::rename(&offline_root, &moved_root).unwrap();

        let resumable = ScanRunRecord {
            id: "resume-with-offline-source".into(),
            source_ids: vec![offline.id.clone(), online.id.clone()],
            status: "queued".into(),
            cursor_path: None,
            started_at: None,
            completed_at: None,
            discovered_count: 0,
            processed_count: 0,
            topic_count: 0,
            suggestion_count: 0,
            failure_count: 0,
            error_summary: None,
        };
        ScanRepository::new(&database)
            .upsert_run(&resumable)
            .unwrap();

        assert_eq!(
            coordinator
                .resume_unfinished(Arc::new(|_| {}))
                .unwrap()
                .len(),
            1
        );
        let progress = wait_for_terminal(&coordinator, &resumable.id);
        assert_eq!(progress.run.status, ScanStatus::Completed);
        assert_eq!(progress.run.processed_count, 1);
        assert_eq!(progress.run.failure_count, 1);
        assert_eq!(
            IndexSourceRepository::new(&database)
                .get(&offline.id)
                .unwrap()
                .unwrap()
                .status,
            "unavailable"
        );
        let states = database
            .read(|connection| {
                let mut statement = connection
                    .prepare("SELECT file_name, availability FROM documents ORDER BY file_name")?;
                let states = statement
                    .query_map([], |row| {
                        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                    })?
                    .collect::<rusqlite::Result<Vec<_>>>()?;
                Ok(states)
            })
            .unwrap();
        assert_eq!(
            states,
            vec![
                ("Continued.pdf".into(), "available".into()),
                ("Preserved.docx".into(), "available".into()),
            ]
        );
    }

    #[test]
    fn source_disconnect_during_scan_does_not_mark_unseen_documents_missing() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let parent = tempfile::tempdir().unwrap();
        let source_root = parent.path().join("source");
        let disconnected_root = parent.path().join("disconnected");
        fs::create_dir(&source_root).unwrap();
        File::create(source_root.join("one.pdf")).unwrap();
        File::create(source_root.join("two.pdf")).unwrap();
        let source = SourceService::new(&database)
            .add_source(source_root.to_str().unwrap())
            .unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 1);
        let initial = coordinator
            .start_scan(vec![source.id.clone()], Arc::new(|_| {}))
            .unwrap();
        assert_eq!(
            wait_for_terminal(&coordinator, &initial.id).run.status,
            ScanStatus::Completed
        );

        let (batch_sender, batch_receiver) = mpsc::channel();
        let (release_sender, release_receiver) = mpsc::channel();
        let release_receiver = Mutex::new(release_receiver);
        let batch_observed = AtomicBool::new(false);
        let sink: ProgressSink = Arc::new(move |progress| {
            if progress.run.status == ScanStatus::Running
                && progress.run.processed_count == 1
                && !batch_observed.swap(true, Ordering::AcqRel)
            {
                batch_sender.send(()).unwrap();
                release_receiver.lock().unwrap().recv().unwrap();
            }
        });
        let interrupted = coordinator
            .start_scan(vec![source.id.clone()], sink)
            .unwrap();
        batch_receiver.recv_timeout(Duration::from_secs(1)).unwrap();
        fs::rename(&source_root, &disconnected_root).unwrap();
        release_sender.send(()).unwrap();

        let progress = wait_for_terminal(&coordinator, &interrupted.id);
        assert_eq!(progress.run.status, ScanStatus::Completed);
        assert!(progress.run.failure_count >= 1);
        let (available, missing) = database
            .read(|connection| {
                Ok((
                    connection.query_row(
                        "SELECT COUNT(*) FROM documents WHERE availability = 'available'",
                        [],
                        |row| row.get::<_, i64>(0),
                    )?,
                    connection.query_row(
                        "SELECT COUNT(*) FROM documents WHERE availability = 'missing'",
                        [],
                        |row| row.get::<_, i64>(0),
                    )?,
                ))
            })
            .unwrap();
        assert_eq!((available, missing), (2, 0));
        assert_eq!(
            IndexSourceRepository::new(&database)
                .get(&source.id)
                .unwrap()
                .unwrap()
                .status,
            "unavailable"
        );
    }

    #[test]
    fn concurrent_pause_is_preserved_when_scan_finishes() {
        let database = Arc::new(Database::open_in_memory().unwrap());
        let root = tempfile::tempdir().unwrap();
        File::create(root.path().join("one.pdf")).unwrap();
        File::create(root.path().join("two.pdf")).unwrap();
        let service = SourceService::new(&database);
        let source = service.add_source(root.path().to_str().unwrap()).unwrap();
        let coordinator = ScanCoordinator::with_batch_size(database.clone(), 1);
        let (batch_sender, batch_receiver) = mpsc::channel();
        let (release_sender, release_receiver) = mpsc::channel();
        let release_receiver = Mutex::new(release_receiver);
        let batch_observed = AtomicBool::new(false);
        let sink: ProgressSink = Arc::new(move |progress| {
            if progress.run.status == ScanStatus::Running
                && progress.run.processed_count == 1
                && !batch_observed.swap(true, Ordering::AcqRel)
            {
                batch_sender.send(()).unwrap();
                release_receiver.lock().unwrap().recv().unwrap();
            }
        });
        let run = coordinator
            .start_scan(vec![source.id.clone()], sink)
            .unwrap();
        batch_receiver.recv_timeout(Duration::from_secs(1)).unwrap();

        let paused = service.set_source_enabled(&source.id, false).unwrap();
        assert_eq!(paused.status, crate::domain::models::SourceStatus::Paused);
        release_sender.send(()).unwrap();
        assert_eq!(
            wait_for_terminal(&coordinator, &run.id).run.status,
            ScanStatus::Completed
        );

        let persisted = IndexSourceRepository::new(&database)
            .get(&source.id)
            .unwrap()
            .unwrap();
        assert!(!persisted.enabled);
        assert_eq!(persisted.status, "paused");
    }
}
