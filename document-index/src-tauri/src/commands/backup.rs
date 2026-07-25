use std::sync::Arc;

use tauri::State;

use crate::{
    domain::error::CommandResult,
    services::{
        BackupExportResult, BackupPreferences, BackupRestoreResult, BackupService, ScanCoordinator,
        WatchService,
    },
};

use super::indexing::result;

#[tauri::command]
pub fn export_index_backup(
    path: String,
    preferences: BackupPreferences,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<BackupExportResult> {
    result(
        BackupService::new(coordinator.database()).export(&path, preferences),
        coordinator.database(),
    )
}

#[tauri::command]
pub fn restore_index_backup(
    path: String,
    coordinator: State<'_, Arc<ScanCoordinator>>,
    watcher: State<'_, Arc<WatchService>>,
) -> CommandResult<BackupRestoreResult> {
    let restored = coordinator.begin_maintenance().and_then(|_maintenance| {
        let restored = BackupService::new(coordinator.database()).restore(&path)?;
        watcher.sync_sources()?;
        Ok(restored)
    });
    result(restored, coordinator.database())
}
