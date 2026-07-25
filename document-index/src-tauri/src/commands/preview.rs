use std::sync::Arc;

use tauri::{State, WebviewWindow};

use crate::{
    domain::{
        error::{CommandResult, DomainError},
        models::{PreviewSession, PreviewViewport, RecycleResult},
    },
    services::{PreviewService, RecycleBinService, ScanCoordinator},
};

use super::indexing::result;

#[cfg(target_os = "windows")]
use crate::domain::error::ErrorCode;

#[tauri::command]
pub fn create_preview_session(
    document_id: String,
    viewport: PreviewViewport,
    window: WebviewWindow,
    preview_service: State<'_, Arc<PreviewService>>,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<PreviewSession> {
    result(
        parent_window_handle(&window).and_then(|parent_window| {
            preview_service.create_session_with_viewport(&document_id, parent_window, viewport)
        }),
        coordinator.database(),
    )
}

#[tauri::command]
pub fn resize_preview_session(
    session_id: String,
    viewport: PreviewViewport,
    preview_service: State<'_, Arc<PreviewService>>,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<()> {
    result(
        preview_service.resize_session(&session_id, viewport),
        coordinator.database(),
    )
}

#[tauri::command]
pub fn close_preview_session(
    session_id: String,
    preview_service: State<'_, Arc<PreviewService>>,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<()> {
    result(
        preview_service.close_session(&session_id),
        coordinator.database(),
    )
}

#[tauri::command]
pub fn recycle_documents(
    document_ids: Vec<String>,
    confirmation_token: String,
    recycle_service: State<'_, Arc<RecycleBinService>>,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<RecycleResult> {
    let recycled = coordinator.begin_mutation().and_then(|_mutation| {
        recycle_service.recycle_documents(&document_ids, &confirmation_token)
    });
    result(recycled, coordinator.database())
}

#[tauri::command]
pub fn open_recycle_bin(
    recycle_service: State<'_, Arc<RecycleBinService>>,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<()> {
    result(recycle_service.open_recycle_bin(), coordinator.database())
}

#[cfg(target_os = "windows")]
fn parent_window_handle(window: &WebviewWindow) -> Result<isize, DomainError> {
    window
        .hwnd()
        .map(|handle| handle.0 as isize)
        .map_err(|_| preview_window_unavailable())
}

#[cfg(not(target_os = "windows"))]
fn parent_window_handle(_window: &WebviewWindow) -> Result<isize, DomainError> {
    Ok(0)
}

#[cfg(target_os = "windows")]
fn preview_window_unavailable() -> DomainError {
    DomainError {
        code: ErrorCode::FileSystemError,
        message: "The preview host window is unavailable.".into(),
        field: None,
    }
}
