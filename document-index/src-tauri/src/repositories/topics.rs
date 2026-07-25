use rusqlite::{params, OptionalExtension};

use crate::{database::Database, domain::error::DomainError};

use super::TopicRecord;

const MAX_PAGE_SIZE: u32 = 100;

pub struct TopicRepository<'a> {
    database: &'a Database,
}

impl<'a> TopicRepository<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn upsert(&self, topic: &TopicRecord) -> Result<(), DomainError> {
        self.database.transaction(|transaction| {
            transaction.execute(
                "INSERT INTO topics(
                    id, canonical_name, display_name, display_name_manual, grouping_confidence,
                    newest_created_document_id, recently_modified_document_id, created_at, updated_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                 ON CONFLICT(id) DO UPDATE SET
                    canonical_name = excluded.canonical_name,
                    display_name = CASE
                        WHEN topics.display_name_manual = 1 AND excluded.display_name_manual = 0
                        THEN topics.display_name
                        ELSE excluded.display_name
                    END,
                    display_name_manual = MAX(topics.display_name_manual, excluded.display_name_manual),
                    grouping_confidence = excluded.grouping_confidence,
                    updated_at = excluded.updated_at",
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
        })
    }

    pub fn get(&self, id: &str) -> Result<Option<TopicRecord>, DomainError> {
        self.database.read(|connection| {
            connection
                .query_row(
                    "SELECT id, canonical_name, display_name, display_name_manual, grouping_confidence,
                            newest_created_document_id, recently_modified_document_id, created_at, updated_at
                     FROM topics WHERE id = ?1",
                    [id],
                    map_topic,
                )
                .optional()
        })
    }

    pub fn list_page(&self, limit: u32, offset: u32) -> Result<Vec<TopicRecord>, DomainError> {
        let limit = limit.clamp(1, MAX_PAGE_SIZE);
        self.database.read(|connection| {
            let mut statement = connection.prepare(
                "SELECT id, canonical_name, display_name, display_name_manual, grouping_confidence,
                        newest_created_document_id, recently_modified_document_id, created_at, updated_at
                 FROM topics ORDER BY updated_at DESC, id ASC LIMIT ?1 OFFSET ?2",
            )?;
            let topics = statement
                .query_map(params![limit, offset], map_topic)?
                .collect();
            topics
        })
    }

    pub fn rename_manual(
        &self,
        topic_id: &str,
        display_name: &str,
        updated_at: &str,
    ) -> Result<(), DomainError> {
        self.database.transaction(|transaction| {
            transaction.execute(
                "UPDATE topics SET display_name = ?2, display_name_manual = 1,
                         grouping_confidence = 'manual', updated_at = ?3
                 WHERE id = ?1",
                params![topic_id, display_name, updated_at],
            )?;
            Ok(())
        })
    }

    pub fn merge_manual(
        &self,
        source_topic_ids: &[String],
        target_topic_id: &str,
        target_name: &str,
        updated_at: &str,
    ) -> Result<(), DomainError> {
        self.database.transaction(|transaction| {
            merge_topics_transaction(
                transaction,
                source_topic_ids,
                target_topic_id,
                target_name,
                updated_at,
            )?;
            dismiss_related_suggestions(transaction, source_topic_ids, updated_at)?;
            Ok(())
        })
    }

    pub fn merge_suggestion_manual(
        &self,
        suggestion_id: &str,
        source_topic_ids: &[String],
        target_topic_id: &str,
        target_name: &str,
        updated_at: &str,
    ) -> Result<bool, DomainError> {
        self.database.transaction(|transaction| {
            let changed = transaction.execute(
                "UPDATE grouping_suggestions SET status = 'accepted', updated_at = ?2
                 WHERE id = ?1 AND status = 'pending'",
                params![suggestion_id, updated_at],
            )?;
            if changed != 1 {
                return Ok(false);
            }
            merge_topics_transaction(
                transaction,
                source_topic_ids,
                target_topic_id,
                target_name,
                updated_at,
            )?;
            dismiss_related_suggestions(transaction, source_topic_ids, updated_at)?;
            Ok(true)
        })
    }

    pub fn move_documents_manual(
        &self,
        document_ids: &[String],
        target_topic: &TopicRecord,
        target_is_new: bool,
        updated_at: &str,
    ) -> Result<Vec<String>, DomainError> {
        self.database.transaction(|transaction| {
            if target_is_new {
                transaction.execute(
                    "INSERT INTO topics(
                        id, canonical_name, display_name, display_name_manual, grouping_confidence,
                        newest_created_document_id, recently_modified_document_id, created_at, updated_at
                     ) VALUES (?1, ?2, ?3, 1, 'manual', NULL, NULL, ?4, ?5)",
                    params![
                        target_topic.id,
                        target_topic.canonical_name,
                        target_topic.display_name,
                        target_topic.created_at,
                        target_topic.updated_at,
                    ],
                )?;
            } else {
                transaction.execute(
                    "UPDATE topics SET grouping_confidence = 'manual', updated_at = ?2 WHERE id = ?1",
                    params![target_topic.id, updated_at],
                )?;
            }

            let mut affected_topics = std::collections::BTreeSet::new();
            affected_topics.insert(target_topic.id.clone());
            for document_id in document_ids {
                let (old_topic_id, source_id, absolute_path, file_identity) = transaction.query_row(
                    "SELECT topic_id, source_id, absolute_path, file_identity
                     FROM documents WHERE id = ?1",
                    [document_id],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2)?,
                            row.get::<_, Option<String>>(3)?,
                        ))
                    },
                )?;
                affected_topics.insert(old_topic_id);
                transaction.execute(
                    "UPDATE documents SET topic_id = ?2, manual_topic = 1, indexed_at = ?3
                     WHERE id = ?1",
                    params![document_id, target_topic.id, updated_at],
                )?;
                upsert_manual_rule(
                    transaction,
                    document_id,
                    &source_id,
                    &absolute_path,
                    file_identity.as_deref(),
                    &target_topic.id,
                    updated_at,
                )?;
            }

            let mut remaining = Vec::new();
            for topic_id in affected_topics {
                let document_count: i64 = transaction.query_row(
                    "SELECT COUNT(*) FROM documents WHERE topic_id = ?1",
                    [&topic_id],
                    |row| row.get(0),
                )?;
                if document_count == 0 && topic_id != target_topic.id {
                    transaction.execute("DELETE FROM topics WHERE id = ?1", [&topic_id])?;
                } else {
                    refresh_topic_aggregate(transaction, &topic_id)?;
                    remaining.push(topic_id);
                }
            }
            Ok(remaining)
        })
    }
}

fn merge_topics_transaction(
    transaction: &rusqlite::Transaction<'_>,
    source_topic_ids: &[String],
    target_topic_id: &str,
    target_name: &str,
    updated_at: &str,
) -> rusqlite::Result<()> {
    transaction.execute(
        "UPDATE topics SET display_name = ?2, display_name_manual = 1,
                 grouping_confidence = 'manual', updated_at = ?3
         WHERE id = ?1",
        params![target_topic_id, target_name, updated_at],
    )?;
    for source_topic_id in source_topic_ids {
        if source_topic_id == target_topic_id {
            continue;
        }
        assign_topic_documents(transaction, source_topic_id, target_topic_id, updated_at)?;
        transaction.execute("DELETE FROM topics WHERE id = ?1", [source_topic_id])?;
    }
    mark_topic_documents_manual(transaction, target_topic_id, updated_at)?;
    refresh_topic_aggregate(transaction, target_topic_id)
}

fn dismiss_related_suggestions(
    transaction: &rusqlite::Transaction<'_>,
    source_topic_ids: &[String],
    updated_at: &str,
) -> rusqlite::Result<()> {
    let source_topic_ids = source_topic_ids
        .iter()
        .collect::<std::collections::BTreeSet<_>>();
    let mut statement = transaction.prepare(
        "SELECT id, source_topic_ids_json FROM grouping_suggestions WHERE status = 'pending'",
    )?;
    let pending = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(statement);
    for (suggestion_id, topic_ids_json) in pending {
        let topic_ids = serde_json::from_str::<Vec<String>>(&topic_ids_json).map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(
                1,
                rusqlite::types::Type::Text,
                Box::new(error),
            )
        })?;
        if topic_ids
            .iter()
            .any(|topic_id| source_topic_ids.contains(topic_id))
        {
            transaction.execute(
                "UPDATE grouping_suggestions SET status = 'dismissed', updated_at = ?2
                 WHERE id = ?1",
                params![suggestion_id, updated_at],
            )?;
        }
    }
    Ok(())
}

fn assign_topic_documents(
    transaction: &rusqlite::Transaction<'_>,
    source_topic_id: &str,
    target_topic_id: &str,
    updated_at: &str,
) -> rusqlite::Result<()> {
    let mut statement = transaction.prepare(
        "SELECT id, source_id, absolute_path, file_identity FROM documents WHERE topic_id = ?1",
    )?;
    let documents = statement
        .query_map([source_topic_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(statement);
    for (document_id, source_id, absolute_path, file_identity) in documents {
        transaction.execute(
            "UPDATE documents SET topic_id = ?2, manual_topic = 1, indexed_at = ?3 WHERE id = ?1",
            params![document_id, target_topic_id, updated_at],
        )?;
        upsert_manual_rule(
            transaction,
            &document_id,
            &source_id,
            &absolute_path,
            file_identity.as_deref(),
            target_topic_id,
            updated_at,
        )?;
    }
    Ok(())
}

fn mark_topic_documents_manual(
    transaction: &rusqlite::Transaction<'_>,
    topic_id: &str,
    updated_at: &str,
) -> rusqlite::Result<()> {
    let mut statement = transaction.prepare(
        "SELECT id, source_id, absolute_path, file_identity FROM documents WHERE topic_id = ?1",
    )?;
    let documents = statement
        .query_map([topic_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(statement);
    for (document_id, source_id, absolute_path, file_identity) in documents {
        transaction.execute(
            "UPDATE documents SET manual_topic = 1 WHERE id = ?1",
            [&document_id],
        )?;
        upsert_manual_rule(
            transaction,
            &document_id,
            &source_id,
            &absolute_path,
            file_identity.as_deref(),
            topic_id,
            updated_at,
        )?;
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn upsert_manual_rule(
    transaction: &rusqlite::Transaction<'_>,
    document_id: &str,
    source_id: &str,
    absolute_path: &str,
    file_identity: Option<&str>,
    topic_id: &str,
    created_at: &str,
) -> rusqlite::Result<()> {
    transaction.execute(
        "INSERT INTO manual_grouping_rules(
            id, document_id, file_identity, source_id, absolute_path, topic_id, created_at
         ) VALUES ('document:' || ?1, ?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(document_id) WHERE document_id IS NOT NULL DO UPDATE SET
            file_identity = excluded.file_identity,
            source_id = excluded.source_id,
            absolute_path = excluded.absolute_path,
            topic_id = excluded.topic_id,
            created_at = excluded.created_at",
        params![
            document_id,
            file_identity,
            source_id,
            absolute_path,
            topic_id,
            created_at,
        ],
    )?;
    Ok(())
}

fn map_topic(row: &rusqlite::Row<'_>) -> rusqlite::Result<TopicRecord> {
    Ok(TopicRecord {
        id: row.get(0)?,
        canonical_name: row.get(1)?,
        display_name: row.get(2)?,
        display_name_manual: row.get(3)?,
        grouping_confidence: row.get(4)?,
        newest_created_document_id: row.get(5)?,
        recently_modified_document_id: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub(crate) fn refresh_topic_aggregate(
    transaction: &rusqlite::Transaction<'_>,
    topic_id: &str,
) -> rusqlite::Result<()> {
    transaction.execute(
        "UPDATE topics SET
            newest_created_document_id = (
                SELECT id FROM documents
                WHERE topic_id = ?1 AND availability = 'available' AND created_at IS NOT NULL
                ORDER BY created_at DESC, COALESCE(version_sort_key, '') DESC,
                         COALESCE(modified_at, '') DESC, absolute_path ASC, id ASC LIMIT 1
            ),
            recently_modified_document_id = (
                SELECT id FROM documents
                WHERE topic_id = ?1 AND availability = 'available' AND modified_at IS NOT NULL
                ORDER BY modified_at DESC, COALESCE(version_sort_key, '') DESC,
                         COALESCE(created_at, '') DESC, absolute_path ASC, id ASC LIMIT 1
            ),
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?1",
        [topic_id],
    )?;
    Ok(())
}
