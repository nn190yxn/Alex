use rusqlite::{params, OptionalExtension};

use crate::{database::Database, domain::error::DomainError};

use super::IndexSourceRecord;

pub struct IndexSourceRepository<'a> {
    database: &'a Database,
}

impl<'a> IndexSourceRepository<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn upsert(&self, source: &IndexSourceRecord) -> Result<(), DomainError> {
        self.database.transaction(|transaction| {
            transaction.execute(
                "INSERT INTO index_sources(
                    id, path, display_name, enabled, status, added_at, last_scan_at, last_success_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                 ON CONFLICT(id) DO UPDATE SET
                    path = excluded.path,
                    display_name = excluded.display_name,
                    enabled = excluded.enabled,
                    status = excluded.status,
                    last_scan_at = excluded.last_scan_at,
                    last_success_at = excluded.last_success_at",
                params![
                    source.id,
                    source.path,
                    source.display_name,
                    source.enabled,
                    source.status,
                    source.added_at,
                    source.last_scan_at,
                    source.last_success_at,
                ],
            )?;
            Ok(())
        })
    }

    pub fn list(&self) -> Result<Vec<IndexSourceRecord>, DomainError> {
        self.database.read(|connection| {
            let mut statement = connection.prepare(
                "SELECT id, path, display_name, enabled, status, added_at, last_scan_at, last_success_at
                 FROM index_sources ORDER BY added_at, id",
            )?;
            let sources = statement.query_map([], map_source)?.collect();
            sources
        })
    }

    pub fn get(&self, id: &str) -> Result<Option<IndexSourceRecord>, DomainError> {
        self.database.read(|connection| {
            connection
                .query_row(
                    "SELECT id, path, display_name, enabled, status, added_at, last_scan_at, last_success_at
                     FROM index_sources WHERE id = ?1",
                    [id],
                    map_source,
                )
                .optional()
        })
    }

    pub fn set_enabled(
        &self,
        id: &str,
        enabled: bool,
        enabled_status: &str,
    ) -> Result<Option<IndexSourceRecord>, DomainError> {
        self.database.transaction(|transaction| {
            transaction.execute(
                "UPDATE index_sources
                 SET enabled = ?2, status = CASE WHEN ?2 THEN ?3 ELSE 'paused' END
                 WHERE id = ?1",
                params![id, enabled, enabled_status],
            )?;
            transaction
                .query_row(
                    "SELECT id, path, display_name, enabled, status, added_at, last_scan_at, last_success_at
                     FROM index_sources WHERE id = ?1",
                    [id],
                    map_source,
                )
                .optional()
        })
    }

    pub fn refresh_accessibility(
        &self,
        id: &str,
        accessible: bool,
        preserve_scanning: bool,
    ) -> Result<Option<IndexSourceRecord>, DomainError> {
        self.database.transaction(|transaction| {
            transaction.execute(
                "UPDATE index_sources SET status = CASE
                    WHEN enabled = 0 THEN 'paused'
                    WHEN ?2 = 0 THEN 'unavailable'
                    WHEN status = 'scanning' AND ?3 = 1 THEN 'scanning'
                    ELSE 'ready'
                 END WHERE id = ?1",
                params![id, accessible, preserve_scanning],
            )?;
            transaction
                .query_row(
                    "SELECT id, path, display_name, enabled, status, added_at, last_scan_at, last_success_at
                     FROM index_sources WHERE id = ?1",
                    [id],
                    map_source,
                )
                .optional()
        })
    }

    pub fn update_scan_state(
        &self,
        id: &str,
        enabled_status: &str,
        last_scan_at: Option<&str>,
        last_success_at: Option<&str>,
    ) -> Result<Option<IndexSourceRecord>, DomainError> {
        self.database.transaction(|transaction| {
            transaction.execute(
                "UPDATE index_sources SET
                    status = CASE WHEN enabled = 0 THEN 'paused' ELSE ?2 END,
                    last_scan_at = COALESCE(?3, last_scan_at),
                    last_success_at = COALESCE(?4, last_success_at)
                 WHERE id = ?1",
                params![id, enabled_status, last_scan_at, last_success_at],
            )?;
            transaction
                .query_row(
                    "SELECT id, path, display_name, enabled, status, added_at, last_scan_at, last_success_at
                     FROM index_sources WHERE id = ?1",
                    [id],
                    map_source,
                )
                .optional()
        })
    }

    pub fn list_enabled(&self) -> Result<Vec<IndexSourceRecord>, DomainError> {
        self.database.read(|connection| {
            let mut statement = connection.prepare(
                "SELECT id, path, display_name, enabled, status, added_at, last_scan_at, last_success_at
                 FROM index_sources WHERE enabled = 1 ORDER BY added_at, id",
            )?;
            let sources = statement.query_map([], map_source)?.collect();
            sources
        })
    }
}

fn map_source(row: &rusqlite::Row<'_>) -> rusqlite::Result<IndexSourceRecord> {
    Ok(IndexSourceRecord {
        id: row.get(0)?,
        path: row.get(1)?,
        display_name: row.get(2)?,
        enabled: row.get(3)?,
        status: row.get(4)?,
        added_at: row.get(5)?,
        last_scan_at: row.get(6)?,
        last_success_at: row.get(7)?,
    })
}
