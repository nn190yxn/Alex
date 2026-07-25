use std::{
    fs::File,
    io::{Read, Seek},
    sync::{Arc, Mutex},
};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use quick_xml::{events::Event, Reader};
use uuid::Uuid;
use zip::{result::ZipError, ZipArchive};

use crate::{
    database::Database,
    domain::{
        error::{DomainError, ErrorCode},
        models::{
            PreviewContent, PreviewLimitReason, PreviewSection, PreviewSession, PreviewViewport,
        },
    },
    repositories::DocumentRepository,
};

use super::{ShellService, WindowsPreviewHost};

const TEXT_LIMIT: u64 = 2 * 1024 * 1024;
const IMAGE_LIMIT: u64 = 20 * 1024 * 1024;
const PDF_LIMIT: u64 = 30 * 1024 * 1024;
const OFFICE_LIMIT: u64 = 20 * 1024 * 1024;
const OFFICE_ENTRY_LIMIT: u64 = 4 * 1024 * 1024;
const OFFICE_TOTAL_LIMIT: usize = 8 * 1024 * 1024;
const OFFICE_ARCHIVE_ENTRY_LIMIT: usize = 2048;

pub struct PreviewService {
    database: Arc<Database>,
    windows_host: Arc<WindowsPreviewHost>,
    active_session: Mutex<Option<ActivePreviewSession>>,
}

#[derive(Clone)]
struct ActivePreviewSession {
    id: String,
    native: bool,
}

impl PreviewService {
    pub fn new(database: Arc<Database>) -> Arc<Self> {
        Arc::new(Self {
            database,
            windows_host: WindowsPreviewHost::new(),
            active_session: Mutex::new(None),
        })
    }

    pub fn create_session(&self, document_id: &str) -> Result<PreviewSession, DomainError> {
        self.create_session_internal(document_id, None)
    }

    pub fn create_session_with_viewport(
        &self,
        document_id: &str,
        parent_window: isize,
        viewport: PreviewViewport,
    ) -> Result<PreviewSession, DomainError> {
        self.create_session_internal(document_id, Some((parent_window, viewport)))
    }

    fn create_session_internal(
        &self,
        document_id: &str,
        native_target: Option<(isize, PreviewViewport)>,
    ) -> Result<PreviewSession, DomainError> {
        let mut active = self.active_session.lock().map_err(|_| lock_error())?;
        let document = DocumentRepository::new(&self.database)
            .get(document_id)?
            .ok_or_else(|| document_not_found(document_id))?;
        let path = ShellService::new(&self.database).validated_document_path(document_id)?;
        let size_bytes = path
            .metadata()
            .map_err(|_| preview_file_error(document_id))?
            .len();
        let extension = document.extension.to_ascii_lowercase();
        if let Some(current) = active.as_ref() {
            if current.native {
                self.windows_host.unload(&current.id)?;
            }
        }
        *active = None;
        let (session_id, content, native) = if matches!(extension.as_str(), "doc" | "xls" | "ppt") {
            let (parent_window, viewport) = native_target.ok_or_else(native_target_required)?;
            (
                self.windows_host.start(path, parent_window, viewport)?,
                PreviewContent::Native,
                true,
            )
        } else {
            (
                Uuid::new_v4().to_string(),
                load_preview(&path, &extension, size_bytes, document_id)?,
                false,
            )
        };
        let session = PreviewSession {
            id: session_id,
            document_id: document_id.into(),
            file_name: document.file_name,
            extension,
            size_bytes,
            content,
        };
        *active = Some(ActivePreviewSession {
            id: session.id.clone(),
            native,
        });
        Ok(session)
    }

    pub fn resize_session(
        &self,
        session_id: &str,
        viewport: PreviewViewport,
    ) -> Result<(), DomainError> {
        let active = self
            .active_session
            .lock()
            .map_err(|_| lock_error())?
            .clone();
        let active = active
            .filter(|active| active.id == session_id)
            .ok_or_else(|| inactive_session(session_id))?;
        if active.native {
            self.windows_host.resize(session_id, viewport)?;
        }
        Ok(())
    }

    pub fn close_session(&self, session_id: &str) -> Result<(), DomainError> {
        let mut active = self.active_session.lock().map_err(|_| lock_error())?;
        let current = active
            .as_ref()
            .filter(|current| current.id == session_id)
            .cloned()
            .ok_or_else(|| inactive_session(session_id))?;
        if current.native {
            self.windows_host.unload(session_id)?;
        }
        *active = None;
        Ok(())
    }

    pub fn active_session_id(&self) -> Result<Option<String>, DomainError> {
        Ok(self
            .active_session
            .lock()
            .map_err(|_| lock_error())?
            .as_ref()
            .map(|active| active.id.clone()))
    }
}

fn inactive_session(session_id: &str) -> DomainError {
    DomainError {
        code: ErrorCode::InvalidInput,
        message: "The preview session is no longer active.".into(),
        field: Some(session_id.into()),
    }
}

fn native_target_required() -> DomainError {
    DomainError {
        code: ErrorCode::InvalidInput,
        message: "A Windows preview target is required for this document format.".into(),
        field: Some("viewport".into()),
    }
}

fn load_preview(
    path: &std::path::Path,
    extension: &str,
    size: u64,
    document_id: &str,
) -> Result<PreviewContent, DomainError> {
    match extension {
        "txt" | "md" | "markdown" | "csv" | "json" => {
            if size > TEXT_LIMIT {
                return Ok(limited(PreviewLimitReason::FileTooLarge));
            }
            let bytes = read_file_limited(path, TEXT_LIMIT, document_id)?;
            let text = match String::from_utf8(bytes) {
                Ok(text) => text.trim_start_matches('\u{feff}').to_owned(),
                Err(_) => return Ok(limited(PreviewLimitReason::InvalidContent)),
            };
            Ok(PreviewContent::Text { text })
        }
        "pdf" => binary_preview(path, size, PDF_LIMIT, "application/pdf", document_id),
        "png" => binary_preview(path, size, IMAGE_LIMIT, "image/png", document_id),
        "jpg" | "jpeg" => binary_preview(path, size, IMAGE_LIMIT, "image/jpeg", document_id),
        "gif" => binary_preview(path, size, IMAGE_LIMIT, "image/gif", document_id),
        "webp" => binary_preview(path, size, IMAGE_LIMIT, "image/webp", document_id),
        "bmp" => binary_preview(path, size, IMAGE_LIMIT, "image/bmp", document_id),
        "docx" | "xlsx" | "pptx" => {
            if size > OFFICE_LIMIT {
                return Ok(limited(PreviewLimitReason::FileTooLarge));
            }
            Ok(office_preview(path, extension))
        }
        _ => Ok(limited(PreviewLimitReason::UnsupportedFormat)),
    }
}

fn binary_preview(
    path: &std::path::Path,
    size: u64,
    limit: u64,
    media_type: &str,
    document_id: &str,
) -> Result<PreviewContent, DomainError> {
    if size > limit {
        return Ok(limited(PreviewLimitReason::FileTooLarge));
    }
    let bytes = read_file_limited(path, limit, document_id)?;
    Ok(PreviewContent::Binary {
        media_type: media_type.into(),
        data_base64: STANDARD.encode(bytes),
    })
}

fn read_file_limited(
    path: &std::path::Path,
    limit: u64,
    document_id: &str,
) -> Result<Vec<u8>, DomainError> {
    let mut bytes = Vec::new();
    File::open(path)
        .map_err(|_| preview_file_error(document_id))?
        .take(limit + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| preview_file_error(document_id))?;
    if bytes.len() as u64 > limit {
        return Err(preview_file_error(document_id));
    }
    Ok(bytes)
}

fn office_preview(path: &std::path::Path, extension: &str) -> PreviewContent {
    let result = File::open(path)
        .map_err(|_| OfficeReadError::Invalid)
        .and_then(|file| ZipArchive::new(file).map_err(|_| OfficeReadError::Invalid))
        .and_then(|mut archive| {
            if archive.len() > OFFICE_ARCHIVE_ENTRY_LIMIT {
                return Err(OfficeReadError::TooLarge);
            }
            match extension {
                "docx" => read_docx(&mut archive),
                "xlsx" => read_xlsx(&mut archive),
                "pptx" => read_pptx(&mut archive),
                _ => Err(OfficeReadError::Invalid),
            }
        });
    match result {
        Ok(sections) if !sections.is_empty() => PreviewContent::Office { sections },
        Ok(_) | Err(OfficeReadError::Invalid) => limited(PreviewLimitReason::InvalidContent),
        Err(OfficeReadError::TooLarge) => limited(PreviewLimitReason::FileTooLarge),
    }
}

fn read_docx<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<Vec<PreviewSection>, OfficeReadError> {
    let mut budget = OFFICE_TOTAL_LIMIT as u64;
    let xml = read_zip_text(archive, "word/document.xml", &mut budget)?
        .ok_or(OfficeReadError::Invalid)?;
    let text = extract_tagged_text(&xml, b"w:t", b"w:p")?;
    ensure_office_total(text.len())?;
    Ok(vec![PreviewSection {
        label: "Document".into(),
        text,
    }])
}

fn read_pptx<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<Vec<PreviewSection>, OfficeReadError> {
    let mut budget = OFFICE_TOTAL_LIMIT as u64;
    let mut names = archive_names(archive, "ppt/slides/slide", ".xml")?;
    names.sort_by_key(|name| numbered_entry(name, "ppt/slides/slide", ".xml"));
    let mut sections = Vec::new();
    let mut total = 0;
    for (index, name) in names.into_iter().enumerate() {
        let xml = read_zip_text(archive, &name, &mut budget)?.ok_or(OfficeReadError::Invalid)?;
        let text = extract_tagged_text(&xml, b"a:t", b"a:p")?;
        total += text.len();
        ensure_office_total(total)?;
        sections.push(PreviewSection {
            label: format!("Slide {}", index + 1),
            text,
        });
    }
    Ok(sections)
}

fn read_xlsx<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<Vec<PreviewSection>, OfficeReadError> {
    let mut budget = OFFICE_TOTAL_LIMIT as u64;
    let shared = read_zip_text(archive, "xl/sharedStrings.xml", &mut budget)?
        .map(|xml| extract_shared_strings(&xml))
        .transpose()?
        .unwrap_or_default();
    let mut names = archive_names(archive, "xl/worksheets/sheet", ".xml")?;
    names.sort_by_key(|name| numbered_entry(name, "xl/worksheets/sheet", ".xml"));
    let mut sections = Vec::new();
    let mut total = 0;
    for (index, name) in names.into_iter().enumerate() {
        let xml = read_zip_text(archive, &name, &mut budget)?.ok_or(OfficeReadError::Invalid)?;
        let text = extract_sheet_text(&xml, &shared)?;
        total += text.len();
        ensure_office_total(total)?;
        sections.push(PreviewSection {
            label: format!("Sheet {}", index + 1),
            text,
        });
    }
    Ok(sections)
}

fn archive_names<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
    prefix: &str,
    suffix: &str,
) -> Result<Vec<String>, OfficeReadError> {
    let mut names = Vec::new();
    for index in 0..archive.len() {
        let name = archive
            .by_index(index)
            .map_err(|_| OfficeReadError::Invalid)?
            .name()
            .to_owned();
        if name.starts_with(prefix) && name.ends_with(suffix) {
            names.push(name);
        }
    }
    Ok(names)
}

fn numbered_entry(name: &str, prefix: &str, suffix: &str) -> u32 {
    name.strip_prefix(prefix)
        .and_then(|value| value.strip_suffix(suffix))
        .and_then(|value| value.parse().ok())
        .unwrap_or(u32::MAX)
}

fn read_zip_text<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
    name: &str,
    remaining_budget: &mut u64,
) -> Result<Option<String>, OfficeReadError> {
    let entry = match archive.by_name(name) {
        Ok(entry) => entry,
        Err(ZipError::FileNotFound) => return Ok(None),
        Err(_) => return Err(OfficeReadError::Invalid),
    };
    if entry.size() > OFFICE_ENTRY_LIMIT || entry.size() > *remaining_budget {
        return Err(OfficeReadError::TooLarge);
    }
    *remaining_budget -= entry.size();
    let mut bytes = Vec::new();
    entry
        .take(OFFICE_ENTRY_LIMIT + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| OfficeReadError::Invalid)?;
    if bytes.len() as u64 > OFFICE_ENTRY_LIMIT {
        return Err(OfficeReadError::TooLarge);
    }
    String::from_utf8(bytes)
        .map(Some)
        .map_err(|_| OfficeReadError::Invalid)
}

fn extract_tagged_text(
    xml: &str,
    text_tag: &[u8],
    paragraph_tag: &[u8],
) -> Result<String, OfficeReadError> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut output = String::new();
    let mut capture = false;
    loop {
        match reader.read_event() {
            Ok(Event::Start(event)) if event.name().as_ref() == text_tag => capture = true,
            Ok(Event::End(event)) if event.name().as_ref() == text_tag => capture = false,
            Ok(Event::End(event)) if event.name().as_ref() == paragraph_tag => {
                push_separator(&mut output, '\n')
            }
            Ok(Event::Text(event)) if capture => output.push_str(
                event
                    .decode()
                    .map_err(|_| OfficeReadError::Invalid)?
                    .as_ref(),
            ),
            Ok(Event::CData(event)) if capture => output.push_str(
                event
                    .decode()
                    .map_err(|_| OfficeReadError::Invalid)?
                    .as_ref(),
            ),
            Ok(Event::Eof) => break,
            Ok(_) => {}
            Err(_) => return Err(OfficeReadError::Invalid),
        }
    }
    Ok(output.trim().to_owned())
}

fn extract_shared_strings(xml: &str) -> Result<Vec<String>, OfficeReadError> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut values = Vec::new();
    let mut value = String::new();
    let mut capture = false;
    loop {
        match reader.read_event() {
            Ok(Event::Start(event)) if event.name().as_ref() == b"t" => capture = true,
            Ok(Event::End(event)) if event.name().as_ref() == b"t" => capture = false,
            Ok(Event::End(event)) if event.name().as_ref() == b"si" => {
                values.push(std::mem::take(&mut value));
            }
            Ok(Event::Text(event)) if capture => value.push_str(
                event
                    .decode()
                    .map_err(|_| OfficeReadError::Invalid)?
                    .as_ref(),
            ),
            Ok(Event::Eof) => break,
            Ok(_) => {}
            Err(_) => return Err(OfficeReadError::Invalid),
        }
    }
    Ok(values)
}

fn extract_sheet_text(xml: &str, shared: &[String]) -> Result<String, OfficeReadError> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut output = String::new();
    let mut value = String::new();
    let mut capture = false;
    let mut shared_cell = false;
    let mut first_cell = true;
    loop {
        match reader.read_event() {
            Ok(Event::Start(event)) if event.name().as_ref() == b"c" => {
                shared_cell = event.attributes().flatten().any(|attribute| {
                    attribute.key.as_ref() == b"t" && attribute.value.as_ref() == b"s"
                });
                value.clear();
            }
            Ok(Event::Start(event))
                if event.name().as_ref() == b"v" || event.name().as_ref() == b"t" =>
            {
                capture = true;
            }
            Ok(Event::End(event))
                if event.name().as_ref() == b"v" || event.name().as_ref() == b"t" =>
            {
                capture = false;
            }
            Ok(Event::End(event)) if event.name().as_ref() == b"c" => {
                if !first_cell {
                    output.push('\t');
                }
                let rendered = if shared_cell {
                    value
                        .parse::<usize>()
                        .ok()
                        .and_then(|index| shared.get(index))
                        .map(String::as_str)
                        .unwrap_or_default()
                } else {
                    value.as_str()
                };
                output.push_str(rendered);
                first_cell = false;
            }
            Ok(Event::End(event)) if event.name().as_ref() == b"row" => {
                push_separator(&mut output, '\n');
                first_cell = true;
            }
            Ok(Event::Text(event)) if capture => value.push_str(
                event
                    .decode()
                    .map_err(|_| OfficeReadError::Invalid)?
                    .as_ref(),
            ),
            Ok(Event::Eof) => break,
            Ok(_) => {}
            Err(_) => return Err(OfficeReadError::Invalid),
        }
    }
    Ok(output.trim().to_owned())
}

fn push_separator(output: &mut String, separator: char) {
    if !output.is_empty() && !output.ends_with(separator) {
        output.push(separator);
    }
}

fn ensure_office_total(size: usize) -> Result<(), OfficeReadError> {
    if size > OFFICE_TOTAL_LIMIT {
        Err(OfficeReadError::TooLarge)
    } else {
        Ok(())
    }
}

fn limited(reason: PreviewLimitReason) -> PreviewContent {
    PreviewContent::Limited { reason }
}

fn document_not_found(document_id: &str) -> DomainError {
    DomainError {
        code: ErrorCode::DocumentNotFound,
        message: "The selected document does not exist in the local index.".into(),
        field: Some(document_id.into()),
    }
}

fn preview_file_error(document_id: &str) -> DomainError {
    DomainError {
        code: ErrorCode::FileSystemError,
        message: "The selected document could not be loaded for preview.".into(),
        field: Some(document_id.into()),
    }
}

fn lock_error() -> DomainError {
    DomainError {
        code: ErrorCode::InternalError,
        message: "The preview session state is unavailable.".into(),
        field: None,
    }
}

#[derive(Debug)]
enum OfficeReadError {
    Invalid,
    TooLarge,
}

#[cfg(test)]
mod tests {
    use std::io::{Cursor, Write};

    use tempfile::TempDir;
    use zip::{write::SimpleFileOptions, ZipWriter};

    use super::*;
    use crate::{
        domain::models::{SearchQuery, SortDirection, SortField},
        repositories::{
            DocumentRecord, IndexSourceRecord, IndexSourceRepository, TopicRecord, TopicRepository,
        },
        services::SearchService,
    };

    fn fixture(extension: &str, bytes: &[u8]) -> (TempDir, Arc<Database>, Arc<PreviewService>) {
        let directory = tempfile::tempdir().unwrap();
        let source_path = directory.path().join("source");
        std::fs::create_dir(&source_path).unwrap();
        let file_path = source_path.join(format!("Preview.{extension}"));
        std::fs::write(&file_path, bytes).unwrap();
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
                canonical_name: "preview".into(),
                display_name: "Preview".into(),
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
                absolute_path: file_path.to_string_lossy().into_owned(),
                file_identity: None,
                file_name: format!("Preview.{extension}"),
                normalized_name: "Preview".into(),
                extension: extension.into(),
                version_label: None,
                version_sort_key: None,
                size_bytes: bytes.len() as i64,
                created_at: None,
                modified_at: None,
                availability: "available".into(),
                manual_topic: false,
                indexed_at: "scan-a".into(),
            }])
            .unwrap();
        let service = PreviewService::new(database.clone());
        (directory, database, service)
    }

    fn docx(body: &str) -> Vec<u8> {
        let cursor = Cursor::new(Vec::new());
        let mut archive = ZipWriter::new(cursor);
        archive
            .start_file("word/document.xml", SimpleFileOptions::default())
            .unwrap();
        write!(
            archive,
            "<w:document><w:body><w:p><w:r><w:t>{body}</w:t></w:r></w:p></w:body></w:document>"
        )
        .unwrap();
        archive.finish().unwrap().into_inner()
    }

    #[test]
    fn text_preview_replaces_and_releases_the_active_session() {
        let (_directory, _database, service) = fixture("txt", b"hello preview");
        let first = service.create_session("document-a").unwrap();
        assert_eq!(
            first.content,
            PreviewContent::Text {
                text: "hello preview".into()
            }
        );

        let second = service.create_session("document-a").unwrap();
        assert_ne!(first.id, second.id);
        assert_eq!(
            service.active_session_id().unwrap(),
            Some(second.id.clone())
        );
        assert_eq!(
            service.close_session(&first.id).unwrap_err().code,
            ErrorCode::InvalidInput
        );
        service.close_session(&second.id).unwrap();
        assert_eq!(service.active_session_id().unwrap(), None);
    }

    #[test]
    fn built_in_preview_resize_requires_the_active_session() {
        let (_directory, _database, service) = fixture("txt", b"hello preview");
        let session = service.create_session("document-a").unwrap();
        let viewport = PreviewViewport {
            x: 0,
            y: 0,
            width: 800,
            height: 600,
        };

        service.resize_session(&session.id, viewport).unwrap();
        service.close_session(&session.id).unwrap();
        assert_eq!(
            service
                .resize_session(&session.id, viewport)
                .unwrap_err()
                .code,
            ErrorCode::InvalidInput
        );
    }

    #[test]
    fn oversized_text_returns_a_safe_limited_session() {
        let bytes = vec![b'a'; TEXT_LIMIT as usize + 1];
        let (_directory, _database, service) = fixture("txt", &bytes);
        let session = service.create_session("document-a").unwrap();
        assert_eq!(session.content, limited(PreviewLimitReason::FileTooLarge));
    }

    #[test]
    fn office_preview_is_ephemeral_and_never_enters_search() {
        let secret_body = "body-token-never-indexed";
        let bytes = docx(secret_body);
        let (_directory, database, service) = fixture("docx", &bytes);
        let session = service.create_session("document-a").unwrap();
        assert_eq!(
            session.content,
            PreviewContent::Office {
                sections: vec![PreviewSection {
                    label: "Document".into(),
                    text: secret_body.into(),
                }],
            }
        );

        let results = SearchService::new(&database)
            .search_topics(SearchQuery {
                text: secret_body.into(),
                source_ids: vec![],
                directory: None,
                created_from: None,
                created_to: None,
                modified_from: None,
                modified_to: None,
                sort_by: SortField::ModifiedAt,
                sort_direction: SortDirection::Desc,
                page: 1,
                page_size: 20,
            })
            .unwrap();
        assert_eq!(results.total, 0);
    }
}
