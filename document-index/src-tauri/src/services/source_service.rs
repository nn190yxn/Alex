use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
};

use chrono::{SecondsFormat, Utc};
use regex::Regex;
use uuid::Uuid;

use crate::{
    database::Database,
    domain::{
        error::{DomainError, ErrorCode},
        models::{ExtensionRule, IndexSource, SourceStatus},
    },
    repositories::{
        ExtensionRuleRecord, ExtensionRuleRepository, IndexSourceRecord, IndexSourceRepository,
        ScanRepository,
    },
};

pub struct SourceService<'a> {
    database: &'a Database,
}

impl<'a> SourceService<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn list_sources(&self) -> Result<Vec<IndexSource>, DomainError> {
        self.refresh_source_statuses()?
            .into_iter()
            .map(record_to_source)
            .collect()
    }

    pub(crate) fn refresh_source_statuses(&self) -> Result<Vec<IndexSourceRecord>, DomainError> {
        let unfinished_sources = ScanRepository::new(self.database)
            .list_unfinished()?
            .into_iter()
            .flat_map(|run| run.source_ids)
            .collect::<BTreeSet<_>>();
        let repository = IndexSourceRepository::new(self.database);
        for source in repository.list()? {
            repository.refresh_accessibility(
                &source.id,
                source_path_accessible(Path::new(&source.path)),
                source.status == "scanning" && unfinished_sources.contains(&source.id),
            )?;
        }
        repository.list()
    }

    pub fn add_source(&self, path: &str) -> Result<IndexSource, DomainError> {
        let normalized = normalize_existing_directory(path)?;
        let repository = IndexSourceRepository::new(self.database);
        for source in repository.list()? {
            let existing = PathBuf::from(&source.path);
            if paths_overlap(&normalized, &existing) {
                return Err(DomainError {
                    code: ErrorCode::SourceOverlap,
                    message: "The selected directory overlaps an existing index source.".into(),
                    field: Some(source.id),
                });
            }
        }

        let now = now_timestamp();
        let record = IndexSourceRecord {
            id: Uuid::new_v4().to_string(),
            display_name: display_name(&normalized),
            path: path_text(&normalized),
            enabled: true,
            status: "ready".into(),
            added_at: now,
            last_scan_at: None,
            last_success_at: None,
        };
        repository.upsert(&record)?;
        record_to_source(record)
    }

    pub fn set_source_enabled(
        &self,
        source_id: &str,
        enabled: bool,
    ) -> Result<IndexSource, DomainError> {
        let repository = IndexSourceRepository::new(self.database);
        let source = repository.get(source_id)?.ok_or_else(|| DomainError {
            code: ErrorCode::SourceNotFound,
            message: "The index source does not exist.".into(),
            field: Some("sourceId".into()),
        })?;
        let enabled_status = if source_path_accessible(Path::new(&source.path)) {
            "ready"
        } else {
            "unavailable"
        };
        let source = repository
            .set_enabled(&source.id, enabled, enabled_status)?
            .ok_or_else(|| DomainError {
                code: ErrorCode::SourceNotFound,
                message: "The index source does not exist.".into(),
                field: Some("sourceId".into()),
            })?;
        record_to_source(source)
    }

    pub fn update_extensions(
        &self,
        extensions: &[String],
    ) -> Result<Vec<ExtensionRule>, DomainError> {
        let mut normalized = BTreeSet::new();
        for extension in extensions {
            normalized.insert(normalize_extension(extension)?);
        }
        if normalized.is_empty() {
            return Err(DomainError {
                code: ErrorCode::InvalidInput,
                message: "At least one document extension must remain enabled.".into(),
                field: Some("extensions".into()),
            });
        }
        let repository = ExtensionRuleRepository::new(self.database);
        repository.replace_enabled(&normalized)?;
        repository
            .list()?
            .into_iter()
            .map(record_to_extension)
            .collect()
    }

    pub fn list_extensions(&self) -> Result<Vec<ExtensionRule>, DomainError> {
        ExtensionRuleRepository::new(self.database)
            .list()?
            .into_iter()
            .map(record_to_extension)
            .collect()
    }

    pub fn enabled_extensions(&self) -> Result<BTreeSet<String>, DomainError> {
        Ok(ExtensionRuleRepository::new(self.database)
            .list()?
            .into_iter()
            .filter(|rule| rule.enabled)
            .map(|rule| rule.extension)
            .collect())
    }
}

pub(crate) fn source_path_accessible(path: &Path) -> bool {
    path.is_dir() && fs::read_dir(path).is_ok()
}

pub(crate) fn now_timestamp() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn normalize_existing_directory(path: &str) -> Result<PathBuf, DomainError> {
    let path = path.trim();
    if path.is_empty() {
        return Err(invalid_path_error());
    }
    let normalized = fs::canonicalize(path).map_err(|_| DomainError {
        code: ErrorCode::SourceUnavailable,
        message: "The selected directory is unavailable.".into(),
        field: Some("path".into()),
    })?;
    if !normalized.is_dir() {
        return Err(invalid_path_error());
    }
    Ok(normalized)
}

fn paths_overlap(left: &Path, right: &Path) -> bool {
    let left = comparison_path(left);
    let right = comparison_path(right);
    left.starts_with(&right) || right.starts_with(&left)
}

fn comparison_path(path: &Path) -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        PathBuf::from(path.to_string_lossy().to_lowercase())
    }
    #[cfg(not(target_os = "windows"))]
    {
        path.to_path_buf()
    }
}

fn path_text(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn display_name(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| path_text(path))
}

fn normalize_extension(extension: &str) -> Result<String, DomainError> {
    let extension = extension.trim().trim_start_matches('.').to_lowercase();
    let valid = Regex::new(r"^[a-z0-9]{1,16}$").expect("extension regex is valid");
    if valid.is_match(&extension) {
        Ok(extension)
    } else {
        Err(DomainError {
            code: ErrorCode::InvalidInput,
            message: "A document extension contains unsupported characters.".into(),
            field: Some("extensions".into()),
        })
    }
}

fn invalid_path_error() -> DomainError {
    DomainError {
        code: ErrorCode::InvalidInput,
        message: "An accessible directory path is required.".into(),
        field: Some("path".into()),
    }
}

pub(crate) fn record_to_source(record: IndexSourceRecord) -> Result<IndexSource, DomainError> {
    let status = match record.status.as_str() {
        "ready" => SourceStatus::Ready,
        "scanning" => SourceStatus::Scanning,
        "unavailable" => SourceStatus::Unavailable,
        "paused" => SourceStatus::Paused,
        "error" => SourceStatus::Error,
        _ => {
            return Err(DomainError {
                code: ErrorCode::DatabaseError,
                message: "The local metadata database contains an invalid source status.".into(),
                field: None,
            })
        }
    };
    Ok(IndexSource {
        id: record.id,
        path: record.path,
        display_name: record.display_name,
        enabled: record.enabled,
        status,
        added_at: record.added_at,
        last_scan_at: record.last_scan_at,
        last_success_at: record.last_success_at,
    })
}

fn record_to_extension(record: ExtensionRuleRecord) -> Result<ExtensionRule, DomainError> {
    Ok(ExtensionRule {
        id: record.id,
        extension: record.extension,
        built_in: record.built_in,
        enabled: record.enabled,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{ScanRepository, ScanRunRecord};

    #[test]
    fn rejects_overlapping_sources_and_normalizes_extensions() {
        let database = Database::open_in_memory().unwrap();
        let root = tempfile::tempdir().unwrap();
        let nested = root.path().join("nested");
        fs::create_dir(&nested).unwrap();
        let service = SourceService::new(&database);

        service.add_source(root.path().to_str().unwrap()).unwrap();
        let error = service.add_source(nested.to_str().unwrap()).unwrap_err();
        assert_eq!(error.code, ErrorCode::SourceOverlap);

        let rules = service
            .update_extensions(&[".PDF".into(), " odt ".into()])
            .unwrap();
        assert!(rules
            .iter()
            .any(|rule| rule.extension == "pdf" && rule.enabled));
        assert!(rules
            .iter()
            .any(|rule| rule.extension == "odt" && rule.enabled));
        assert!(rules
            .iter()
            .any(|rule| rule.extension == "docx" && !rule.enabled));
    }

    #[test]
    fn pause_preserves_source_configuration() {
        let database = Database::open_in_memory().unwrap();
        let root = tempfile::tempdir().unwrap();
        let service = SourceService::new(&database);
        let source = service.add_source(root.path().to_str().unwrap()).unwrap();
        let paused = service.set_source_enabled(&source.id, false).unwrap();
        assert!(!paused.enabled);
        assert_eq!(paused.status, SourceStatus::Paused);
        assert_eq!(paused.path, source.path);
    }

    #[test]
    fn lists_default_extension_rules() {
        let database = Database::open_in_memory().unwrap();
        let rules = SourceService::new(&database).list_extensions().unwrap();

        assert_eq!(rules.len(), 12);
        assert!(rules.iter().all(|rule| rule.built_in && rule.enabled));
    }

    #[test]
    fn refreshes_startup_statuses_without_overwriting_active_scans() {
        let database = Database::open_in_memory().unwrap();
        let root = tempfile::tempdir().unwrap();
        let repository = IndexSourceRepository::new(&database);
        for directory in ["paused", "recovered", "stale-scan", "active-scan"] {
            fs::create_dir(root.path().join(directory)).unwrap();
        }
        let records = [
            ("paused", false, "error", root.path().join("paused")),
            (
                "recovered",
                true,
                "unavailable",
                root.path().join("recovered"),
            ),
            (
                "stale-scan",
                true,
                "scanning",
                root.path().join("stale-scan"),
            ),
            (
                "active-scan",
                true,
                "scanning",
                root.path().join("active-scan"),
            ),
            ("offline", true, "ready", root.path().join("offline")),
        ];
        for (id, enabled, status, path) in records {
            repository
                .upsert(&IndexSourceRecord {
                    id: id.into(),
                    path: path.to_string_lossy().into_owned(),
                    display_name: id.into(),
                    enabled,
                    status: status.into(),
                    added_at: now_timestamp(),
                    last_scan_at: None,
                    last_success_at: None,
                })
                .unwrap();
        }
        ScanRepository::new(&database)
            .upsert_run(&ScanRunRecord {
                id: "unfinished".into(),
                source_ids: vec!["active-scan".into()],
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
            })
            .unwrap();

        let sources = SourceService::new(&database).list_sources().unwrap();
        let statuses = sources
            .into_iter()
            .map(|source| (source.id, source.status))
            .collect::<std::collections::HashMap<_, _>>();

        assert_eq!(statuses["paused"], SourceStatus::Paused);
        assert_eq!(statuses["recovered"], SourceStatus::Ready);
        assert_eq!(statuses["stale-scan"], SourceStatus::Ready);
        assert_eq!(statuses["active-scan"], SourceStatus::Scanning);
        assert_eq!(statuses["offline"], SourceStatus::Unavailable);
    }
}
