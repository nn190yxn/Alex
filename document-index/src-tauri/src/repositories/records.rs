#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IndexSourceRecord {
    pub id: String,
    pub path: String,
    pub display_name: String,
    pub enabled: bool,
    pub status: String,
    pub added_at: String,
    pub last_scan_at: Option<String>,
    pub last_success_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TopicRecord {
    pub id: String,
    pub canonical_name: String,
    pub display_name: String,
    pub display_name_manual: bool,
    pub grouping_confidence: String,
    pub newest_created_document_id: Option<String>,
    pub recently_modified_document_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DocumentRecord {
    pub id: String,
    pub source_id: String,
    pub topic_id: String,
    pub absolute_path: String,
    pub file_identity: Option<String>,
    pub file_name: String,
    pub normalized_name: String,
    pub extension: String,
    pub version_label: Option<String>,
    pub version_sort_key: Option<String>,
    pub size_bytes: i64,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
    pub availability: String,
    pub manual_topic: bool,
    pub indexed_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScanRunRecord {
    pub id: String,
    pub source_ids: Vec<String>,
    pub status: String,
    pub cursor_path: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub discovered_count: i64,
    pub processed_count: i64,
    pub topic_count: i64,
    pub suggestion_count: i64,
    pub failure_count: i64,
    pub error_summary: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IndexStatusRecord {
    pub scan_status: Option<String>,
    pub discovered_count: i64,
    pub processed_count: i64,
    pub document_count: i64,
    pub topic_count: i64,
    pub suggestion_count: i64,
    pub failure_count: i64,
    pub last_completed_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScanErrorRecord {
    pub id: Option<i64>,
    pub scan_id: String,
    pub path: String,
    pub error_type: String,
    pub occurred_at: String,
    pub retry_status: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ExtensionRuleRecord {
    pub id: String,
    pub extension: String,
    pub built_in: bool,
    pub enabled: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct GroupingSuggestionRecord {
    pub id: String,
    pub source_topic_ids: Vec<String>,
    pub proposed_display_name: String,
    pub confidence: String,
    pub score: f64,
    pub evidence: Vec<GroupingEvidence>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct GroupedDiscoveryRecord {
    pub topic: TopicRecord,
    pub document: DocumentRecord,
    pub topic_is_new: bool,
    pub suggestion: Option<GroupingSuggestionRecord>,
}
use crate::domain::models::GroupingEvidence;
