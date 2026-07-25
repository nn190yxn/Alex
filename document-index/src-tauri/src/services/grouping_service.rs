use std::{cmp::Ordering, collections::BTreeSet, path::Path};

use crate::{
    database::Database,
    domain::models::{
        GroupingConfidence, GroupingEvidence, GroupingEvidenceKind, GroupingSuggestion, Page,
        SuggestionStatus,
    },
    repositories::{DocumentRecord, GroupedDiscoveryRecord, GroupingRepository, TopicRecord},
};

use crate::domain::error::DomainError;

use super::source_service::now_timestamp;

const HIGH_CONFIDENCE_THRESHOLD: f64 = 0.78;
const MEDIUM_CONFIDENCE_THRESHOLD: f64 = 0.50;
const MAX_CANDIDATES: u32 = 200;

#[derive(Debug, Clone, PartialEq)]
pub struct GroupingMatch {
    pub topic: TopicRecord,
    pub score: f64,
    pub evidence: Vec<GroupingEvidence>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum GroupingDecision {
    AutoGroup(GroupingMatch),
    Suggest(GroupingMatch),
    Independent,
}

pub struct GroupingService<'a> {
    database: &'a Database,
}

impl<'a> GroupingService<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn classify(
        &self,
        document: &DocumentRecord,
        transient: &[GroupedDiscoveryRecord],
    ) -> Result<GroupingDecision, DomainError> {
        let keys = blocking_keys(document);
        let first_keyword = keywords(&document.normalized_name)
            .into_iter()
            .next()
            .unwrap_or_default();
        let mut candidates = GroupingRepository::new(self.database).find_candidates(
            &document.normalized_name,
            &first_keyword,
            MAX_CANDIDATES,
        )?;
        candidates.extend(
            transient
                .iter()
                .map(|item| (item.topic.clone(), item.document.clone())),
        );

        let mut best_by_topic = Vec::<GroupingMatch>::new();
        for (topic, candidate) in candidates {
            if candidate.id == document.id || keys.is_disjoint(&blocking_keys(&candidate)) {
                continue;
            }
            let (score, evidence) = score_documents(document, &candidate);
            let grouping_match = GroupingMatch {
                topic,
                score,
                evidence,
            };
            if let Some(existing) = best_by_topic
                .iter_mut()
                .find(|existing| existing.topic.id == grouping_match.topic.id)
            {
                if compare_matches(&grouping_match, existing) == Ordering::Less {
                    *existing = grouping_match;
                }
            } else {
                best_by_topic.push(grouping_match);
            }
        }
        best_by_topic.sort_by(compare_matches);

        match best_by_topic.into_iter().next() {
            Some(best) if best.score >= HIGH_CONFIDENCE_THRESHOLD => {
                Ok(GroupingDecision::AutoGroup(best))
            }
            Some(best) if best.score >= MEDIUM_CONFIDENCE_THRESHOLD => {
                Ok(GroupingDecision::Suggest(best))
            }
            _ => Ok(GroupingDecision::Independent),
        }
    }

    pub fn list_organize_suggestions(
        &self,
        page: u32,
        page_size: u32,
    ) -> Result<Page<GroupingSuggestion>, DomainError> {
        let page = page.max(1);
        let page_size = page_size.clamp(1, 100);
        let (records, total) =
            GroupingRepository::new(self.database).list_pending_suggestions(page, page_size)?;
        let items = records
            .into_iter()
            .map(grouping_suggestion)
            .collect::<Result<Vec<_>, DomainError>>()?;
        Ok(Page {
            items,
            page,
            page_size,
            total,
        })
    }

    pub fn dismiss_organize_suggestion(
        &self,
        suggestion_id: &str,
    ) -> Result<GroupingSuggestion, DomainError> {
        let repository = GroupingRepository::new(self.database);
        let record = repository
            .get_suggestion(suggestion_id)?
            .ok_or_else(|| invalid_suggestion("The grouping suggestion does not exist."))?;
        if record.status != "pending" {
            return Err(invalid_suggestion(
                "The grouping suggestion has already been resolved.",
            ));
        }
        if !repository.dismiss_pending_suggestion(suggestion_id, &now_timestamp())? {
            return Err(invalid_suggestion(
                "The grouping suggestion has already been resolved.",
            ));
        }
        grouping_suggestion(crate::repositories::GroupingSuggestionRecord {
            status: "dismissed".into(),
            ..record
        })
    }
}

fn grouping_suggestion(
    record: crate::repositories::GroupingSuggestionRecord,
) -> Result<GroupingSuggestion, DomainError> {
    let confidence = match record.confidence.as_str() {
        "high" => GroupingConfidence::High,
        "medium" => GroupingConfidence::Medium,
        "low" => GroupingConfidence::Low,
        _ => return Err(invalid_grouping_data()),
    };
    let status = match record.status.as_str() {
        "pending" => SuggestionStatus::Pending,
        "accepted" => SuggestionStatus::Accepted,
        "dismissed" => SuggestionStatus::Dismissed,
        _ => return Err(invalid_grouping_data()),
    };
    Ok(GroupingSuggestion {
        id: record.id,
        source_topic_ids: record.source_topic_ids,
        proposed_display_name: record.proposed_display_name,
        confidence,
        score: record.score,
        evidence: record.evidence,
        status,
    })
}

fn invalid_suggestion(message: &str) -> DomainError {
    DomainError {
        code: crate::domain::error::ErrorCode::InvalidInput,
        message: message.into(),
        field: Some("suggestionId".into()),
    }
}

fn invalid_grouping_data() -> DomainError {
    DomainError {
        code: crate::domain::error::ErrorCode::DatabaseError,
        message: "The local metadata database contains invalid grouping data.".into(),
        field: None,
    }
}

pub fn blocking_keys(document: &DocumentRecord) -> BTreeSet<String> {
    let mut keys = BTreeSet::new();
    let compact = document
        .normalized_name
        .chars()
        .filter(|character| character.is_alphanumeric())
        .collect::<String>();
    if !compact.is_empty() {
        keys.insert(format!(
            "prefix:{}",
            compact.chars().take(8).collect::<String>()
        ));
    }
    for keyword in keywords(&document.normalized_name) {
        keys.insert(format!("keyword:{keyword}"));
    }
    keys
}

fn score_documents(
    document: &DocumentRecord,
    candidate: &DocumentRecord,
) -> (f64, Vec<GroupingEvidence>) {
    let exact_name = document.normalized_name == candidate.normalized_name;
    let keyword_score = jaccard(
        &keywords(&document.normalized_name),
        &keywords(&candidate.normalized_name),
    );
    let edit_score = edit_similarity(&document.normalized_name, &candidate.normalized_name);
    let version_score = if document.version_label.is_some() && candidate.version_label.is_some() {
        1.0
    } else {
        0.0
    };
    let file_type_score =
        if extension_family(&document.extension) == extension_family(&candidate.extension) {
            1.0
        } else {
            0.0
        };
    let path_score = jaccard(
        &path_keywords(&document.absolute_path),
        &path_keywords(&candidate.absolute_path),
    );

    let mut evidence = Vec::new();
    let score = if exact_name {
        evidence.push(evidence_item(
            GroupingEvidenceKind::NormalizedName,
            0.82,
            "Normalized document names are identical.",
        ));
        0.82 + version_score * 0.05 + file_type_score * 0.05 + path_score * 0.08
    } else {
        push_scaled_evidence(
            &mut evidence,
            GroupingEvidenceKind::Keywords,
            keyword_score,
            0.42,
            "Document name keywords overlap.",
        );
        push_scaled_evidence(
            &mut evidence,
            GroupingEvidenceKind::EditSimilarity,
            edit_score,
            0.38,
            "Normalized document names have edit similarity.",
        );
        push_scaled_evidence(
            &mut evidence,
            GroupingEvidenceKind::Version,
            version_score,
            0.08,
            "Both documents contain recognized version markers.",
        );
        push_scaled_evidence(
            &mut evidence,
            GroupingEvidenceKind::FileType,
            file_type_score,
            0.06,
            "Document extensions belong to the same family.",
        );
        push_scaled_evidence(
            &mut evidence,
            GroupingEvidenceKind::Path,
            path_score,
            0.06,
            "Parent paths contain common topic words.",
        );
        keyword_score * 0.42
            + edit_score * 0.38
            + version_score * 0.08
            + file_type_score * 0.06
            + path_score * 0.06
    };
    (score.min(1.0), evidence)
}

fn compare_matches(left: &GroupingMatch, right: &GroupingMatch) -> Ordering {
    right
        .score
        .total_cmp(&left.score)
        .then_with(|| left.topic.id.cmp(&right.topic.id))
}

fn push_scaled_evidence(
    evidence: &mut Vec<GroupingEvidence>,
    kind: GroupingEvidenceKind,
    value: f64,
    weight: f64,
    summary: &str,
) {
    if value > 0.0 {
        evidence.push(evidence_item(kind, value * weight, summary));
    }
}

fn evidence_item(kind: GroupingEvidenceKind, score: f64, summary: &str) -> GroupingEvidence {
    GroupingEvidence {
        kind,
        score,
        summary: summary.into(),
    }
}

fn keywords(value: &str) -> BTreeSet<String> {
    value
        .split(|character: char| !character.is_alphanumeric())
        .map(str::trim)
        .filter(|keyword| keyword.chars().count() >= 2)
        .map(str::to_lowercase)
        .collect()
}

fn path_keywords(value: &str) -> BTreeSet<String> {
    Path::new(value)
        .parent()
        .map(|parent| keywords(&parent.to_string_lossy()))
        .unwrap_or_default()
}

fn jaccard(left: &BTreeSet<String>, right: &BTreeSet<String>) -> f64 {
    let union = left.union(right).count();
    if union == 0 {
        return 0.0;
    }
    left.intersection(right).count() as f64 / union as f64
}

fn edit_similarity(left: &str, right: &str) -> f64 {
    let left = left.chars().collect::<Vec<_>>();
    let right = right.chars().collect::<Vec<_>>();
    let longest = left.len().max(right.len());
    if longest == 0 {
        return 1.0;
    }
    let mut previous = (0..=right.len()).collect::<Vec<_>>();
    for (left_index, left_character) in left.iter().enumerate() {
        let mut current = vec![left_index + 1];
        for (right_index, right_character) in right.iter().enumerate() {
            let substitution =
                previous[right_index] + usize::from(left_character != right_character);
            current.push(
                (current[right_index] + 1)
                    .min(previous[right_index + 1] + 1)
                    .min(substitution),
            );
        }
        previous = current;
    }
    1.0 - previous[right.len()] as f64 / longest as f64
}

fn extension_family(extension: &str) -> &'static str {
    match extension {
        "doc" | "docx" | "rtf" | "txt" | "md" | "pdf" => "document",
        "xls" | "xlsx" | "csv" => "spreadsheet",
        "ppt" | "pptx" => "presentation",
        "json" => "data",
        _ => "other",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn topic(id: &str) -> TopicRecord {
        TopicRecord {
            id: id.into(),
            canonical_name: id.into(),
            display_name: id.into(),
            display_name_manual: false,
            grouping_confidence: "low".into(),
            newest_created_document_id: None,
            recently_modified_document_id: None,
            created_at: "2026-07-24T00:00:00Z".into(),
            updated_at: "2026-07-24T00:00:00Z".into(),
        }
    }

    fn document(id: &str, name: &str, path: &str) -> DocumentRecord {
        DocumentRecord {
            id: id.into(),
            source_id: "source".into(),
            topic_id: format!("topic-{id}"),
            absolute_path: path.into(),
            file_identity: None,
            file_name: format!("{name}.docx"),
            normalized_name: name.into(),
            extension: "docx".into(),
            version_label: Some("v1".into()),
            version_sort_key: Some("version:0000000001".into()),
            size_bytes: 1,
            created_at: None,
            modified_at: None,
            availability: "available".into(),
            manual_topic: false,
            indexed_at: "scan".into(),
        }
    }

    fn transient(topic: TopicRecord, document: DocumentRecord) -> GroupedDiscoveryRecord {
        GroupedDiscoveryRecord {
            topic,
            document,
            topic_is_new: true,
            suggestion: None,
        }
    }

    #[test]
    fn identical_normalized_names_auto_group_across_paths() {
        let database = Database::open_in_memory().unwrap();
        let existing = document(
            "one",
            "quarterly report",
            "/team-a/quarterly-report-v1.docx",
        );
        let incoming = document(
            "two",
            "quarterly report",
            "/team-b/quarterly-report-v2.docx",
        );
        let decision = GroupingService::new(&database)
            .classify(&incoming, &[transient(topic("target"), existing)])
            .unwrap();

        assert!(matches!(
            decision,
            GroupingDecision::AutoGroup(GroupingMatch { topic, score, .. })
                if topic.id == "target" && score >= HIGH_CONFIDENCE_THRESHOLD
        ));
    }

    #[test]
    fn highly_similar_names_create_a_medium_confidence_suggestion() {
        let database = Database::open_in_memory().unwrap();
        let existing = document(
            "one",
            "quarterly finance report",
            "/finance/quarterly/one.docx",
        );
        let incoming = document(
            "two",
            "quarterly financial report",
            "/archive/quarterly/two.docx",
        );
        let decision = GroupingService::new(&database)
            .classify(&incoming, &[transient(topic("candidate"), existing)])
            .unwrap();

        assert!(matches!(decision, GroupingDecision::Suggest(_)));
    }

    #[test]
    fn unrelated_names_remain_independent_and_use_disjoint_blocks() {
        let database = Database::open_in_memory().unwrap();
        let existing = document("one", "employee handbook", "/hr/handbook.docx");
        let incoming = document("two", "quarterly budget", "/finance/budget.docx");
        assert!(blocking_keys(&existing).is_disjoint(&blocking_keys(&incoming)));
        let decision = GroupingService::new(&database)
            .classify(&incoming, &[transient(topic("candidate"), existing)])
            .unwrap();

        assert_eq!(decision, GroupingDecision::Independent);
    }
}
