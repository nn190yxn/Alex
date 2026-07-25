use std::collections::BTreeSet;

use rusqlite::params;

use crate::{database::Database, domain::error::DomainError};

use super::ExtensionRuleRecord;

pub struct ExtensionRuleRepository<'a> {
    database: &'a Database,
}

impl<'a> ExtensionRuleRepository<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn upsert(&self, rule: &ExtensionRuleRecord) -> Result<(), DomainError> {
        self.database.transaction(|transaction| {
            transaction.execute(
                "INSERT INTO extension_rules(id, extension, built_in, enabled)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(id) DO UPDATE SET
                    extension = excluded.extension,
                    built_in = excluded.built_in,
                    enabled = excluded.enabled",
                params![rule.id, rule.extension, rule.built_in, rule.enabled],
            )?;
            Ok(())
        })
    }

    pub fn list(&self) -> Result<Vec<ExtensionRuleRecord>, DomainError> {
        self.database.read(|connection| {
            let mut statement = connection.prepare(
                "SELECT id, extension, built_in, enabled
                 FROM extension_rules ORDER BY built_in DESC, extension ASC, id ASC",
            )?;
            let rules = statement
                .query_map([], |row| {
                    Ok(ExtensionRuleRecord {
                        id: row.get(0)?,
                        extension: row.get(1)?,
                        built_in: row.get(2)?,
                        enabled: row.get(3)?,
                    })
                })?
                .collect();
            rules
        })
    }

    pub fn replace_enabled(&self, extensions: &BTreeSet<String>) -> Result<(), DomainError> {
        self.database.transaction(|transaction| {
            transaction.execute("UPDATE extension_rules SET enabled = 0", [])?;
            for extension in extensions {
                let id = format!("custom-{extension}");
                transaction.execute(
                    "INSERT INTO extension_rules(id, extension, built_in, enabled)
                     VALUES (?1, ?2, 0, 1)
                     ON CONFLICT(extension) DO UPDATE SET enabled = 1",
                    params![id, extension],
                )?;
            }
            Ok(())
        })
    }
}
