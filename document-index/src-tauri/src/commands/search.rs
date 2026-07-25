use std::sync::Arc;

use tauri::State;

use crate::{
    domain::{
        error::CommandResult,
        models::{Page, SearchQuery, SortDirection, SortField, TopicDetail, TopicSummary},
    },
    services::{ScanCoordinator, SearchService, ShellService, TopicService},
};

use super::indexing::result;

#[tauri::command]
pub fn search_topics(
    query: SearchQuery,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<Page<TopicSummary>> {
    result(
        SearchService::new(coordinator.database()).search_topics(query),
        coordinator.database(),
    )
}

#[tauri::command]
pub fn get_topic_detail(
    topic_id: String,
    sort_by: SortField,
    sort_direction: SortDirection,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<TopicDetail> {
    result(
        TopicService::new(coordinator.database()).detail(&topic_id, sort_by, sort_direction),
        coordinator.database(),
    )
}

#[tauri::command]
pub fn open_document(
    document_id: String,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<()> {
    result(
        ShellService::new(coordinator.database()).open_document(&document_id),
        coordinator.database(),
    )
}

#[tauri::command]
pub fn reveal_document(
    document_id: String,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<()> {
    result(
        ShellService::new(coordinator.database()).reveal_document(&document_id),
        coordinator.database(),
    )
}
