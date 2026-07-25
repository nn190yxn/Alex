use std::{collections::BTreeSet, io, path::PathBuf, sync::Arc};

#[cfg(target_os = "windows")]
use std::{os::windows::ffi::OsStrExt, process::Command};

use crate::{
    database::Database,
    domain::{
        error::{DomainError, ErrorCode},
        models::RecycleResult,
    },
    repositories::DocumentRepository,
};

use super::ShellService;

pub const RECYCLE_CONFIRMATION_TOKEN: &str = "move-to-windows-recycle-bin";

pub trait RecycleBinAdapter {
    fn recycle(&self, paths: &[PathBuf]) -> io::Result<()>;
    fn open_recycle_bin(&self) -> io::Result<()>;
}

pub struct SystemRecycleBinAdapter;

impl RecycleBinAdapter for SystemRecycleBinAdapter {
    fn recycle(&self, paths: &[PathBuf]) -> io::Result<()> {
        recycle_paths(paths)
    }

    fn open_recycle_bin(&self) -> io::Result<()> {
        open_system_recycle_bin()
    }
}

pub struct RecycleBinService<A = SystemRecycleBinAdapter> {
    database: Arc<Database>,
    adapter: A,
}

impl RecycleBinService<SystemRecycleBinAdapter> {
    pub fn new(database: Arc<Database>) -> Self {
        Self {
            database,
            adapter: SystemRecycleBinAdapter,
        }
    }
}

impl<A: RecycleBinAdapter> RecycleBinService<A> {
    pub fn with_adapter(database: Arc<Database>, adapter: A) -> Self {
        Self { database, adapter }
    }

    pub fn recycle_documents(
        &self,
        document_ids: &[String],
        confirmation_token: &str,
    ) -> Result<RecycleResult, DomainError> {
        if confirmation_token != RECYCLE_CONFIRMATION_TOKEN {
            return Err(invalid_confirmation());
        }
        let document_ids = document_ids
            .iter()
            .filter(|document_id| !document_id.trim().is_empty())
            .cloned()
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        if document_ids.is_empty() {
            return Err(invalid_document_ids());
        }

        let shell = ShellService::new(&self.database);
        let paths = document_ids
            .iter()
            .map(|document_id| shell.validated_document_path(document_id))
            .collect::<Result<Vec<_>, _>>()?;

        self.adapter.recycle(&paths).map_err(|_| recycle_failed())?;
        let affected_topic_ids =
            DocumentRepository::new(&self.database).mark_recycled(&document_ids)?;
        Ok(RecycleResult {
            recycled_document_ids: document_ids,
            affected_topic_ids,
        })
    }

    pub fn open_recycle_bin(&self) -> Result<(), DomainError> {
        self.adapter
            .open_recycle_bin()
            .map_err(|_| recycle_bin_unavailable())
    }
}

#[cfg(target_os = "windows")]
fn recycle_paths(paths: &[PathBuf]) -> io::Result<()> {
    use windows::{
        core::PCWSTR,
        Win32::{
            Foundation::HWND,
            UI::Shell::{
                SHFileOperationW, FOF_ALLOWUNDO, FOF_NOCONFIRMATION, FOF_NOERRORUI, FOF_SILENT,
                FO_DELETE, SHFILEOPSTRUCTW,
            },
        },
    };

    let mut source_list = Vec::new();
    for path in paths {
        source_list.extend(path.as_os_str().encode_wide());
        source_list.push(0);
    }
    source_list.push(0);
    let flags = FOF_ALLOWUNDO.0 | FOF_NOCONFIRMATION.0 | FOF_NOERRORUI.0 | FOF_SILENT.0;
    let mut operation = SHFILEOPSTRUCTW {
        hwnd: HWND::default(),
        wFunc: FO_DELETE,
        pFrom: PCWSTR(source_list.as_ptr()),
        pTo: PCWSTR::null(),
        fFlags: flags as u16,
        ..Default::default()
    };
    let status = unsafe { SHFileOperationW(&mut operation) };
    if status == 0 && !operation.fAnyOperationsAborted.as_bool() {
        Ok(())
    } else {
        Err(io::Error::other("Windows recycle operation failed"))
    }
}

#[cfg(not(target_os = "windows"))]
fn recycle_paths(_paths: &[PathBuf]) -> io::Result<()> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "Windows recycle bin is unavailable on this platform",
    ))
}

#[cfg(target_os = "windows")]
fn open_system_recycle_bin() -> io::Result<()> {
    Command::new("explorer.exe")
        .arg("shell:RecycleBinFolder")
        .spawn()?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn open_system_recycle_bin() -> io::Result<()> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "Windows recycle bin is unavailable on this platform",
    ))
}

fn invalid_confirmation() -> DomainError {
    DomainError {
        code: ErrorCode::InvalidInput,
        message: "Explicit confirmation is required before moving documents to the recycle bin."
            .into(),
        field: Some("confirmationToken".into()),
    }
}

fn invalid_document_ids() -> DomainError {
    DomainError {
        code: ErrorCode::InvalidInput,
        message: "At least one document must be selected for recycling.".into(),
        field: Some("documentIds".into()),
    }
}

fn recycle_failed() -> DomainError {
    DomainError {
        code: ErrorCode::FileSystemError,
        message: "Windows could not move the selected documents to the recycle bin.".into(),
        field: None,
    }
}

fn recycle_bin_unavailable() -> DomainError {
    DomainError {
        code: ErrorCode::FileSystemError,
        message: "Windows could not open the recycle bin.".into(),
        field: None,
    }
}

#[cfg(test)]
mod tests {
    use std::{fs, path::Path, sync::Mutex};

    use tempfile::TempDir;

    use super::*;
    use crate::repositories::{
        DocumentRecord, IndexSourceRecord, IndexSourceRepository, TopicRecord, TopicRepository,
    };
    use crate::{
        domain::models::{DocumentAvailability, SortDirection, SortField},
        services::TopicService,
    };

    #[derive(Clone, Default)]
    struct RecordingAdapter {
        recycled: Arc<Mutex<Vec<Vec<PathBuf>>>>,
        opened: Arc<Mutex<u32>>,
        fail_recycle: bool,
    }

    impl RecycleBinAdapter for RecordingAdapter {
        fn recycle(&self, paths: &[PathBuf]) -> io::Result<()> {
            self.recycled.lock().unwrap().push(paths.to_vec());
            if self.fail_recycle {
                Err(io::Error::other("simulated recycle failure"))
            } else {
                Ok(())
            }
        }

        fn open_recycle_bin(&self) -> io::Result<()> {
            *self.opened.lock().unwrap() += 1;
            Ok(())
        }
    }

    fn fixture() -> (TempDir, Arc<Database>, RecordingAdapter) {
        let directory = tempfile::tempdir().unwrap();
        let source_path = directory.path().join("source");
        fs::create_dir(&source_path).unwrap();
        let database = Arc::new(Database::open_in_memory().unwrap());
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
        let documents = [
            document(
                "document-a",
                &source_path.join("Plan-v1.docx"),
                "1",
                "2026-01-01T00:00:00Z",
            ),
            document(
                "document-b",
                &source_path.join("Plan-v2.docx"),
                "2",
                "2026-02-01T00:00:00Z",
            ),
        ];
        for document in &documents {
            fs::write(&document.absolute_path, b"test").unwrap();
        }
        DocumentRepository::new(&database)
            .upsert_batch(&documents)
            .unwrap();
        (directory, database, RecordingAdapter::default())
    }

    fn document(id: &str, path: &Path, version: &str, modified_at: &str) -> DocumentRecord {
        DocumentRecord {
            id: id.into(),
            source_id: "source-a".into(),
            topic_id: "topic-a".into(),
            absolute_path: path.to_string_lossy().into_owned(),
            file_identity: None,
            file_name: path.file_name().unwrap().to_string_lossy().into_owned(),
            normalized_name: "Plan".into(),
            extension: "docx".into(),
            version_label: Some(version.into()),
            version_sort_key: Some(version.into()),
            size_bytes: 4,
            created_at: Some(modified_at.into()),
            modified_at: Some(modified_at.into()),
            availability: "available".into(),
            manual_topic: false,
            indexed_at: "scan-a".into(),
        }
    }

    #[test]
    fn successful_recycle_updates_availability_and_topic_markers() {
        let (_directory, database, adapter) = fixture();
        let service = RecycleBinService::with_adapter(database.clone(), adapter.clone());

        let result = service
            .recycle_documents(&["document-b".into()], RECYCLE_CONFIRMATION_TOKEN)
            .unwrap();

        assert_eq!(result.recycled_document_ids, ["document-b"]);
        assert_eq!(result.affected_topic_ids, ["topic-a"]);
        assert_eq!(
            DocumentRepository::new(&database)
                .get("document-b")
                .unwrap()
                .unwrap()
                .availability,
            "missing"
        );
        let topic = TopicRepository::new(&database)
            .get("topic-a")
            .unwrap()
            .unwrap();
        assert_eq!(
            topic.newest_created_document_id.as_deref(),
            Some("document-a")
        );
        assert_eq!(
            topic.recently_modified_document_id.as_deref(),
            Some("document-a")
        );
        let detail = TopicService::new(&database)
            .detail("topic-a", SortField::ModifiedAt, SortDirection::Desc)
            .unwrap();
        assert_eq!(detail.summary.document_count, 2);
        assert_eq!(
            detail
                .documents
                .iter()
                .filter(|document| document.availability == DocumentAvailability::Available)
                .count(),
            1
        );
        assert_eq!(adapter.recycled.lock().unwrap().len(), 1);
    }

    #[test]
    fn failed_recycle_preserves_database_state() {
        let (_directory, database, mut adapter) = fixture();
        adapter.fail_recycle = true;
        let service = RecycleBinService::with_adapter(database.clone(), adapter);
        let before = TopicRepository::new(&database).get("topic-a").unwrap();

        let error = service
            .recycle_documents(&["document-b".into()], RECYCLE_CONFIRMATION_TOKEN)
            .unwrap_err();

        assert_eq!(error.code, ErrorCode::FileSystemError);
        assert_eq!(
            DocumentRepository::new(&database)
                .get("document-b")
                .unwrap()
                .unwrap()
                .availability,
            "available"
        );
        assert_eq!(
            TopicRepository::new(&database).get("topic-a").unwrap(),
            before
        );
    }

    #[test]
    fn confirmation_and_path_validation_happen_before_adapter_call() {
        let (_directory, database, adapter) = fixture();
        let service = RecycleBinService::with_adapter(database, adapter.clone());
        assert_eq!(
            service
                .recycle_documents(&["document-a".into()], "")
                .unwrap_err()
                .code,
            ErrorCode::InvalidInput
        );
        assert_eq!(
            service
                .recycle_documents(&["unknown".into()], RECYCLE_CONFIRMATION_TOKEN)
                .unwrap_err()
                .code,
            ErrorCode::DocumentNotFound
        );
        assert!(adapter.recycled.lock().unwrap().is_empty());
    }

    #[test]
    fn opens_the_recycle_bin_through_the_adapter() {
        let (_directory, database, adapter) = fixture();
        let service = RecycleBinService::with_adapter(database, adapter.clone());
        service.open_recycle_bin().unwrap();
        assert_eq!(*adapter.opened.lock().unwrap(), 1);
    }
}
