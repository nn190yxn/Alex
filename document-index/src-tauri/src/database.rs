use std::{path::Path, sync::Mutex, time::Duration};

use rusqlite::{Connection, Transaction};

use crate::domain::error::{DomainError, ErrorCode};

struct Migration {
    version: i64,
    name: &'static str,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "initial_schema",
        sql: include_str!("../migrations/0001_initial_schema.sql"),
    },
    Migration {
        version: 2,
        name: "topic_search_fts5",
        sql: include_str!("../migrations/0002_topic_search_fts5.sql"),
    },
    Migration {
        version: 3,
        name: "grouping_candidates",
        sql: include_str!("../migrations/0003_grouping_candidates.sql"),
    },
    Migration {
        version: 4,
        name: "file_identity_lookup",
        sql: include_str!("../migrations/0004_file_identity_lookup.sql"),
    },
];

pub struct Database {
    connection: Mutex<Connection>,
}

impl Database {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, DomainError> {
        let mut connection = Connection::open(path).map_err(database_error)?;
        configure_connection(&connection).map_err(database_error)?;
        run_migrations(&mut connection).map_err(database_error)?;
        Ok(Self {
            connection: Mutex::new(connection),
        })
    }

    pub fn open_in_memory() -> Result<Self, DomainError> {
        let mut connection = Connection::open_in_memory().map_err(database_error)?;
        configure_connection(&connection).map_err(database_error)?;
        run_migrations(&mut connection).map_err(database_error)?;
        Ok(Self {
            connection: Mutex::new(connection),
        })
    }

    pub fn read<T>(
        &self,
        operation: impl FnOnce(&Connection) -> rusqlite::Result<T>,
    ) -> Result<T, DomainError> {
        let connection = self.connection.lock().map_err(lock_error)?;
        operation(&connection).map_err(database_error)
    }

    pub fn transaction<T>(
        &self,
        operation: impl FnOnce(&Transaction<'_>) -> rusqlite::Result<T>,
    ) -> Result<T, DomainError> {
        let mut connection = self.connection.lock().map_err(lock_error)?;
        let transaction = connection.transaction().map_err(database_error)?;
        let value = operation(&transaction).map_err(database_error)?;
        transaction.commit().map_err(database_error)?;
        Ok(value)
    }

    pub fn migration_count(&self) -> Result<u64, DomainError> {
        self.read(|connection| {
            connection.query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| {
                row.get(0)
            })
        })
    }
}

fn configure_connection(connection: &Connection) -> rusqlite::Result<()> {
    connection.pragma_update(None, "foreign_keys", "ON")?;
    connection.busy_timeout(Duration::from_secs(5))?;
    connection.pragma_update(None, "journal_mode", "WAL")?;
    Ok(())
}

fn run_migrations(connection: &mut Connection) -> rusqlite::Result<()> {
    connection.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );",
    )?;

    let transaction = connection.transaction()?;
    for migration in MIGRATIONS {
        let applied: bool = transaction.query_row(
            "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = ?1)",
            [migration.version],
            |row| row.get(0),
        )?;
        if applied {
            continue;
        }

        transaction.execute_batch(migration.sql)?;
        transaction.execute(
            "INSERT INTO schema_migrations(version, name, applied_at)
             VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
            (migration.version, migration.name),
        )?;
    }
    transaction.commit()
}

fn database_error(_: rusqlite::Error) -> DomainError {
    DomainError {
        code: ErrorCode::DatabaseError,
        message: "The local metadata database operation failed.".into(),
        field: None,
    }
}

fn lock_error<T>(_: std::sync::PoisonError<T>) -> DomainError {
    DomainError {
        code: ErrorCode::DatabaseError,
        message: "The local metadata database is temporarily unavailable.".into(),
        field: None,
    }
}
