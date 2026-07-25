use rusqlite::{params, OptionalExtension};

use crate::{database::Database, domain::error::DomainError};

use super::{DocumentRecord, GroupingSuggestionRecord, TopicRecord};

pub struct GroupingRepository<'a> {
    database: &'a Database,
}

impl<'a> GroupingRepository<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn find_candidates(
        &self,
        normalized_name: &str,
        keyword: &str,
        limit: u32,
    ) -> Result<Vec<(TopicRecord, DocumentRecord)>, DomainError> {
        self.database.read(|connection| {
            let mut statement = connection.prepare(
                "SELECT
                    t.id, t.canonical_name, t.display_name, t.display_name_manual,
                    t.grouping_confidence, t.newest_created_document_id,
                    t.recently_modified_document_id, t.created_at, t.updated_at,
                    d.id, d.source_id, d.topic_id, d.absolute_path, d.file_identity,
                    d.file_name, d.normalized_name, d.extension, d.version_label,
                    d.version_sort_key, d.size_bytes, d.created_at, d.modified_at,
                    d.availability, d.manual_topic, d.indexed_at
                 FROM documents d
                 JOIN topics t ON t.id = d.topic_id
                 WHERE d.availability = 'available'
                   AND (d.normalized_name = ?1 OR (?2 <> '' AND d.normalized_name LIKE '%' || ?2 || '%'))
                 ORDER BY d.manual_topic DESC, t.display_name_manual DESC, d.absolute_path, d.id
                 LIMIT ?3",
            )?;
            let candidates = statement
                .query_map(params![normalized_name, keyword, limit.clamp(1, 200)], |row| {
                    Ok((
                        TopicRecord {
                            id: row.get(0)?,
                            canonical_name: row.get(1)?,
                            display_name: row.get(2)?,
                            display_name_manual: row.get(3)?,
                            grouping_confidence: row.get(4)?,
                            newest_created_document_id: row.get(5)?,
                            recently_modified_document_id: row.get(6)?,
                            created_at: row.get(7)?,
                            updated_at: row.get(8)?,
                        },
                        DocumentRecord {
                            id: row.get(9)?,
                            source_id: row.get(10)?,
                            topic_id: row.get(11)?,
                            absolute_path: row.get(12)?,
                            file_identity: row.get(13)?,
                            file_name: row.get(14)?,
                            normalized_name: row.get(15)?,
                            extension: row.get(16)?,
                            version_label: row.get(17)?,
                            version_sort_key: row.get(18)?,
                            size_bytes: row.get(19)?,
                            created_at: row.get(20)?,
                            modified_at: row.get(21)?,
                            availability: row.get(22)?,
                            manual_topic: row.get(23)?,
                            indexed_at: row.get(24)?,
                        },
                    ))
                })?
                .collect();
            candidates
        })
    }

    pub fn list_pending_suggestions(
        &self,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<GroupingSuggestionRecord>, u64), DomainError> {
        let page = page.max(1);
        let page_size = page_size.clamp(1, 100);
        let offset = u64::from(page - 1) * u64::from(page_size);
        let (rows, total) = self.database.read(|connection| {
            let total = connection.query_row(
                "SELECT COUNT(*) FROM grouping_suggestions WHERE status = 'pending'",
                [],
                |row| row.get::<_, u64>(0),
            )?;
            let mut statement = connection.prepare(
                "SELECT id, source_topic_ids_json, proposed_display_name, confidence,
                        score, evidence_json, status, created_at, updated_at
                 FROM grouping_suggestions WHERE status = 'pending'
                 ORDER BY score DESC, updated_at DESC, id ASC LIMIT ?1 OFFSET ?2",
            )?;
            let rows = statement
                .query_map(params![page_size, offset], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, f64>(4)?,
                        row.get::<_, String>(5)?,
                        row.get::<_, String>(6)?,
                        row.get::<_, String>(7)?,
                        row.get::<_, String>(8)?,
                    ))
                })?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            Ok((rows, total))
        })?;
        let suggestions = rows
            .into_iter()
            .map(map_suggestion_record)
            .collect::<Result<Vec<_>, DomainError>>()?;
        Ok((suggestions, total))
    }

    pub fn get_suggestion(
        &self,
        suggestion_id: &str,
    ) -> Result<Option<GroupingSuggestionRecord>, DomainError> {
        let row = self.database.read(|connection| {
            connection
                .query_row(
                    "SELECT id, source_topic_ids_json, proposed_display_name, confidence,
                            score, evidence_json, status, created_at, updated_at
                     FROM grouping_suggestions WHERE id = ?1",
                    [suggestion_id],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2)?,
                            row.get::<_, String>(3)?,
                            row.get::<_, f64>(4)?,
                            row.get::<_, String>(5)?,
                            row.get::<_, String>(6)?,
                            row.get::<_, String>(7)?,
                            row.get::<_, String>(8)?,
                        ))
                    },
                )
                .optional()
        })?;
        row.map(map_suggestion_record).transpose()
    }

    pub fn dismiss_pending_suggestion(
        &self,
        suggestion_id: &str,
        updated_at: &str,
    ) -> Result<bool, DomainError> {
        self.database.transaction(|transaction| {
            let changed = transaction.execute(
                "UPDATE grouping_suggestions SET status = 'dismissed', updated_at = ?2
                 WHERE id = ?1 AND status = 'pending'",
                params![suggestion_id, updated_at],
            )?;
            Ok(changed == 1)
        })
    }
}

type SuggestionRow = (
    String,
    String,
    String,
    String,
    f64,
    String,
    String,
    String,
    String,
);

fn map_suggestion_record(row: SuggestionRow) -> Result<GroupingSuggestionRecord, DomainError> {
    Ok(GroupingSuggestionRecord {
        id: row.0,
        source_topic_ids: serde_json::from_str(&row.1).map_err(|_| structured_data_error())?,
        proposed_display_name: row.2,
        confidence: row.3,
        score: row.4,
        evidence: serde_json::from_str(&row.5).map_err(|_| structured_data_error())?,
        status: row.6,
        created_at: row.7,
        updated_at: row.8,
    })
}

fn structured_data_error() -> DomainError {
    DomainError {
        code: crate::domain::error::ErrorCode::DatabaseError,
        message: "The local metadata database contains invalid grouping evidence.".into(),
        field: None,
    }
}
