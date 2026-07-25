use serde::{Deserialize, Serialize};

pub type SourceId = String;
pub type DocumentId = String;
pub type TopicId = String;
pub type ScanRunId = String;
pub type SuggestionId = String;
pub type ExtensionRuleId = String;
pub type PreviewSessionId = String;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecycleResult {
    pub recycled_document_ids: Vec<DocumentId>,
    pub affected_topic_ids: Vec<TopicId>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexSource {
    pub id: SourceId,
    pub path: String,
    pub display_name: String,
    pub enabled: bool,
    pub status: SourceStatus,
    pub added_at: String,
    pub last_scan_at: Option<String>,
    pub last_success_at: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SourceStatus {
    Ready,
    Scanning,
    Unavailable,
    Paused,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentSummary {
    pub id: DocumentId,
    pub source_id: SourceId,
    pub topic_id: TopicId,
    pub file_name: String,
    pub normalized_name: String,
    pub absolute_path: String,
    pub extension: String,
    pub size_bytes: u64,
    pub version_label: Option<String>,
    pub version_sort_key: Option<String>,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
    pub availability: DocumentAvailability,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DocumentAvailability {
    Available,
    Missing,
    Inaccessible,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopicSummary {
    pub id: TopicId,
    pub display_name: String,
    pub document_count: u64,
    pub newest_created_document: Option<DocumentSummary>,
    pub recently_modified_document: Option<DocumentSummary>,
    pub grouping_confidence: GroupingConfidence,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GroupingConfidence {
    Manual,
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopicDetail {
    #[serde(flatten)]
    pub summary: TopicSummary,
    pub canonical_name: String,
    pub display_name_manual: bool,
    pub documents: Vec<DocumentSummary>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewSession {
    pub id: PreviewSessionId,
    pub document_id: DocumentId,
    pub file_name: String,
    pub extension: String,
    pub size_bytes: u64,
    pub content: PreviewContent,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PreviewContent {
    Text {
        text: String,
    },
    Binary {
        media_type: String,
        data_base64: String,
    },
    Office {
        sections: Vec<PreviewSection>,
    },
    Native,
    Limited {
        reason: PreviewLimitReason,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewViewport {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewSection {
    pub label: String,
    pub text: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PreviewLimitReason {
    UnsupportedFormat,
    FileTooLarge,
    InvalidContent,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    pub text: String,
    pub source_ids: Vec<SourceId>,
    pub directory: Option<String>,
    pub created_from: Option<String>,
    pub created_to: Option<String>,
    pub modified_from: Option<String>,
    pub modified_to: Option<String>,
    pub sort_by: SortField,
    pub sort_direction: SortDirection,
    pub page: u32,
    pub page_size: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SortField {
    ModifiedAt,
    CreatedAt,
    Version,
    FileName,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SortDirection {
    Asc,
    Desc,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Page<T> {
    pub items: Vec<T>,
    pub page: u32,
    pub page_size: u32,
    pub total: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRun {
    pub id: ScanRunId,
    pub source_ids: Vec<SourceId>,
    pub status: ScanStatus,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub discovered_count: u64,
    pub processed_count: u64,
    pub topic_count: u64,
    pub suggestion_count: u64,
    pub failure_count: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ScanStatus {
    Queued,
    Running,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexStatus {
    pub scan_status: Option<ScanStatus>,
    pub discovered_count: u64,
    pub processed_count: u64,
    pub document_count: u64,
    pub topic_count: u64,
    pub suggestion_count: u64,
    pub failure_count: u64,
    pub last_completed_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    #[serde(flatten)]
    pub run: ScanRun,
    pub current_path: Option<String>,
    pub elapsed_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanError {
    pub scan_id: ScanRunId,
    pub path: String,
    pub error_type: String,
    pub occurred_at: String,
    pub retry_status: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupingEvidence {
    pub kind: GroupingEvidenceKind,
    pub score: f64,
    pub summary: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GroupingEvidenceKind {
    NormalizedName,
    Keywords,
    EditSimilarity,
    Version,
    FileType,
    Path,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupingSuggestion {
    pub id: SuggestionId,
    pub source_topic_ids: Vec<TopicId>,
    pub proposed_display_name: String,
    pub confidence: GroupingConfidence,
    pub score: f64,
    pub evidence: Vec<GroupingEvidence>,
    pub status: SuggestionStatus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SuggestionStatus {
    Pending,
    Accepted,
    Dismissed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionRule {
    pub id: ExtensionRuleId,
    pub extension: String,
    pub built_in: bool,
    pub enabled: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn search_query_serializes_with_frontend_field_names() {
        let query = SearchQuery {
            text: String::new(),
            source_ids: vec![],
            directory: None,
            created_from: None,
            created_to: None,
            modified_from: None,
            modified_to: None,
            sort_by: SortField::ModifiedAt,
            sort_direction: SortDirection::Desc,
            page: 1,
            page_size: 50,
        };
        let value = serde_json::to_value(query).unwrap();
        assert_eq!(value["sortBy"], "modifiedAt");
        assert_eq!(value["pageSize"], 50);
    }

    #[test]
    fn temporary_directory_fixture_is_isolated() {
        let fixture = tempfile::tempdir().unwrap();
        assert!(fixture.path().is_dir());
    }
}
