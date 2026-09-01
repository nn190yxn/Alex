use serde::{Deserialize, Serialize};

use super::calendar::CalendarProject;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisQuery {
    pub starts_on: String,
    pub ends_on: String,
    pub timezone: String,
    pub sort: AnalysisSort,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AnalysisSort {
    CompletedCount,
    FocusSeconds,
    EffectiveSessionCount,
    Title,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskAnalysisRow {
    pub task_id: String,
    pub task_instance_count: u32,
    pub title: String,
    pub category: String,
    pub project: Option<CalendarProject>,
    pub completed_count: u32,
    pub focus_seconds: u64,
    pub effective_session_count: u32,
    pub cancelled_session_count: u32,
    pub last_completed_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisSummary {
    pub starts_on: String,
    pub ends_on: String,
    pub task_count: u32,
    pub completed_count: u32,
    pub focus_seconds: u64,
    pub effective_session_count: u32,
    pub cancelled_session_count: u32,
    pub rows: Vec<TaskAnalysisRow>,
}
