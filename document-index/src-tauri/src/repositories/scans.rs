use rusqlite::{params, OptionalExtension};

use crate::{database::Database, domain::error::DomainError};

use super::{IndexStatusRecord, ScanErrorRecord, ScanRunRecord};

pub struct ScanRepository<'a> {
    database: &'a Database,
}

impl<'a> ScanRepository<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn upsert_run(&self, run: &ScanRunRecord) -> Result<(), DomainError> {
        let source_ids_json =
            serde_json::to_string(&run.source_ids).map_err(|_| serialization_error())?;
        self.database.transaction(|transaction| {
            transaction.execute(
                "INSERT INTO scan_runs(
                    id, source_ids_json, status, cursor_path, started_at, completed_at,
                    discovered_count, processed_count, topic_count, suggestion_count, failure_count, error_summary
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
                 ON CONFLICT(id) DO UPDATE SET
                    source_ids_json = excluded.source_ids_json,
                    status = excluded.status,
                    cursor_path = excluded.cursor_path,
                    started_at = excluded.started_at,
                    completed_at = excluded.completed_at,
                    discovered_count = excluded.discovered_count,
                    processed_count = excluded.processed_count,
                    topic_count = excluded.topic_count,
                    suggestion_count = excluded.suggestion_count,
                    failure_count = excluded.failure_count,
                    error_summary = excluded.error_summary",
                params![
                    run.id,
                    source_ids_json,
                    run.status,
                    run.cursor_path,
                    run.started_at,
                    run.completed_at,
                    run.discovered_count,
                    run.processed_count,
                    run.topic_count,
                    run.suggestion_count,
                    run.failure_count,
                    run.error_summary,
                ],
            )?;
            Ok(())
        })
    }

    pub fn get_run(&self, id: &str) -> Result<Option<ScanRunRecord>, DomainError> {
        let row = self.database.read(|connection| {
            connection
                .query_row(
                    "SELECT id, source_ids_json, status, cursor_path, started_at, completed_at,
                            discovered_count, processed_count, topic_count, suggestion_count, failure_count, error_summary
                     FROM scan_runs WHERE id = ?1",
                    [id],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2)?,
                            row.get::<_, Option<String>>(3)?,
                            row.get::<_, Option<String>>(4)?,
                            row.get::<_, Option<String>>(5)?,
                            row.get::<_, i64>(6)?,
                            row.get::<_, i64>(7)?,
                            row.get::<_, i64>(8)?,
                            row.get::<_, i64>(9)?,
                            row.get::<_, i64>(10)?,
                            row.get::<_, Option<String>>(11)?,
                        ))
                    },
                )
                .optional()
        })?;

        row.map(|row| {
            let source_ids = serde_json::from_str(&row.1).map_err(|_| serialization_error())?;
            Ok(ScanRunRecord {
                id: row.0,
                source_ids,
                status: row.2,
                cursor_path: row.3,
                started_at: row.4,
                completed_at: row.5,
                discovered_count: row.6,
                processed_count: row.7,
                topic_count: row.8,
                suggestion_count: row.9,
                failure_count: row.10,
                error_summary: row.11,
            })
        })
        .transpose()
    }

    pub fn add_error(&self, error: &ScanErrorRecord) -> Result<i64, DomainError> {
        self.database.transaction(|transaction| {
            transaction.execute(
                "INSERT INTO scan_errors(scan_id, path, error_type, occurred_at, retry_status)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    error.scan_id,
                    error.path,
                    error.error_type,
                    error.occurred_at,
                    error.retry_status
                ],
            )?;
            Ok(transaction.last_insert_rowid())
        })
    }

    pub fn list_errors(&self, scan_id: &str) -> Result<Vec<ScanErrorRecord>, DomainError> {
        self.database.read(|connection| {
            let mut statement = connection.prepare(
                "SELECT id, scan_id, path, error_type, occurred_at, retry_status
                 FROM scan_errors WHERE scan_id = ?1 ORDER BY id",
            )?;
            let errors = statement
                .query_map([scan_id], |row| {
                    Ok(ScanErrorRecord {
                        id: row.get(0)?,
                        scan_id: row.get(1)?,
                        path: row.get(2)?,
                        error_type: row.get(3)?,
                        occurred_at: row.get(4)?,
                        retry_status: row.get(5)?,
                    })
                })?
                .collect();
            errors
        })
    }

    pub fn list_latest_errors(&self) -> Result<Vec<ScanErrorRecord>, DomainError> {
        let scan_id = self.database.read(|connection| {
            connection
                .query_row(
                    "SELECT id FROM scan_runs
                     ORDER BY CASE WHEN status IN ('queued', 'running') THEN 0 ELSE 1 END,
                              COALESCE(completed_at, started_at, '') DESC,
                              id DESC
                     LIMIT 1",
                    [],
                    |row| row.get::<_, String>(0),
                )
                .optional()
        })?;

        match scan_id {
            Some(scan_id) => self.list_errors(&scan_id),
            None => Ok(Vec::new()),
        }
    }

    pub fn list_unfinished(&self) -> Result<Vec<ScanRunRecord>, DomainError> {
        let rows = self.database.read(|connection| {
            let mut statement = connection.prepare(
                "SELECT id, source_ids_json, status, cursor_path, started_at, completed_at,
                        discovered_count, processed_count, topic_count, suggestion_count, failure_count, error_summary
                 FROM scan_runs WHERE status IN ('queued', 'running') ORDER BY started_at, id",
            )?;
            let rows = statement
                .query_map([], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, Option<String>>(4)?,
                        row.get::<_, Option<String>>(5)?,
                        row.get::<_, i64>(6)?,
                        row.get::<_, i64>(7)?,
                        row.get::<_, i64>(8)?,
                        row.get::<_, i64>(9)?,
                        row.get::<_, i64>(10)?,
                        row.get::<_, Option<String>>(11)?,
                    ))
                })?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            Ok(rows)
        })?;

        rows.into_iter()
            .map(|row| {
                let source_ids = serde_json::from_str(&row.1).map_err(|_| serialization_error())?;
                Ok(ScanRunRecord {
                    id: row.0,
                    source_ids,
                    status: row.2,
                    cursor_path: row.3,
                    started_at: row.4,
                    completed_at: row.5,
                    discovered_count: row.6,
                    processed_count: row.7,
                    topic_count: row.8,
                    suggestion_count: row.9,
                    failure_count: row.10,
                    error_summary: row.11,
                })
            })
            .collect()
    }

    pub fn index_status(&self) -> Result<IndexStatusRecord, DomainError> {
        self.database.read(|connection| {
            let latest_run = connection
                .query_row(
                    "SELECT status, discovered_count, processed_count, failure_count
                     FROM scan_runs
                     ORDER BY CASE WHEN status IN ('queued', 'running') THEN 0 ELSE 1 END,
                              COALESCE(completed_at, started_at, '') DESC,
                              id DESC
                     LIMIT 1",
                    [],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, i64>(1)?,
                            row.get::<_, i64>(2)?,
                            row.get::<_, i64>(3)?,
                        ))
                    },
                )
                .optional()?;
            let (scan_status, discovered_count, processed_count, failure_count) = latest_run
                .map(|run| (Some(run.0), run.1, run.2, run.3))
                .unwrap_or((None, 0, 0, 0));

            Ok(IndexStatusRecord {
                scan_status,
                discovered_count,
                processed_count,
                document_count: connection.query_row(
                    "SELECT COUNT(*) FROM documents WHERE availability = 'available'",
                    [],
                    |row| row.get(0),
                )?,
                topic_count: connection.query_row(
                    "SELECT COUNT(DISTINCT topic_id) FROM documents WHERE availability = 'available'",
                    [],
                    |row| row.get(0),
                )?,
                suggestion_count: connection.query_row(
                    "SELECT COUNT(*) FROM grouping_suggestions WHERE status = 'pending'",
                    [],
                    |row| row.get(0),
                )?,
                failure_count,
                last_completed_at: connection.query_row(
                    "SELECT MAX(completed_at) FROM scan_runs WHERE status = 'completed'",
                    [],
                    |row| row.get(0),
                )?,
            })
        })
    }
}

fn serialization_error() -> crate::domain::error::DomainError {
    crate::domain::error::DomainError {
        code: crate::domain::error::ErrorCode::DatabaseError,
        message: "The local metadata database contains invalid structured data.".into(),
        field: None,
    }
}
