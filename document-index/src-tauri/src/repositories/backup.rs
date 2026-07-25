use rusqlite::params;
use serde::{Deserialize, Serialize};

use crate::{database::Database, domain::error::DomainError};

use super::topics::refresh_topic_aggregate;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupSourceRecord {
    pub id: String,
    pub path: String,
    pub display_name: String,
    pub enabled: bool,
    pub added_at: String,
    pub last_scan_at: Option<String>,
    pub last_success_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupTopicRecord {
    pub id: String,
    pub canonical_name: String,
    pub display_name: String,
    pub display_name_manual: bool,
    pub grouping_confidence: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupDocumentRecord {
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
    pub manual_topic: bool,
    pub indexed_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupManualGroupingRuleRecord {
    pub id: String,
    pub document_id: Option<String>,
    pub file_identity: Option<String>,
    pub source_id: Option<String>,
    pub absolute_path: Option<String>,
    pub topic_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupExtensionRuleRecord {
    pub id: String,
    pub extension: String,
    pub built_in: bool,
    pub enabled: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupData {
    pub index_sources: Vec<BackupSourceRecord>,
    pub topics: Vec<BackupTopicRecord>,
    pub documents: Vec<BackupDocumentRecord>,
    pub manual_grouping_rules: Vec<BackupManualGroupingRuleRecord>,
    pub extension_rules: Vec<BackupExtensionRuleRecord>,
}

pub struct BackupRepository<'a> {
    database: &'a Database,
}

impl<'a> BackupRepository<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn snapshot(&self) -> Result<BackupData, DomainError> {
        self.database.read(|connection| {
            let index_sources = connection
                .prepare("SELECT id, path, display_name, enabled, added_at, last_scan_at, last_success_at FROM index_sources ORDER BY id")?
                .query_map([], |row| Ok(BackupSourceRecord {
                    id: row.get(0)?, path: row.get(1)?, display_name: row.get(2)?, enabled: row.get(3)?,
                    added_at: row.get(4)?, last_scan_at: row.get(5)?, last_success_at: row.get(6)?,
                }))?.collect::<rusqlite::Result<Vec<_>>>()?;
            let topics = connection
                .prepare("SELECT id, canonical_name, display_name, display_name_manual, grouping_confidence, created_at, updated_at FROM topics ORDER BY id")?
                .query_map([], |row| Ok(BackupTopicRecord {
                    id: row.get(0)?, canonical_name: row.get(1)?, display_name: row.get(2)?, display_name_manual: row.get(3)?,
                    grouping_confidence: row.get(4)?, created_at: row.get(5)?, updated_at: row.get(6)?,
                }))?.collect::<rusqlite::Result<Vec<_>>>()?;
            let documents = connection
                .prepare("SELECT id, source_id, topic_id, absolute_path, file_identity, file_name, normalized_name, extension, version_label, version_sort_key, size_bytes, created_at, modified_at, manual_topic, indexed_at FROM documents ORDER BY id")?
                .query_map([], |row| Ok(BackupDocumentRecord {
                    id: row.get(0)?, source_id: row.get(1)?, topic_id: row.get(2)?, absolute_path: row.get(3)?, file_identity: row.get(4)?,
                    file_name: row.get(5)?, normalized_name: row.get(6)?, extension: row.get(7)?, version_label: row.get(8)?,
                    version_sort_key: row.get(9)?, size_bytes: row.get(10)?, created_at: row.get(11)?, modified_at: row.get(12)?,
                    manual_topic: row.get(13)?, indexed_at: row.get(14)?,
                }))?.collect::<rusqlite::Result<Vec<_>>>()?;
            let manual_grouping_rules = connection
                .prepare("SELECT id, document_id, file_identity, source_id, absolute_path, topic_id, created_at FROM manual_grouping_rules ORDER BY id")?
                .query_map([], |row| Ok(BackupManualGroupingRuleRecord {
                    id: row.get(0)?, document_id: row.get(1)?, file_identity: row.get(2)?, source_id: row.get(3)?,
                    absolute_path: row.get(4)?, topic_id: row.get(5)?, created_at: row.get(6)?,
                }))?.collect::<rusqlite::Result<Vec<_>>>()?;
            let extension_rules = connection
                .prepare("SELECT id, extension, built_in, enabled FROM extension_rules ORDER BY id")?
                .query_map([], |row| Ok(BackupExtensionRuleRecord {
                    id: row.get(0)?, extension: row.get(1)?, built_in: row.get(2)?, enabled: row.get(3)?,
                }))?.collect::<rusqlite::Result<Vec<_>>>()?;
            Ok(BackupData { index_sources, topics, documents, manual_grouping_rules, extension_rules })
        })
    }

    pub fn replace(
        &self,
        data: &BackupData,
        source_statuses: &[String],
        document_statuses: &[String],
    ) -> Result<(), DomainError> {
        self.database.transaction(|transaction| {
            transaction.execute("DELETE FROM scan_errors", [])?;
            transaction.execute("DELETE FROM scan_runs", [])?;
            transaction.execute("DELETE FROM grouping_suggestions", [])?;
            transaction.execute("DELETE FROM manual_grouping_rules", [])?;
            transaction.execute("DELETE FROM documents", [])?;
            transaction.execute("DELETE FROM topics", [])?;
            transaction.execute("DELETE FROM index_sources", [])?;
            transaction.execute("DELETE FROM extension_rules", [])?;

            for (source, status) in data.index_sources.iter().zip(source_statuses) {
                transaction.execute(
                    "INSERT INTO index_sources(id, path, display_name, enabled, status, added_at, last_scan_at, last_success_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![source.id, source.path, source.display_name, source.enabled, status, source.added_at, source.last_scan_at, source.last_success_at],
                )?;
            }
            for topic in &data.topics {
                transaction.execute(
                    "INSERT INTO topics(id, canonical_name, display_name, display_name_manual, grouping_confidence, newest_created_document_id, recently_modified_document_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, NULL, NULL, ?6, ?7)",
                    params![topic.id, topic.canonical_name, topic.display_name, topic.display_name_manual, topic.grouping_confidence, topic.created_at, topic.updated_at],
                )?;
            }
            for (document, availability) in data.documents.iter().zip(document_statuses) {
                transaction.execute(
                    "INSERT INTO documents(id, source_id, topic_id, absolute_path, file_identity, file_name, normalized_name, extension, version_label, version_sort_key, size_bytes, created_at, modified_at, availability, manual_topic, indexed_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
                    params![document.id, document.source_id, document.topic_id, document.absolute_path, document.file_identity, document.file_name, document.normalized_name, document.extension, document.version_label, document.version_sort_key, document.size_bytes, document.created_at, document.modified_at, availability, document.manual_topic, document.indexed_at],
                )?;
            }
            for rule in &data.manual_grouping_rules {
                transaction.execute(
                    "INSERT INTO manual_grouping_rules(id, document_id, file_identity, source_id, absolute_path, topic_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![rule.id, rule.document_id, rule.file_identity, rule.source_id, rule.absolute_path, rule.topic_id, rule.created_at],
                )?;
            }
            for rule in &data.extension_rules {
                transaction.execute(
                    "INSERT INTO extension_rules(id, extension, built_in, enabled) VALUES (?1, ?2, ?3, ?4)",
                    params![rule.id, rule.extension, rule.built_in, rule.enabled],
                )?;
            }
            for topic in &data.topics {
                refresh_topic_aggregate(transaction, &topic.id)?;
            }
            transaction.execute("DELETE FROM topic_search", [])?;
            transaction.execute(
                "INSERT INTO topic_search(document_id, topic_id, topic_name, file_name, normalized_name, absolute_path) SELECT d.id, d.topic_id, t.display_name, d.file_name, d.normalized_name, d.absolute_path FROM documents d JOIN topics t ON t.id = d.topic_id",
                [],
            )?;
            Ok(())
        })
    }
}
