use std::{collections::BTreeSet, path::Path};

use rusqlite::{params, OptionalExtension};

use crate::{
    database::Database,
    domain::{
        error::DomainError,
        models::{SortDirection, SortField},
    },
};

use super::{
    topics::refresh_topic_aggregate, DocumentRecord, GroupedDiscoveryRecord,
    GroupingSuggestionRecord, TopicRecord,
};

pub struct DocumentRepository<'a> {
    database: &'a Database,
}

impl<'a> DocumentRepository<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn upsert_batch(&self, documents: &[DocumentRecord]) -> Result<(), DomainError> {
        self.database.transaction(|transaction| {
            let mut affected_topics = BTreeSet::new();
            for document in documents {
                upsert_document(transaction, document, &mut affected_topics)?;
            }

            for topic_id in affected_topics {
                refresh_topic_aggregate(transaction, &topic_id)?;
            }
            Ok(())
        })
    }

    pub fn upsert_discovery_batch(
        &self,
        discoveries: &[(TopicRecord, DocumentRecord)],
    ) -> Result<(), DomainError> {
        self.database.transaction(|transaction| {
            let mut affected_topics = BTreeSet::new();
            for (topic, document) in discoveries {
                transaction.execute(
                    "INSERT INTO topics(
                        id, canonical_name, display_name, display_name_manual, grouping_confidence,
                        newest_created_document_id, recently_modified_document_id, created_at, updated_at
                     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                     ON CONFLICT(id) DO NOTHING",
                    params![
                        topic.id,
                        topic.canonical_name,
                        topic.display_name,
                        topic.display_name_manual,
                        topic.grouping_confidence,
                        topic.newest_created_document_id,
                        topic.recently_modified_document_id,
                        topic.created_at,
                        topic.updated_at,
                    ],
                )?;
                upsert_document(transaction, document, &mut affected_topics)?;
            }
            for topic_id in affected_topics {
                refresh_topic_aggregate(transaction, &topic_id)?;
            }
            Ok(())
        })
    }

    pub fn upsert_grouped_discovery_batch(
        &self,
        discoveries: &[GroupedDiscoveryRecord],
    ) -> Result<(), DomainError> {
        let serialized = discoveries
            .iter()
            .map(|discovery| {
                discovery
                    .suggestion
                    .as_ref()
                    .map(serialize_suggestion)
                    .transpose()
            })
            .collect::<Result<Vec<_>, _>>()?;
        self.database.transaction(|transaction| {
            let mut affected_topics = BTreeSet::new();
            for (discovery, suggestion) in discoveries.iter().zip(serialized.iter()) {
                insert_topic(transaction, &discovery.topic)?;
                upsert_document(transaction, &discovery.document, &mut affected_topics)?;
                if let Some(suggestion) = suggestion {
                    transaction.execute(
                        "INSERT INTO grouping_suggestions(
                            id, source_topic_ids_json, proposed_display_name, confidence,
                            score, evidence_json, status, created_at, updated_at
                         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                         ON CONFLICT(id) DO UPDATE SET
                            proposed_display_name = excluded.proposed_display_name,
                            confidence = excluded.confidence,
                            score = excluded.score,
                            evidence_json = excluded.evidence_json,
                            status = CASE
                                WHEN grouping_suggestions.status = 'pending' THEN 'pending'
                                ELSE grouping_suggestions.status
                            END,
                            updated_at = excluded.updated_at",
                        params![
                            suggestion.record.id,
                            suggestion.source_topic_ids_json,
                            suggestion.record.proposed_display_name,
                            suggestion.record.confidence,
                            suggestion.record.score,
                            suggestion.evidence_json,
                            suggestion.record.status,
                            suggestion.record.created_at,
                            suggestion.record.updated_at,
                        ],
                    )?;
                }
            }
            for topic_id in affected_topics {
                refresh_topic_aggregate(transaction, &topic_id)?;
            }
            Ok(())
        })
    }

    pub fn get_by_source_path(
        &self,
        source_id: &str,
        absolute_path: &str,
    ) -> Result<Option<DocumentRecord>, DomainError> {
        self.database.read(|connection| {
            connection
                .query_row(
                    "SELECT id, source_id, topic_id, absolute_path, file_identity, file_name, normalized_name,
                            extension, version_label, version_sort_key, size_bytes, created_at, modified_at,
                            availability, manual_topic, indexed_at
                     FROM documents WHERE source_id = ?1 AND absolute_path = ?2",
                    params![source_id, absolute_path],
                    map_document,
                )
                .optional()
        })
    }

    pub fn list_by_source_file_identity(
        &self,
        source_id: &str,
        file_identity: &str,
    ) -> Result<Vec<DocumentRecord>, DomainError> {
        self.database.read(|connection| {
            let mut statement = connection.prepare(
                "SELECT id, source_id, topic_id, absolute_path, file_identity, file_name, normalized_name,
                        extension, version_label, version_sort_key, size_bytes, created_at, modified_at,
                        availability, manual_topic, indexed_at
                 FROM documents
                 WHERE source_id = ?1 AND file_identity = ?2
                 ORDER BY absolute_path, id
                 LIMIT 2",
            )?;
            let documents = statement
                .query_map(params![source_id, file_identity], map_document)?
                .collect();
            documents
        })
    }

    pub fn get(&self, document_id: &str) -> Result<Option<DocumentRecord>, DomainError> {
        self.database.read(|connection| {
            connection
                .query_row(
                    "SELECT id, source_id, topic_id, absolute_path, file_identity, file_name, normalized_name,
                            extension, version_label, version_sort_key, size_bytes, created_at, modified_at,
                            availability, manual_topic, indexed_at
                     FROM documents WHERE id = ?1",
                    [document_id],
                    map_document,
                )
                .optional()
        })
    }

    pub fn list_for_topic(&self, topic_id: &str) -> Result<Vec<DocumentRecord>, DomainError> {
        self.list_for_topic_sorted(topic_id, SortField::ModifiedAt, SortDirection::Desc)
    }

    pub fn list_for_topic_sorted(
        &self,
        topic_id: &str,
        sort_by: SortField,
        sort_direction: SortDirection,
    ) -> Result<Vec<DocumentRecord>, DomainError> {
        let direction = match sort_direction {
            SortDirection::Asc => "ASC",
            SortDirection::Desc => "DESC",
        };
        let ordering = match sort_by {
            SortField::ModifiedAt => format!(
                "modified_at IS NULL, modified_at {direction},
                 version_sort_key IS NULL, version_sort_key {direction},
                 created_at IS NULL, created_at {direction}, absolute_path ASC, id ASC"
            ),
            SortField::CreatedAt => format!(
                "created_at IS NULL, created_at {direction},
                 version_sort_key IS NULL, version_sort_key {direction},
                 modified_at IS NULL, modified_at {direction}, absolute_path ASC, id ASC"
            ),
            SortField::Version => format!(
                "version_sort_key IS NULL, version_sort_key {direction},
                 modified_at IS NULL, modified_at {direction},
                 created_at IS NULL, created_at {direction}, absolute_path ASC, id ASC"
            ),
            SortField::FileName => {
                format!("file_name COLLATE NOCASE {direction}, absolute_path ASC, id ASC")
            }
        };
        self.database.read(|connection| {
            let sql = format!(
                "SELECT id, source_id, topic_id, absolute_path, file_identity, file_name, normalized_name,
                        extension, version_label, version_sort_key, size_bytes, created_at, modified_at,
                        availability, manual_topic, indexed_at
                 FROM documents WHERE topic_id = ?1 ORDER BY {ordering}"
            );
            let mut statement = connection.prepare(&sql)?;
            let documents = statement.query_map([topic_id], map_document)?.collect();
            documents
        })
    }

    pub fn mark_missing_not_seen(
        &self,
        source_id: &str,
        scan_timestamp: &str,
    ) -> Result<u64, DomainError> {
        self.database.transaction(|transaction| {
            let mut statement = transaction.prepare(
                "SELECT DISTINCT topic_id FROM documents
                 WHERE source_id = ?1 AND indexed_at <> ?2 AND availability <> 'missing'",
            )?;
            let topic_ids = statement
                .query_map(params![source_id, scan_timestamp], |row| {
                    row.get::<_, String>(0)
                })?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            drop(statement);

            let changed = transaction.execute(
                "UPDATE documents SET availability = 'missing'
                 WHERE source_id = ?1 AND indexed_at <> ?2 AND availability <> 'missing'",
                params![source_id, scan_timestamp],
            )?;
            for topic_id in topic_ids {
                refresh_topic_aggregate(transaction, &topic_id)?;
            }
            Ok(changed as u64)
        })
    }

    pub fn mark_missing_not_seen_under(
        &self,
        source_id: &str,
        directory: &Path,
        scan_timestamp: &str,
    ) -> Result<u64, DomainError> {
        self.database.transaction(|transaction| {
            let mut statement = transaction.prepare(
                "SELECT id, topic_id, absolute_path FROM documents
                 WHERE source_id = ?1 AND indexed_at <> ?2 AND availability <> 'missing'",
            )?;
            let candidates = statement
                .query_map(params![source_id, scan_timestamp], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                })?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            drop(statement);

            let mut changed = 0_u64;
            let mut topic_ids = BTreeSet::new();
            for (document_id, topic_id, absolute_path) in candidates {
                if !Path::new(&absolute_path).starts_with(directory) {
                    continue;
                }
                transaction.execute(
                    "UPDATE documents SET availability = 'missing' WHERE id = ?1",
                    [document_id],
                )?;
                changed += 1;
                topic_ids.insert(topic_id);
            }
            for topic_id in topic_ids {
                refresh_topic_aggregate(transaction, &topic_id)?;
            }
            Ok(changed)
        })
    }

    pub fn mark_recycled(&self, document_ids: &[String]) -> Result<Vec<String>, DomainError> {
        self.database.transaction(|transaction| {
            let mut affected_topics = BTreeSet::new();
            for document_id in document_ids {
                let topic_id = transaction.query_row(
                    "SELECT topic_id FROM documents WHERE id = ?1 AND availability = 'available'",
                    [document_id],
                    |row| row.get::<_, String>(0),
                )?;
                transaction.execute(
                    "UPDATE documents SET availability = 'missing' WHERE id = ?1",
                    [document_id],
                )?;
                affected_topics.insert(topic_id);
            }
            for topic_id in &affected_topics {
                refresh_topic_aggregate(transaction, topic_id)?;
            }
            Ok(affected_topics.into_iter().collect())
        })
    }
}

struct SerializedSuggestion<'a> {
    record: &'a GroupingSuggestionRecord,
    source_topic_ids_json: String,
    evidence_json: String,
}

fn serialize_suggestion(
    suggestion: &GroupingSuggestionRecord,
) -> Result<SerializedSuggestion<'_>, DomainError> {
    let source_topic_ids_json =
        serde_json::to_string(&suggestion.source_topic_ids).map_err(|_| structured_data_error())?;
    let evidence_json =
        serde_json::to_string(&suggestion.evidence).map_err(|_| structured_data_error())?;
    Ok(SerializedSuggestion {
        record: suggestion,
        source_topic_ids_json,
        evidence_json,
    })
}

fn structured_data_error() -> DomainError {
    DomainError {
        code: crate::domain::error::ErrorCode::DatabaseError,
        message: "Grouping evidence could not be stored in the local database.".into(),
        field: None,
    }
}

fn insert_topic(
    transaction: &rusqlite::Transaction<'_>,
    topic: &TopicRecord,
) -> rusqlite::Result<()> {
    transaction.execute(
        "INSERT INTO topics(
            id, canonical_name, display_name, display_name_manual, grouping_confidence,
            newest_created_document_id, recently_modified_document_id, created_at, updated_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(id) DO NOTHING",
        params![
            topic.id,
            topic.canonical_name,
            topic.display_name,
            topic.display_name_manual,
            topic.grouping_confidence,
            topic.newest_created_document_id,
            topic.recently_modified_document_id,
            topic.created_at,
            topic.updated_at,
        ],
    )?;
    Ok(())
}

fn upsert_document(
    transaction: &rusqlite::Transaction<'_>,
    document: &DocumentRecord,
    affected_topics: &mut BTreeSet<String>,
) -> rusqlite::Result<()> {
    let previous_by_id: Option<(String, String, String)> = transaction
        .query_row(
            "SELECT topic_id, source_id, absolute_path FROM documents WHERE id = ?1",
            [&document.id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()?;
    if let Some((topic_id, _, _)) = &previous_by_id {
        affected_topics.insert(topic_id.clone());
    }
    let old_topic: Option<String> = transaction
        .query_row(
            "SELECT topic_id FROM documents WHERE source_id = ?1 AND absolute_path = ?2",
            params![document.source_id, document.absolute_path],
            |row| row.get(0),
        )
        .optional()?;
    if let Some(old_topic) = old_topic {
        affected_topics.insert(old_topic);
    }
    affected_topics.insert(document.topic_id.clone());

    transaction.execute(
        "INSERT INTO documents(
            id, source_id, topic_id, absolute_path, file_identity, file_name, normalized_name,
            extension, version_label, version_sort_key, size_bytes, created_at, modified_at,
            availability, manual_topic, indexed_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
         ON CONFLICT(source_id, absolute_path) DO UPDATE SET
            topic_id = CASE WHEN documents.manual_topic = 1 THEN documents.topic_id ELSE excluded.topic_id END,
            file_identity = excluded.file_identity,
            file_name = excluded.file_name,
            normalized_name = excluded.normalized_name,
            extension = excluded.extension,
            version_label = excluded.version_label,
            version_sort_key = excluded.version_sort_key,
            size_bytes = excluded.size_bytes,
            created_at = excluded.created_at,
            modified_at = excluded.modified_at,
            availability = excluded.availability,
            manual_topic = MAX(documents.manual_topic, excluded.manual_topic),
            indexed_at = excluded.indexed_at
         ON CONFLICT(id) DO UPDATE SET
            source_id = excluded.source_id,
            topic_id = CASE WHEN documents.manual_topic = 1 THEN documents.topic_id ELSE excluded.topic_id END,
            absolute_path = excluded.absolute_path,
            file_identity = excluded.file_identity,
            file_name = excluded.file_name,
            normalized_name = excluded.normalized_name,
            extension = excluded.extension,
            version_label = excluded.version_label,
            version_sort_key = excluded.version_sort_key,
            size_bytes = excluded.size_bytes,
            created_at = excluded.created_at,
            modified_at = excluded.modified_at,
            availability = excluded.availability,
            manual_topic = MAX(documents.manual_topic, excluded.manual_topic),
            indexed_at = excluded.indexed_at",
        params![
            document.id,
            document.source_id,
            document.topic_id,
            document.absolute_path,
            document.file_identity,
            document.file_name,
            document.normalized_name,
            document.extension,
            document.version_label,
            document.version_sort_key,
            document.size_bytes,
            document.created_at,
            document.modified_at,
            document.availability,
            document.manual_topic,
            document.indexed_at,
        ],
    )?;
    if previous_by_id.is_some() {
        transaction.execute(
            "UPDATE manual_grouping_rules
             SET file_identity = ?2, source_id = ?3, absolute_path = ?4
             WHERE document_id = ?1",
            params![
                document.id,
                document.file_identity,
                document.source_id,
                document.absolute_path,
            ],
        )?;
    }
    Ok(())
}

fn map_document(row: &rusqlite::Row<'_>) -> rusqlite::Result<DocumentRecord> {
    Ok(DocumentRecord {
        id: row.get(0)?,
        source_id: row.get(1)?,
        topic_id: row.get(2)?,
        absolute_path: row.get(3)?,
        file_identity: row.get(4)?,
        file_name: row.get(5)?,
        normalized_name: row.get(6)?,
        extension: row.get(7)?,
        version_label: row.get(8)?,
        version_sort_key: row.get(9)?,
        size_bytes: row.get(10)?,
        created_at: row.get(11)?,
        modified_at: row.get(12)?,
        availability: row.get(13)?,
        manual_topic: row.get(14)?,
        indexed_at: row.get(15)?,
    })
}
