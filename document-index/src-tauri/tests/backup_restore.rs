use std::fs;

use document_index_core::{
    database::Database,
    repositories::{
        DocumentRecord, DocumentRepository, ExtensionRuleRecord, ExtensionRuleRepository,
        IndexSourceRecord, IndexSourceRepository, SearchRepository, TopicRecord, TopicRepository,
    },
    services::{BackupPreferences, BackupService},
    ErrorCode,
};
use serde_json::{json, Value};
use tempfile::TempDir;

fn open_database(directory: &TempDir, name: &str) -> Database {
    Database::open(directory.path().join(name)).expect("database should open")
}

fn seed_index(database: &Database, source_path: &std::path::Path) {
    IndexSourceRepository::new(database)
        .upsert(&IndexSourceRecord {
            id: "source-a".into(),
            path: source_path.to_string_lossy().into_owned(),
            display_name: "Archive".into(),
            enabled: true,
            status: "ready".into(),
            added_at: "2026-07-24T08:00:00Z".into(),
            last_scan_at: Some("2026-07-24T09:00:00Z".into()),
            last_success_at: Some("2026-07-24T09:00:00Z".into()),
        })
        .unwrap();
    TopicRepository::new(database)
        .upsert(&TopicRecord {
            id: "topic-a".into(),
            canonical_name: "plan".into(),
            display_name: "Plan".into(),
            display_name_manual: true,
            grouping_confidence: "manual".into(),
            newest_created_document_id: None,
            recently_modified_document_id: None,
            created_at: "2026-07-24T08:00:00Z".into(),
            updated_at: "2026-07-24T08:00:00Z".into(),
        })
        .unwrap();
    let first_path = source_path.join("Plan-v1.txt");
    let second_path = source_path.join("Plan-v2.txt");
    fs::write(&first_path, "SECRET_BODY_NOT_FOR_BACKUP").unwrap();
    fs::write(&second_path, "second body").unwrap();
    DocumentRepository::new(database)
        .upsert_batch(&[
            document(
                "document-created",
                &first_path,
                "2026-07-24T12:00:00Z",
                "2026-07-24T12:30:00Z",
                "2",
            ),
            document(
                "document-modified",
                &second_path,
                "2026-07-23T12:00:00Z",
                "2026-07-24T15:00:00Z",
                "1",
            ),
        ])
        .unwrap();
    database
        .transaction(|transaction| {
            transaction.execute(
                "INSERT INTO manual_grouping_rules(id, document_id, file_identity, source_id, absolute_path, topic_id, created_at) VALUES ('rule-a', 'document-created', 'identity-document-created', 'source-a', ?1, 'topic-a', '2026-07-24T10:00:00Z')",
                [first_path.to_string_lossy().as_ref()],
            )?;
            Ok(())
        })
        .unwrap();
    ExtensionRuleRepository::new(database)
        .upsert(&ExtensionRuleRecord {
            id: "custom-log".into(),
            extension: "log".into(),
            built_in: false,
            enabled: true,
        })
        .unwrap();
}

fn document(
    id: &str,
    path: &std::path::Path,
    created_at: &str,
    modified_at: &str,
    version: &str,
) -> DocumentRecord {
    DocumentRecord {
        id: id.into(),
        source_id: "source-a".into(),
        topic_id: "topic-a".into(),
        absolute_path: path.to_string_lossy().into_owned(),
        file_identity: Some(format!("identity-{id}")),
        file_name: path.file_name().unwrap().to_string_lossy().into_owned(),
        normalized_name: "Plan".into(),
        extension: "txt".into(),
        version_label: Some(format!("v{version}")),
        version_sort_key: Some(version.into()),
        size_bytes: 64,
        created_at: Some(created_at.into()),
        modified_at: Some(modified_at.into()),
        availability: "available".into(),
        manual_topic: true,
        indexed_at: "2026-07-24T16:00:00Z".into(),
    }
}

fn preferences() -> BackupPreferences {
    BackupPreferences {
        default_time_dimension: "createdAt".into(),
        theme: "minimal".into(),
        workspace_split: 57.0,
    }
}

#[test]
fn complete_round_trip_uses_a_metadata_whitelist_and_rebuilds_derived_indexes() {
    let directory = tempfile::tempdir().unwrap();
    let source_path = directory.path().join("archive");
    fs::create_dir(&source_path).unwrap();
    let original = open_database(&directory, "original.sqlite3");
    seed_index(&original, &source_path);
    let backup_path = directory.path().join("index.json");

    let exported = BackupService::new(&original)
        .export(backup_path.to_str().unwrap(), preferences())
        .unwrap();
    assert_eq!(
        (
            exported.source_count,
            exported.topic_count,
            exported.document_count
        ),
        (1, 1, 2)
    );
    let text = fs::read_to_string(&backup_path).unwrap();
    assert!(!text.contains("SECRET_BODY_NOT_FOR_BACKUP"));
    for excluded in [
        "preview",
        "scanRuns",
        "scanErrors",
        "groupingSuggestions",
        "originalFiles",
    ] {
        assert!(!text.contains(excluded));
    }
    let value: Value = serde_json::from_str(&text).unwrap();
    assert_keys(
        &value,
        &["data", "exportedAt", "format", "preferences", "version"],
    );
    assert_keys(
        &value["data"],
        &[
            "documents",
            "extensionRules",
            "indexSources",
            "manualGroupingRules",
            "topics",
        ],
    );
    assert_keys(
        &value["data"]["documents"][0],
        &[
            "absolutePath",
            "createdAt",
            "extension",
            "fileIdentity",
            "fileName",
            "id",
            "indexedAt",
            "manualTopic",
            "modifiedAt",
            "normalizedName",
            "sizeBytes",
            "sourceId",
            "topicId",
            "versionLabel",
            "versionSortKey",
        ],
    );

    let restored = open_database(&directory, "restored.sqlite3");
    let result = BackupService::new(&restored)
        .restore(backup_path.to_str().unwrap())
        .unwrap();
    assert_eq!(result.preferences, preferences());
    assert_eq!(
        IndexSourceRepository::new(&restored)
            .get("source-a")
            .unwrap()
            .unwrap()
            .status,
        "ready"
    );
    let topic = TopicRepository::new(&restored)
        .get("topic-a")
        .unwrap()
        .unwrap();
    assert_eq!(
        topic.newest_created_document_id.as_deref(),
        Some("document-created")
    );
    assert_eq!(
        topic.recently_modified_document_id.as_deref(),
        Some("document-modified")
    );
    assert_eq!(
        SearchRepository::new(&restored)
            .search_topic_ids("Plan*", 10, 0)
            .unwrap(),
        vec!["topic-a"]
    );
    let counts = restored
        .read(|connection| {
            Ok((
                connection.query_row("SELECT COUNT(*) FROM manual_grouping_rules", [], |row| {
                    row.get::<_, i64>(0)
                })?,
                connection.query_row(
                    "SELECT COUNT(*) FROM extension_rules WHERE id = 'custom-log' AND enabled = 1",
                    [],
                    |row| row.get::<_, i64>(0),
                )?,
            ))
        })
        .unwrap();
    assert_eq!(counts, (1, 1));
}

#[test]
fn invalid_json_unsupported_versions_and_inconsistent_references_are_rejected() {
    let directory = tempfile::tempdir().unwrap();
    let database = open_database(&directory, "index.sqlite3");
    let path = directory.path().join("backup.json");
    fs::write(&path, b"{broken").unwrap();
    assert_eq!(
        BackupService::new(&database)
            .restore(path.to_str().unwrap())
            .unwrap_err()
            .code,
        ErrorCode::InvalidInput
    );

    fs::write(&path, serde_json::to_vec(&empty_backup(99)).unwrap()).unwrap();
    assert_eq!(
        BackupService::new(&database)
            .restore(path.to_str().unwrap())
            .unwrap_err()
            .code,
        ErrorCode::InvalidInput
    );

    let mut inconsistent = empty_backup(1);
    inconsistent["data"]["documents"] = json!([{
        "id": "document-a", "sourceId": "missing-source", "topicId": "missing-topic",
        "absolutePath": "/missing/document.txt", "fileIdentity": null, "fileName": "document.txt",
        "normalizedName": "document", "extension": "txt", "versionLabel": null,
        "versionSortKey": null, "sizeBytes": 1, "createdAt": null, "modifiedAt": null,
        "manualTopic": false, "indexedAt": "2026-07-24T08:00:00Z"
    }]);
    fs::write(&path, serde_json::to_vec(&inconsistent).unwrap()).unwrap();
    assert_eq!(
        BackupService::new(&database)
            .restore(path.to_str().unwrap())
            .unwrap_err()
            .code,
        ErrorCode::InvalidInput
    );
}

#[test]
fn historical_backups_without_a_theme_restore_to_parchment() {
    let directory = tempfile::tempdir().unwrap();
    let database = open_database(&directory, "index.sqlite3");
    let path = directory.path().join("historical.json");
    let mut backup = empty_backup(1);
    backup["preferences"]
        .as_object_mut()
        .unwrap()
        .remove("theme");
    fs::write(&path, serde_json::to_vec(&backup).unwrap()).unwrap();

    let restored = BackupService::new(&database)
        .restore(path.to_str().unwrap())
        .unwrap();

    assert_eq!(restored.preferences.theme, "parchment");
}

#[test]
fn backups_with_unknown_themes_are_rejected_before_replacement() {
    let directory = tempfile::tempdir().unwrap();
    let source_path = directory.path().join("archive");
    fs::create_dir(&source_path).unwrap();
    let database = open_database(&directory, "index.sqlite3");
    seed_index(&database, &source_path);
    let path = directory.path().join("unknown-theme.json");
    let mut backup = empty_backup(1);
    backup["preferences"]["theme"] = json!("neon");
    fs::write(&path, serde_json::to_vec(&backup).unwrap()).unwrap();

    let error = BackupService::new(&database)
        .restore(path.to_str().unwrap())
        .unwrap_err();

    assert_eq!(error.code, ErrorCode::InvalidInput);
    assert_eq!(error.field.as_deref(), Some("preferences.theme"));
    assert!(IndexSourceRepository::new(&database)
        .get("source-a")
        .unwrap()
        .is_some());
}

#[test]
fn restore_rolls_back_the_entire_replacement_when_sqlite_rejects_a_write() {
    let directory = tempfile::tempdir().unwrap();
    let source_path = directory.path().join("archive");
    fs::create_dir(&source_path).unwrap();
    let database = open_database(&directory, "index.sqlite3");
    seed_index(&database, &source_path);
    let backup_path = directory.path().join("backup.json");
    BackupService::new(&database)
        .export(backup_path.to_str().unwrap(), preferences())
        .unwrap();
    database.read(|connection| connection.execute_batch(
        "CREATE TRIGGER reject_backup_source BEFORE INSERT ON index_sources BEGIN SELECT RAISE(ABORT, 'forced restore failure'); END;"
    )).unwrap();

    assert_eq!(
        BackupService::new(&database)
            .restore(backup_path.to_str().unwrap())
            .unwrap_err()
            .code,
        ErrorCode::DatabaseError
    );
    assert!(IndexSourceRepository::new(&database)
        .get("source-a")
        .unwrap()
        .is_some());
    assert!(TopicRepository::new(&database)
        .get("topic-a")
        .unwrap()
        .is_some());
    assert_eq!(
        SearchRepository::new(&database)
            .search_topic_ids("Plan*", 10, 0)
            .unwrap(),
        vec!["topic-a"]
    );
}

#[test]
fn restore_revalidates_offline_sources_and_missing_documents() {
    let directory = tempfile::tempdir().unwrap();
    let available_source = directory.path().join("available");
    fs::create_dir(&available_source).unwrap();
    let missing_path = available_source.join("missing.txt");
    let offline_source = directory.path().join("offline");
    let offline_document = offline_source.join("offline.txt");
    let mut backup = empty_backup(1);
    backup["data"]["indexSources"] = json!([
        source_json("source-available", &available_source),
        source_json("source-offline", &offline_source),
    ]);
    backup["data"]["topics"] = json!([topic_json("topic-missing"), topic_json("topic-offline")]);
    backup["data"]["documents"] = json!([
        document_json(
            "document-missing",
            "source-available",
            "topic-missing",
            &missing_path
        ),
        document_json(
            "document-offline",
            "source-offline",
            "topic-offline",
            &offline_document
        ),
    ]);
    let backup_path = directory.path().join("backup.json");
    fs::write(&backup_path, serde_json::to_vec(&backup).unwrap()).unwrap();
    let database = open_database(&directory, "index.sqlite3");

    BackupService::new(&database)
        .restore(backup_path.to_str().unwrap())
        .unwrap();
    assert_eq!(
        IndexSourceRepository::new(&database)
            .get("source-offline")
            .unwrap()
            .unwrap()
            .status,
        "unavailable"
    );
    assert_eq!(
        DocumentRepository::new(&database)
            .get("document-missing")
            .unwrap()
            .unwrap()
            .availability,
        "missing"
    );
    assert_eq!(
        DocumentRepository::new(&database)
            .get("document-offline")
            .unwrap()
            .unwrap()
            .availability,
        "inaccessible"
    );
}

#[test]
fn restore_keeps_documents_available_for_accessible_paused_sources() {
    let directory = tempfile::tempdir().unwrap();
    let source_path = directory.path().join("paused");
    fs::create_dir(&source_path).unwrap();
    let document_path = source_path.join("available.txt");
    fs::write(&document_path, "metadata only").unwrap();
    let mut backup = empty_backup(1);
    let mut source = source_json("source-paused", &source_path);
    source["enabled"] = json!(false);
    backup["data"]["indexSources"] = json!([source]);
    backup["data"]["topics"] = json!([topic_json("topic-paused")]);
    backup["data"]["documents"] = json!([document_json(
        "document-available",
        "source-paused",
        "topic-paused",
        &document_path
    )]);
    let backup_path = directory.path().join("backup.json");
    fs::write(&backup_path, serde_json::to_vec(&backup).unwrap()).unwrap();
    let database = open_database(&directory, "index.sqlite3");

    BackupService::new(&database)
        .restore(backup_path.to_str().unwrap())
        .unwrap();

    assert_eq!(
        IndexSourceRepository::new(&database)
            .get("source-paused")
            .unwrap()
            .unwrap()
            .status,
        "paused"
    );
    assert_eq!(
        DocumentRepository::new(&database)
            .get("document-available")
            .unwrap()
            .unwrap()
            .availability,
        "available"
    );
}

fn empty_backup(version: u32) -> Value {
    json!({
        "format": "document-index-backup",
        "version": version,
        "exportedAt": "2026-07-24T08:00:00Z",
        "preferences": { "defaultTimeDimension": "modifiedAt", "theme": "parchment", "workspaceSplit": 42 },
        "data": {
            "indexSources": [], "topics": [], "documents": [], "manualGroupingRules": [],
            "extensionRules": [{ "id": "builtin-txt", "extension": "txt", "builtIn": true, "enabled": true }]
        }
    })
}

fn source_json(id: &str, path: &std::path::Path) -> Value {
    json!({
        "id": id, "path": path.to_string_lossy(), "displayName": id, "enabled": true,
        "addedAt": "2026-07-24T08:00:00Z", "lastScanAt": null, "lastSuccessAt": null
    })
}

fn topic_json(id: &str) -> Value {
    json!({
        "id": id, "canonicalName": id, "displayName": id, "displayNameManual": false,
        "groupingConfidence": "low", "createdAt": "2026-07-24T08:00:00Z", "updatedAt": "2026-07-24T08:00:00Z"
    })
}

fn document_json(id: &str, source_id: &str, topic_id: &str, path: &std::path::Path) -> Value {
    json!({
        "id": id, "sourceId": source_id, "topicId": topic_id, "absolutePath": path.to_string_lossy(),
        "fileIdentity": null, "fileName": "missing.txt", "normalizedName": "missing", "extension": "txt",
        "versionLabel": null, "versionSortKey": null, "sizeBytes": 1, "createdAt": "2026-07-24T08:00:00Z",
        "modifiedAt": "2026-07-24T08:00:00Z", "manualTopic": false, "indexedAt": "2026-07-24T08:00:00Z"
    })
}

fn assert_keys(value: &Value, expected: &[&str]) {
    let mut actual = value
        .as_object()
        .unwrap()
        .keys()
        .map(String::as_str)
        .collect::<Vec<_>>();
    actual.sort_unstable();
    let mut expected = expected.to_vec();
    expected.sort_unstable();
    assert_eq!(actual, expected);
}
