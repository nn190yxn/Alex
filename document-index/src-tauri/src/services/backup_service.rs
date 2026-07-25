use std::{
    collections::{BTreeMap, BTreeSet},
    fs::{self, OpenOptions},
    io::Write,
    path::Path,
};

use chrono::{SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    database::Database,
    domain::error::{DomainError, ErrorCode},
    repositories::{BackupData, BackupRepository, ScanRepository},
};

const BACKUP_FORMAT: &str = "document-index-backup";
const BACKUP_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupPreferences {
    pub default_time_dimension: String,
    pub workspace_split: f64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupExportResult {
    pub source_count: usize,
    pub topic_count: usize,
    pub document_count: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupRestoreResult {
    pub preferences: BackupPreferences,
    pub source_count: usize,
    pub topic_count: usize,
    pub document_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct BackupEnvelope {
    format: String,
    version: u32,
    exported_at: String,
    preferences: BackupPreferences,
    data: BackupData,
}

pub struct BackupService<'a> {
    database: &'a Database,
}

impl<'a> BackupService<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn export(
        &self,
        path: &str,
        preferences: BackupPreferences,
    ) -> Result<BackupExportResult, DomainError> {
        validate_backup_path(path)?;
        validate_preferences(&preferences)?;
        let data = BackupRepository::new(self.database).snapshot()?;
        let result = BackupExportResult {
            source_count: data.index_sources.len(),
            topic_count: data.topics.len(),
            document_count: data.documents.len(),
        };
        let envelope = BackupEnvelope {
            format: BACKUP_FORMAT.into(),
            version: BACKUP_VERSION,
            exported_at: Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
            preferences,
            data,
        };
        let bytes = serde_json::to_vec_pretty(&envelope)
            .map_err(|_| invalid_backup("The backup could not be serialized."))?;
        atomic_write(Path::new(path), &bytes)?;
        Ok(result)
    }

    pub fn restore(&self, path: &str) -> Result<BackupRestoreResult, DomainError> {
        validate_backup_path(path)?;
        if !ScanRepository::new(self.database)
            .list_unfinished()?
            .is_empty()
        {
            return Err(DomainError {
                code: ErrorCode::ScanAlreadyRunning,
                message: "The index backup can be restored after active scans finish.".into(),
                field: Some("path".into()),
            });
        }
        let bytes = fs::read(path)
            .map_err(|_| file_error("The selected backup file could not be read."))?;
        let envelope: BackupEnvelope = serde_json::from_slice(&bytes)
            .map_err(|_| invalid_backup("The selected file is not a valid index backup."))?;
        if envelope.format != BACKUP_FORMAT || envelope.version != BACKUP_VERSION {
            return Err(invalid_backup("The backup version is not supported."));
        }
        validate_preferences(&envelope.preferences)?;
        validate_data(&envelope.data)?;
        let source_accessible = envelope
            .data
            .index_sources
            .iter()
            .map(|source| directory_accessible(Path::new(&source.path)))
            .collect::<Vec<_>>();
        let source_statuses = envelope
            .data
            .index_sources
            .iter()
            .zip(&source_accessible)
            .map(|(source, accessible)| {
                if !source.enabled {
                    "paused"
                } else if *accessible {
                    "ready"
                } else {
                    "unavailable"
                }
                .to_owned()
            })
            .collect::<Vec<_>>();
        let source_accessibility = envelope
            .data
            .index_sources
            .iter()
            .zip(source_accessible)
            .map(|(source, accessible)| (source.id.as_str(), accessible))
            .collect::<BTreeMap<_, _>>();
        let document_statuses = envelope
            .data
            .documents
            .iter()
            .map(|document| {
                if !source_accessibility
                    .get(document.source_id.as_str())
                    .copied()
                    .unwrap_or(false)
                {
                    return "inaccessible".to_owned();
                }
                match fs::metadata(&document.absolute_path) {
                    Ok(metadata) if metadata.is_file() => "available".to_owned(),
                    Ok(_) => "missing".to_owned(),
                    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                        "missing".to_owned()
                    }
                    Err(_) => "inaccessible".to_owned(),
                }
            })
            .collect::<Vec<_>>();
        BackupRepository::new(self.database).replace(
            &envelope.data,
            &source_statuses,
            &document_statuses,
        )?;
        Ok(BackupRestoreResult {
            preferences: envelope.preferences,
            source_count: envelope.data.index_sources.len(),
            topic_count: envelope.data.topics.len(),
            document_count: envelope.data.documents.len(),
        })
    }
}

fn validate_backup_path(path: &str) -> Result<(), DomainError> {
    let path = Path::new(path.trim());
    if path.as_os_str().is_empty()
        || path
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| value.eq_ignore_ascii_case("json"))
            != Some(true)
    {
        return Err(invalid_field(
            "The backup path must point to a .json file.",
            "path",
        ));
    }
    Ok(())
}

fn validate_preferences(preferences: &BackupPreferences) -> Result<(), DomainError> {
    if !matches!(
        preferences.default_time_dimension.as_str(),
        "modifiedAt" | "createdAt"
    ) {
        return Err(invalid_field(
            "The default time dimension is invalid.",
            "preferences.defaultTimeDimension",
        ));
    }
    if !preferences.workspace_split.is_finite()
        || !(32.0..=68.0).contains(&preferences.workspace_split)
    {
        return Err(invalid_field(
            "The workspace split preference is invalid.",
            "preferences.workspaceSplit",
        ));
    }
    Ok(())
}

fn validate_data(data: &BackupData) -> Result<(), DomainError> {
    let source_ids = unique_ids(
        data.index_sources.iter().map(|record| record.id.as_str()),
        "data.indexSources",
    )?;
    let topic_ids = unique_ids(
        data.topics.iter().map(|record| record.id.as_str()),
        "data.topics",
    )?;
    let document_ids = unique_ids(
        data.documents.iter().map(|record| record.id.as_str()),
        "data.documents",
    )?;
    unique_ids(
        data.manual_grouping_rules
            .iter()
            .map(|record| record.id.as_str()),
        "data.manualGroupingRules",
    )?;
    unique_ids(
        data.extension_rules.iter().map(|record| record.id.as_str()),
        "data.extensionRules",
    )?;
    let mut source_paths = BTreeSet::new();
    for source in &data.index_sources {
        if source.path.trim().is_empty() || !source_paths.insert(source.path.as_str()) {
            return Err(invalid_backup(
                "Index source paths must be present and unique.",
            ));
        }
    }
    for topic in &data.topics {
        if topic.canonical_name.trim().is_empty()
            || topic.display_name.trim().is_empty()
            || !matches!(
                topic.grouping_confidence.as_str(),
                "manual" | "high" | "medium" | "low"
            )
        {
            return Err(invalid_backup("A topic record contains invalid metadata."));
        }
    }
    let sources_by_id = data
        .index_sources
        .iter()
        .map(|source| (source.id.as_str(), source))
        .collect::<BTreeMap<_, _>>();
    let documents_by_id = data
        .documents
        .iter()
        .map(|document| (document.id.as_str(), document))
        .collect::<BTreeMap<_, _>>();
    let mut document_paths = BTreeSet::new();
    for document in &data.documents {
        let source = sources_by_id
            .get(document.source_id.as_str())
            .ok_or_else(|| invalid_backup("A document references an unknown index source."))?;
        if !topic_ids.contains(document.topic_id.as_str()) {
            return Err(invalid_backup("A document references an unknown topic."));
        }
        if document.size_bytes < 0
            || document.file_name.trim().is_empty()
            || document.normalized_name.trim().is_empty()
            || !path_is_within(Path::new(&document.absolute_path), Path::new(&source.path))
            || !document_paths
                .insert((document.source_id.as_str(), document.absolute_path.as_str()))
        {
            return Err(invalid_backup(
                "A document record contains inconsistent metadata.",
            ));
        }
    }
    let mut rule_documents = BTreeSet::new();
    let mut rule_paths = BTreeSet::new();
    for rule in &data.manual_grouping_rules {
        if !topic_ids.contains(rule.topic_id.as_str())
            || rule
                .document_id
                .as_deref()
                .is_some_and(|id| !document_ids.contains(id))
            || rule
                .source_id
                .as_deref()
                .is_some_and(|id| !source_ids.contains(id))
            || (rule.document_id.is_none()
                && rule.file_identity.is_none()
                && rule.absolute_path.is_none())
            || rule
                .document_id
                .as_deref()
                .is_some_and(|id| !rule_documents.insert(id))
            || rule
                .absolute_path
                .as_deref()
                .is_some_and(|path| !rule_paths.insert((rule.source_id.as_deref(), path)))
        {
            return Err(invalid_backup(
                "A manual grouping rule contains an inconsistent reference.",
            ));
        }
        if let Some(document_id) = rule.document_id.as_deref() {
            let document = documents_by_id[document_id];
            if document.topic_id != rule.topic_id
                || rule
                    .source_id
                    .as_deref()
                    .is_some_and(|source_id| source_id != document.source_id)
            {
                return Err(invalid_backup(
                    "A manual grouping rule does not match its document relationship.",
                ));
            }
        }
    }
    let mut extensions = BTreeSet::new();
    for rule in &data.extension_rules {
        if rule.extension.is_empty()
            || rule.extension.len() > 16
            || !rule
                .extension
                .chars()
                .all(|character| character.is_ascii_alphanumeric())
            || !extensions.insert(rule.extension.as_str())
        {
            return Err(invalid_backup(
                "Extension rules must contain unique valid extensions.",
            ));
        }
    }
    if !data.extension_rules.iter().any(|rule| rule.enabled) {
        return Err(invalid_backup(
            "At least one extension rule must be enabled.",
        ));
    }
    Ok(())
}

fn unique_ids<'a>(
    ids: impl Iterator<Item = &'a str>,
    field: &str,
) -> Result<BTreeSet<&'a str>, DomainError> {
    let mut unique = BTreeSet::new();
    for id in ids {
        if id.trim().is_empty() || !unique.insert(id) {
            return Err(invalid_field(
                "Backup record IDs must be present and unique.",
                field,
            ));
        }
    }
    Ok(unique)
}

fn path_is_within(path: &Path, source: &Path) -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::path::PathBuf;

        let path = PathBuf::from(path.to_string_lossy().to_lowercase());
        let source = PathBuf::from(source.to_string_lossy().to_lowercase());
        path.starts_with(source)
    }
    #[cfg(not(target_os = "windows"))]
    {
        path.starts_with(source)
    }
}

fn directory_accessible(path: &Path) -> bool {
    path.is_dir() && fs::read_dir(path).is_ok()
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), DomainError> {
    let parent = path
        .parent()
        .filter(|value| !value.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| invalid_field("The backup path is invalid.", "path"))?;
    let temporary = parent.join(format!(".{file_name}.{}.tmp", Uuid::new_v4()));
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|_| file_error("The temporary backup file could not be created."))?;
    let write_result = file.write_all(bytes).and_then(|()| file.sync_all());
    if write_result.is_err() {
        return Err(file_error("The backup file could not be written."));
    }
    replace_file(&temporary, path)
        .map_err(|_| file_error("The backup file could not be finalized."))
}

#[cfg(not(target_os = "windows"))]
fn replace_file(source: &Path, target: &Path) -> std::io::Result<()> {
    fs::rename(source, target)
}

#[cfg(target_os = "windows")]
fn replace_file(source: &Path, target: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows::core::PCWSTR;
    use windows::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };
    let source = source
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let target = target
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    unsafe {
        MoveFileExW(
            PCWSTR(source.as_ptr()),
            PCWSTR(target.as_ptr()),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    }
    .map_err(std::io::Error::other)
}

fn invalid_backup(message: &str) -> DomainError {
    invalid_field(message, "backup")
}

fn invalid_field(message: &str, field: &str) -> DomainError {
    DomainError {
        code: ErrorCode::InvalidInput,
        message: message.into(),
        field: Some(field.into()),
    }
}

fn file_error(message: &str) -> DomainError {
    DomainError {
        code: ErrorCode::FileSystemError,
        message: message.into(),
        field: Some("path".into()),
    }
}
