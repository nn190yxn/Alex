use std::sync::Arc;

use tauri::{AppHandle, Emitter, State};

use crate::{
    domain::{
        error::CommandResult,
        models::{ExtensionRule, IndexSource, IndexStatus, ScanError, ScanProgress, ScanRun},
    },
    repositories::{ScanErrorRecord, ScanRepository},
    services::{ProgressSink, ScanCoordinator, SourceService, WatchService},
};

const SCAN_PROGRESS_EVENT: &str = "scan-progress";

#[tauri::command]
pub fn list_sources(
    coordinator: State<'_, Arc<ScanCoordinator>>,
    watcher: State<'_, Arc<WatchService>>,
) -> CommandResult<Vec<IndexSource>> {
    let operation = coordinator.begin_mutation().and_then(|_mutation| {
        watcher.sync_sources()?;
        SourceService::new(coordinator.database()).list_sources()
    });
    result(operation, coordinator.database())
}

#[tauri::command]
pub fn add_source(
    path: String,
    coordinator: State<'_, Arc<ScanCoordinator>>,
    watcher: State<'_, Arc<WatchService>>,
) -> CommandResult<IndexSource> {
    let operation = coordinator.begin_mutation().and_then(|_mutation| {
        let source = SourceService::new(coordinator.database()).add_source(&path)?;
        watcher.sync_sources()?;
        Ok(source)
    });
    result(operation, coordinator.database())
}

#[tauri::command]
pub fn set_source_enabled(
    source_id: String,
    enabled: bool,
    coordinator: State<'_, Arc<ScanCoordinator>>,
    watcher: State<'_, Arc<WatchService>>,
) -> CommandResult<IndexSource> {
    let operation = coordinator.begin_mutation().and_then(|_mutation| {
        let source =
            SourceService::new(coordinator.database()).set_source_enabled(&source_id, enabled)?;
        watcher.sync_sources()?;
        Ok(source)
    });
    result(operation, coordinator.database())
}

#[tauri::command]
pub fn start_scan(
    source_ids: Vec<String>,
    app: AppHandle,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<ScanRun> {
    result(
        coordinator.start_scan(source_ids, progress_sink(app)),
        coordinator.database(),
    )
}

#[tauri::command]
pub fn cancel_scan(
    scan_id: String,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<ScanRun> {
    let cancelled = coordinator
        .begin_mutation()
        .and_then(|_mutation| coordinator.cancel_scan(&scan_id));
    result(cancelled, coordinator.database())
}

#[tauri::command]
pub fn get_scan_status(
    scan_id: String,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<ScanProgress> {
    result(
        coordinator.get_scan_status(&scan_id),
        coordinator.database(),
    )
}

#[tauri::command]
pub fn get_index_status(
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<IndexStatus> {
    result(coordinator.index_status(), coordinator.database())
}

#[tauri::command]
pub fn list_scan_errors(
    scan_id: Option<String>,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<Vec<ScanError>> {
    let repository = ScanRepository::new(coordinator.database());
    let errors = match scan_id {
        Some(scan_id) => repository.list_errors(&scan_id),
        None => repository.list_latest_errors(),
    }
    .map(|records| records.into_iter().map(scan_error_from_record).collect());
    result(errors, coordinator.database())
}

#[tauri::command]
pub fn list_extensions(
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<Vec<ExtensionRule>> {
    result(
        SourceService::new(coordinator.database()).list_extensions(),
        coordinator.database(),
    )
}

#[tauri::command]
pub fn update_extensions(
    extensions: Vec<String>,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<Vec<ExtensionRule>> {
    let updated = coordinator.begin_mutation().and_then(|_mutation| {
        SourceService::new(coordinator.database()).update_extensions(&extensions)
    });
    result(updated, coordinator.database())
}

pub fn progress_sink(app: AppHandle) -> ProgressSink {
    Arc::new(move |progress| {
        let _ = app.emit(SCAN_PROGRESS_EVENT, progress);
    })
}

pub(crate) fn result<T>(
    value: Result<T, crate::DomainError>,
    database: &crate::database::Database,
) -> CommandResult<T> {
    match value {
        Ok(data) => CommandResult::success(data, database.migration_count().unwrap_or_default()),
        Err(error) => CommandResult::failure(error),
    }
}

fn scan_error_from_record(record: ScanErrorRecord) -> ScanError {
    ScanError {
        scan_id: record.scan_id,
        path: record.path,
        error_type: record.error_type,
        occurred_at: record.occurred_at,
        retry_status: record.retry_status,
    }
}
