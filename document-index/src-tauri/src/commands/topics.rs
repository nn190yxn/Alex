use std::sync::Arc;

use tauri::State;

use crate::{
    domain::{
        error::CommandResult,
        models::{GroupingSuggestion, Page, TopicDetail},
    },
    services::{GroupingService, ScanCoordinator, TopicService},
};

use super::indexing::result;

#[tauri::command]
pub fn rename_topic(
    topic_id: String,
    display_name: String,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<TopicDetail> {
    let renamed = coordinator.begin_mutation().and_then(|_mutation| {
        TopicService::new(coordinator.database()).rename_topic(&topic_id, &display_name)
    });
    result(renamed, coordinator.database())
}

#[tauri::command]
pub fn merge_topics(
    source_topic_ids: Vec<String>,
    target_name: String,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<TopicDetail> {
    let merged = coordinator.begin_mutation().and_then(|_mutation| {
        TopicService::new(coordinator.database()).merge_topics(&source_topic_ids, &target_name)
    });
    result(merged, coordinator.database())
}

#[tauri::command]
pub fn move_documents_to_topic(
    document_ids: Vec<String>,
    target_topic_id: Option<String>,
    new_topic_name: Option<String>,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<Vec<TopicDetail>> {
    let moved = coordinator.begin_mutation().and_then(|_mutation| {
        TopicService::new(coordinator.database()).move_documents_to_topic(
            &document_ids,
            target_topic_id.as_deref(),
            new_topic_name.as_deref(),
        )
    });
    result(moved, coordinator.database())
}

#[tauri::command]
pub fn list_organize_suggestions(
    page: u32,
    page_size: u32,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<Page<GroupingSuggestion>> {
    result(
        GroupingService::new(coordinator.database()).list_organize_suggestions(page, page_size),
        coordinator.database(),
    )
}

#[tauri::command]
pub fn accept_organize_suggestion(
    suggestion_id: String,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<TopicDetail> {
    let accepted = coordinator.begin_mutation().and_then(|_mutation| {
        TopicService::new(coordinator.database()).accept_organize_suggestion(&suggestion_id)
    });
    result(accepted, coordinator.database())
}

#[tauri::command]
pub fn dismiss_organize_suggestion(
    suggestion_id: String,
    coordinator: State<'_, Arc<ScanCoordinator>>,
) -> CommandResult<GroupingSuggestion> {
    let dismissed = coordinator.begin_mutation().and_then(|_mutation| {
        GroupingService::new(coordinator.database()).dismiss_organize_suggestion(&suggestion_id)
    });
    result(dismissed, coordinator.database())
}
