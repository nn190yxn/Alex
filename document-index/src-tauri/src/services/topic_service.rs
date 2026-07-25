use std::collections::BTreeSet;

use uuid::Uuid;

use crate::{
    database::Database,
    domain::{
        error::{DomainError, ErrorCode},
        models::{
            DocumentAvailability, DocumentSummary, GroupingConfidence, SortDirection, SortField,
            TopicDetail, TopicSummary,
        },
    },
    repositories::{
        DocumentRecord, DocumentRepository, GroupingRepository, TopicRecord, TopicRepository,
    },
};

use super::source_service::now_timestamp;

pub struct TopicService<'a> {
    database: &'a Database,
}

impl<'a> TopicService<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn detail(
        &self,
        topic_id: &str,
        sort_by: SortField,
        sort_direction: SortDirection,
    ) -> Result<TopicDetail, DomainError> {
        let topic = TopicRepository::new(self.database)
            .get(topic_id)?
            .ok_or_else(topic_not_found)?;
        let documents = DocumentRepository::new(self.database).list_for_topic_sorted(
            topic_id,
            sort_by,
            sort_direction,
        )?;
        topic_detail(topic, documents)
    }

    pub fn rename_topic(
        &self,
        topic_id: &str,
        display_name: &str,
    ) -> Result<TopicDetail, DomainError> {
        let display_name = validate_name(display_name)?;
        let repository = TopicRepository::new(self.database);
        repository.get(topic_id)?.ok_or_else(topic_not_found)?;
        repository.rename_manual(topic_id, display_name, &now_timestamp())?;
        self.detail(topic_id, SortField::ModifiedAt, SortDirection::Desc)
    }

    pub fn merge_topics(
        &self,
        source_topic_ids: &[String],
        target_name: &str,
    ) -> Result<TopicDetail, DomainError> {
        let target_name = validate_name(target_name)?;
        let source_topic_ids = source_topic_ids
            .iter()
            .filter(|id| !id.trim().is_empty())
            .cloned()
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        if source_topic_ids.len() < 2 {
            return Err(invalid_input(
                "At least two distinct topics are required for a merge.",
                "sourceTopicIds",
            ));
        }
        let repository = TopicRepository::new(self.database);
        for topic_id in &source_topic_ids {
            repository.get(topic_id)?.ok_or_else(topic_not_found)?;
        }
        let target_topic_id = source_topic_ids[0].clone();
        repository.merge_manual(
            &source_topic_ids,
            &target_topic_id,
            target_name,
            &now_timestamp(),
        )?;
        self.detail(&target_topic_id, SortField::ModifiedAt, SortDirection::Desc)
    }

    pub fn accept_organize_suggestion(
        &self,
        suggestion_id: &str,
    ) -> Result<TopicDetail, DomainError> {
        let suggestion = GroupingRepository::new(self.database)
            .get_suggestion(suggestion_id)?
            .ok_or_else(|| invalid_suggestion("The grouping suggestion does not exist."))?;
        if suggestion.status != "pending" {
            return Err(invalid_suggestion(
                "The grouping suggestion has already been resolved.",
            ));
        }
        let target_name = validate_name(&suggestion.proposed_display_name)?;
        let source_topic_ids = suggestion
            .source_topic_ids
            .iter()
            .filter(|id| !id.trim().is_empty())
            .cloned()
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        if source_topic_ids.len() < 2 {
            return Err(invalid_suggestion(
                "The grouping suggestion must reference at least two topics.",
            ));
        }
        let topics = TopicRepository::new(self.database);
        for topic_id in &source_topic_ids {
            topics.get(topic_id)?.ok_or_else(topic_not_found)?;
        }
        let target_topic_id = source_topic_ids[0].clone();
        if !topics.merge_suggestion_manual(
            suggestion_id,
            &source_topic_ids,
            &target_topic_id,
            target_name,
            &now_timestamp(),
        )? {
            return Err(invalid_suggestion(
                "The grouping suggestion has already been resolved.",
            ));
        }
        self.detail(&target_topic_id, SortField::ModifiedAt, SortDirection::Desc)
    }

    pub fn move_documents_to_topic(
        &self,
        document_ids: &[String],
        target_topic_id: Option<&str>,
        new_topic_name: Option<&str>,
    ) -> Result<Vec<TopicDetail>, DomainError> {
        let document_ids = document_ids
            .iter()
            .filter(|id| !id.trim().is_empty())
            .cloned()
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        if document_ids.is_empty() {
            return Err(invalid_input(
                "At least one document is required.",
                "documentIds",
            ));
        }
        let documents = DocumentRepository::new(self.database);
        for document_id in &document_ids {
            documents.get(document_id)?.ok_or_else(document_not_found)?;
        }

        let topics = TopicRepository::new(self.database);
        let (target, target_is_new) = match (target_topic_id, new_topic_name) {
            (Some(topic_id), None) => (topics.get(topic_id)?.ok_or_else(topic_not_found)?, false),
            (None, Some(name)) => {
                let name = validate_name(name)?;
                let now = now_timestamp();
                (
                    TopicRecord {
                        id: Uuid::new_v4().to_string(),
                        canonical_name: name.to_lowercase(),
                        display_name: name.into(),
                        display_name_manual: true,
                        grouping_confidence: "manual".into(),
                        newest_created_document_id: None,
                        recently_modified_document_id: None,
                        created_at: now.clone(),
                        updated_at: now,
                    },
                    true,
                )
            }
            _ => {
                return Err(invalid_input(
                    "Choose one existing topic or provide one new topic name.",
                    "targetTopicId",
                ));
            }
        };
        let remaining = topics.move_documents_manual(
            &document_ids,
            &target,
            target_is_new,
            &now_timestamp(),
        )?;
        remaining
            .into_iter()
            .map(|topic_id| self.detail(&topic_id, SortField::ModifiedAt, SortDirection::Desc))
            .collect()
    }
}

fn topic_detail(
    topic: TopicRecord,
    documents: Vec<DocumentRecord>,
) -> Result<TopicDetail, DomainError> {
    let document_count = documents.len().try_into().map_err(|_| invalid_record())?;
    let documents = documents
        .into_iter()
        .map(document_summary)
        .collect::<Result<Vec<_>, _>>()?;
    let newest_created_document =
        marker_document(&documents, topic.newest_created_document_id.as_deref());
    let recently_modified_document =
        marker_document(&documents, topic.recently_modified_document_id.as_deref());
    Ok(TopicDetail {
        summary: TopicSummary {
            id: topic.id,
            display_name: topic.display_name,
            document_count,
            newest_created_document,
            recently_modified_document,
            grouping_confidence: grouping_confidence(&topic.grouping_confidence)?,
        },
        canonical_name: topic.canonical_name,
        display_name_manual: topic.display_name_manual,
        documents,
    })
}

fn marker_document(documents: &[DocumentSummary], id: Option<&str>) -> Option<DocumentSummary> {
    id.and_then(|id| documents.iter().find(|document| document.id == id).cloned())
}

fn document_summary(document: DocumentRecord) -> Result<DocumentSummary, DomainError> {
    Ok(DocumentSummary {
        id: document.id,
        source_id: document.source_id,
        topic_id: document.topic_id,
        file_name: document.file_name,
        normalized_name: document.normalized_name,
        absolute_path: document.absolute_path,
        extension: document.extension,
        size_bytes: document
            .size_bytes
            .try_into()
            .map_err(|_| invalid_record())?,
        version_label: document.version_label,
        version_sort_key: document.version_sort_key,
        created_at: document.created_at,
        modified_at: document.modified_at,
        availability: match document.availability.as_str() {
            "available" => DocumentAvailability::Available,
            "missing" => DocumentAvailability::Missing,
            "inaccessible" => DocumentAvailability::Inaccessible,
            _ => return Err(invalid_record()),
        },
    })
}

fn grouping_confidence(value: &str) -> Result<GroupingConfidence, DomainError> {
    match value {
        "manual" => Ok(GroupingConfidence::Manual),
        "high" => Ok(GroupingConfidence::High),
        "medium" => Ok(GroupingConfidence::Medium),
        "low" => Ok(GroupingConfidence::Low),
        _ => Err(invalid_record()),
    }
}

fn validate_name(value: &str) -> Result<&str, DomainError> {
    let value = value.trim();
    if value.is_empty() || value.chars().count() > 200 {
        Err(invalid_input(
            "A topic name between 1 and 200 characters is required.",
            "displayName",
        ))
    } else {
        Ok(value)
    }
}

fn invalid_input(message: &str, field: &str) -> DomainError {
    DomainError {
        code: ErrorCode::InvalidInput,
        message: message.into(),
        field: Some(field.into()),
    }
}

fn invalid_suggestion(message: &str) -> DomainError {
    invalid_input(message, "suggestionId")
}

fn topic_not_found() -> DomainError {
    DomainError {
        code: ErrorCode::TopicNotFound,
        message: "The topic does not exist.".into(),
        field: Some("topicId".into()),
    }
}

fn document_not_found() -> DomainError {
    DomainError {
        code: ErrorCode::DocumentNotFound,
        message: "A selected document does not exist.".into(),
        field: Some("documentIds".into()),
    }
}

fn invalid_record() -> DomainError {
    DomainError {
        code: ErrorCode::DatabaseError,
        message: "The local metadata database contains invalid topic data.".into(),
        field: None,
    }
}
