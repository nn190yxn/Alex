use std::{
    ffi::OsString,
    fs, io,
    path::{Path, PathBuf},
};

#[cfg(target_os = "windows")]
use std::process::Command;

use crate::{
    database::Database,
    domain::error::{DomainError, ErrorCode},
    repositories::{DocumentRepository, IndexSourceRepository},
};

pub trait ShellAdapter {
    fn open_document(&self, path: &Path) -> io::Result<()>;
    fn reveal_document(&self, path: &Path) -> io::Result<()>;
}

pub struct SystemShellAdapter;

impl ShellAdapter for SystemShellAdapter {
    fn open_document(&self, path: &Path) -> io::Result<()> {
        run_explorer([path.as_os_str()])
    }

    fn reveal_document(&self, path: &Path) -> io::Result<()> {
        let mut selection = OsString::from("/select,");
        selection.push(path);
        run_explorer([selection])
    }
}

pub struct ShellService<'a, A = SystemShellAdapter> {
    database: &'a Database,
    adapter: A,
}

impl<'a> ShellService<'a, SystemShellAdapter> {
    pub fn new(database: &'a Database) -> Self {
        Self {
            database,
            adapter: SystemShellAdapter,
        }
    }
}

impl<'a, A: ShellAdapter> ShellService<'a, A> {
    pub fn with_adapter(database: &'a Database, adapter: A) -> Self {
        Self { database, adapter }
    }

    pub fn open_document(&self, document_id: &str) -> Result<(), DomainError> {
        let path = self.validated_document_path(document_id)?;
        self.adapter
            .open_document(&path)
            .map_err(|_| shell_error(document_id))
    }

    pub fn reveal_document(&self, document_id: &str) -> Result<(), DomainError> {
        let path = self.validated_document_path(document_id)?;
        self.adapter
            .reveal_document(&path)
            .map_err(|_| shell_error(document_id))
    }

    pub(crate) fn validated_document_path(
        &self,
        document_id: &str,
    ) -> Result<PathBuf, DomainError> {
        let document = DocumentRepository::new(self.database)
            .get(document_id)?
            .ok_or_else(|| document_not_found(document_id))?;
        if document.availability != "available" {
            return Err(unavailable_document(document_id));
        }
        let source = IndexSourceRepository::new(self.database)
            .get(&document.source_id)?
            .ok_or_else(|| source_not_found(&document.source_id))?;
        let source_path = fs::canonicalize(&source.path).map_err(|_| DomainError {
            code: ErrorCode::SourceUnavailable,
            message: "The document's index source is currently unavailable.".into(),
            field: Some(document.source_id.clone()),
        })?;
        if !source_path.is_dir() {
            return Err(DomainError {
                code: ErrorCode::SourceUnavailable,
                message: "The document's index source is currently unavailable.".into(),
                field: Some(document.source_id),
            });
        }
        let document_path = fs::canonicalize(&document.absolute_path)
            .map_err(|_| unavailable_document(document_id))?;
        if !document_path.is_file() {
            return Err(unavailable_document(document_id));
        }
        if !comparison_path(&document_path).starts_with(comparison_path(&source_path)) {
            return Err(DomainError {
                code: ErrorCode::PathOutsideSource,
                message: "The document path is outside its index source.".into(),
                field: Some(document_id.into()),
            });
        }
        Ok(document_path)
    }
}

#[cfg(target_os = "windows")]
fn run_explorer<I, S>(arguments: I) -> io::Result<()>
where
    I: IntoIterator<Item = S>,
    S: AsRef<std::ffi::OsStr>,
{
    Command::new("explorer.exe").args(arguments).spawn()?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn run_explorer<I, S>(_arguments: I) -> io::Result<()>
where
    I: IntoIterator<Item = S>,
    S: AsRef<std::ffi::OsStr>,
{
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "Windows Shell is unavailable on this platform",
    ))
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

fn document_not_found(document_id: &str) -> DomainError {
    DomainError {
        code: ErrorCode::DocumentNotFound,
        message: "The selected document does not exist in the local index.".into(),
        field: Some(document_id.into()),
    }
}

fn unavailable_document(document_id: &str) -> DomainError {
    DomainError {
        code: ErrorCode::FileSystemError,
        message: "The selected document is currently unavailable.".into(),
        field: Some(document_id.into()),
    }
}

fn source_not_found(source_id: &str) -> DomainError {
    DomainError {
        code: ErrorCode::SourceNotFound,
        message: "The document's index source does not exist.".into(),
        field: Some(source_id.into()),
    }
}

fn shell_error(document_id: &str) -> DomainError {
    DomainError {
        code: ErrorCode::FileSystemError,
        message: "Windows could not open the selected document location.".into(),
        field: Some(document_id.into()),
    }
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use tempfile::TempDir;

    use super::*;
    use crate::repositories::{DocumentRecord, IndexSourceRecord, TopicRecord, TopicRepository};

    #[derive(Clone, Default)]
    struct RecordingAdapter {
        opened: Arc<Mutex<Vec<PathBuf>>>,
        revealed: Arc<Mutex<Vec<PathBuf>>>,
    }

    impl ShellAdapter for RecordingAdapter {
        fn open_document(&self, path: &Path) -> io::Result<()> {
            self.opened.lock().unwrap().push(path.to_path_buf());
            Ok(())
        }

        fn reveal_document(&self, path: &Path) -> io::Result<()> {
            self.revealed.lock().unwrap().push(path.to_path_buf());
            Ok(())
        }
    }

    fn fixture() -> (TempDir, Database, RecordingAdapter, String) {
        let directory = tempfile::tempdir().unwrap();
        let source_path = directory.path().join("source");
        fs::create_dir(&source_path).unwrap();
        let document_path = source_path.join("Plan.docx");
        fs::write(&document_path, b"test").unwrap();
        let database = Database::open_in_memory().unwrap();
        IndexSourceRepository::new(&database)
            .upsert(&IndexSourceRecord {
                id: "source-a".into(),
                path: source_path.to_string_lossy().into_owned(),
                display_name: "Source".into(),
                enabled: true,
                status: "ready".into(),
                added_at: "2026-07-24T08:00:00Z".into(),
                last_scan_at: None,
                last_success_at: None,
            })
            .unwrap();
        TopicRepository::new(&database)
            .upsert(&TopicRecord {
                id: "topic-a".into(),
                canonical_name: "plan".into(),
                display_name: "Plan".into(),
                display_name_manual: false,
                grouping_confidence: "high".into(),
                newest_created_document_id: None,
                recently_modified_document_id: None,
                created_at: "2026-07-24T08:00:00Z".into(),
                updated_at: "2026-07-24T08:00:00Z".into(),
            })
            .unwrap();
        DocumentRepository::new(&database)
            .upsert_batch(&[DocumentRecord {
                id: "document-a".into(),
                source_id: "source-a".into(),
                topic_id: "topic-a".into(),
                absolute_path: document_path.to_string_lossy().into_owned(),
                file_identity: None,
                file_name: "Plan.docx".into(),
                normalized_name: "Plan".into(),
                extension: "docx".into(),
                version_label: None,
                version_sort_key: None,
                size_bytes: 4,
                created_at: None,
                modified_at: None,
                availability: "available".into(),
                manual_topic: false,
                indexed_at: "scan-a".into(),
            }])
            .unwrap();
        (
            directory,
            database,
            RecordingAdapter::default(),
            document_path.to_string_lossy().into_owned(),
        )
    }

    #[test]
    fn opens_and_reveals_only_the_canonical_indexed_file() {
        let (_directory, database, adapter, document_path) = fixture();
        let service = ShellService::with_adapter(&database, adapter.clone());

        service.open_document("document-a").unwrap();
        service.reveal_document("document-a").unwrap();

        let expected = fs::canonicalize(document_path).unwrap();
        assert_eq!(*adapter.opened.lock().unwrap(), [expected.clone()]);
        assert_eq!(*adapter.revealed.lock().unwrap(), [expected]);
    }

    #[test]
    fn rejects_paths_outside_the_recorded_source() {
        let (directory, database, adapter, _) = fixture();
        let outside = directory.path().join("outside.docx");
        fs::write(&outside, b"outside").unwrap();
        database
            .transaction(|transaction| {
                transaction.execute(
                    "UPDATE documents SET absolute_path = ?2 WHERE id = ?1",
                    rusqlite::params!["document-a", outside.to_string_lossy()],
                )?;
                Ok(())
            })
            .unwrap();

        let error = ShellService::with_adapter(&database, adapter)
            .open_document("document-a")
            .unwrap_err();
        assert_eq!(error.code, ErrorCode::PathOutsideSource);
    }

    #[test]
    fn rejects_missing_records_and_unavailable_files() {
        let (_directory, database, adapter, document_path) = fixture();
        let service = ShellService::with_adapter(&database, adapter.clone());
        assert_eq!(
            service.open_document("unknown").unwrap_err().code,
            ErrorCode::DocumentNotFound
        );

        database
            .transaction(|transaction| {
                transaction.execute(
                    "UPDATE documents SET availability = 'missing' WHERE id = ?1",
                    ["document-a"],
                )?;
                Ok(())
            })
            .unwrap();
        assert_eq!(
            service.reveal_document("document-a").unwrap_err().code,
            ErrorCode::FileSystemError
        );

        let missing_path = Path::new(&document_path)
            .parent()
            .unwrap()
            .join("Missing.docx");
        database
            .transaction(|transaction| {
                transaction.execute(
                    "UPDATE documents SET absolute_path = ?2, availability = 'available'
                     WHERE id = ?1",
                    rusqlite::params!["document-a", missing_path.to_string_lossy()],
                )?;
                Ok(())
            })
            .unwrap();
        assert_eq!(
            service.reveal_document("document-a").unwrap_err().code,
            ErrorCode::FileSystemError
        );
        assert!(adapter.opened.lock().unwrap().is_empty());
        assert!(adapter.revealed.lock().unwrap().is_empty());
    }
}
