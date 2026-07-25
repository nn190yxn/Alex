use document_index_core::{
    database::Database,
    domain::models::{SearchQuery, SortDirection, SortField},
    repositories::{
        DocumentRecord, DocumentRepository, ExtensionRuleRecord, ExtensionRuleRepository,
        IndexSourceRecord, IndexSourceRepository, ScanErrorRecord, ScanRepository, ScanRunRecord,
        SearchRepository, TopicRecord, TopicRepository,
    },
    services::{GroupingService, SearchService, TopicService},
    ErrorCode,
};
use proptest::prelude::*;
use tempfile::TempDir;

fn open_database() -> (TempDir, Database) {
    let directory = tempfile::tempdir().expect("temporary directory should be created");
    let database = Database::open(directory.path().join("index.sqlite3"))
        .expect("database should open and migrate");
    (directory, database)
}

fn source(id: &str) -> IndexSourceRecord {
    IndexSourceRecord {
        id: id.into(),
        path: format!("C:/Documents/{id}"),
        display_name: id.into(),
        enabled: true,
        status: "ready".into(),
        added_at: "2026-07-24T08:00:00Z".into(),
        last_scan_at: None,
        last_success_at: None,
    }
}

fn topic(id: &str, display_name: &str, updated_at: &str) -> TopicRecord {
    TopicRecord {
        id: id.into(),
        canonical_name: display_name.to_lowercase(),
        display_name: display_name.into(),
        display_name_manual: false,
        grouping_confidence: "high".into(),
        newest_created_document_id: None,
        recently_modified_document_id: None,
        created_at: "2026-07-24T08:00:00Z".into(),
        updated_at: updated_at.into(),
    }
}

#[allow(clippy::too_many_arguments)]
fn document(
    id: &str,
    source_id: &str,
    topic_id: &str,
    file_name: &str,
    created_at: Option<&str>,
    modified_at: Option<&str>,
    indexed_at: &str,
) -> DocumentRecord {
    DocumentRecord {
        id: id.into(),
        source_id: source_id.into(),
        topic_id: topic_id.into(),
        absolute_path: format!("C:/Documents/{source_id}/{file_name}"),
        file_identity: Some(format!("identity-{id}")),
        file_name: file_name.into(),
        normalized_name: file_name.trim_end_matches(".docx").into(),
        extension: "docx".into(),
        version_label: Some(id.into()),
        version_sort_key: Some(id.into()),
        size_bytes: 128,
        created_at: created_at.map(str::to_owned),
        modified_at: modified_at.map(str::to_owned),
        availability: "available".into(),
        manual_topic: false,
        indexed_at: indexed_at.into(),
    }
}

fn seed_source_and_topics(database: &Database, topics: &[TopicRecord]) {
    IndexSourceRepository::new(database)
        .upsert(&source("source-a"))
        .expect("source should be inserted");
    let repository = TopicRepository::new(database);
    for topic in topics {
        repository.upsert(topic).expect("topic should be inserted");
    }
}

#[test]
fn migrations_are_idempotent_and_configure_sqlite() {
    let directory = tempfile::tempdir().expect("temporary directory should be created");
    let path = directory.path().join("index.sqlite3");
    {
        let database = Database::open(&path).expect("first database open should migrate");
        assert_eq!(database.migration_count().unwrap(), 4);
        database
            .read(|connection| {
                let foreign_keys: i64 =
                    connection.pragma_query_value(None, "foreign_keys", |row| row.get(0))?;
                let journal_mode: String =
                    connection.pragma_query_value(None, "journal_mode", |row| row.get(0))?;
                let extension_count: i64 = connection.query_row(
                    "SELECT COUNT(*) FROM extension_rules WHERE built_in = 1 AND enabled = 1",
                    [],
                    |row| row.get(0),
                )?;
                let fts_table_count: i64 = connection.query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'topic_search'",
                    [],
                    |row| row.get(0),
                )?;
                assert_eq!(foreign_keys, 1);
                assert_eq!(journal_mode, "wal");
                assert_eq!(extension_count, 12);
                assert_eq!(fts_table_count, 1);
                Ok(())
            })
            .unwrap();
    }

    let database = Database::open(&path).expect("reopening should preserve migration state");
    assert_eq!(database.migration_count().unwrap(), 4);
}

#[test]
fn failed_transaction_rolls_back_all_writes() {
    let (_directory, database) = open_database();
    let error = database
        .transaction(|transaction| {
            transaction.execute(
                "INSERT INTO index_sources(id, path, display_name, enabled, status, added_at)
                 VALUES ('source-a', 'C:/Documents', 'Documents', 1, 'ready', '2026-07-24T08:00:00Z')",
                [],
            )?;
            Err::<(), _>(rusqlite::Error::InvalidQuery)
        })
        .expect_err("transaction should fail");
    assert_eq!(error.code, ErrorCode::DatabaseError);

    let count: i64 = database
        .read(|connection| {
            connection.query_row("SELECT COUNT(*) FROM index_sources", [], |row| row.get(0))
        })
        .unwrap();
    assert_eq!(count, 0);
}

#[test]
fn document_batch_updates_dual_time_aggregates_and_missing_state() {
    let (_directory, database) = open_database();
    seed_source_and_topics(
        &database,
        &[topic("topic-a", "Budget", "2026-07-24T08:00:00Z")],
    );
    let documents = DocumentRepository::new(&database);
    documents
        .upsert_batch(&[
            document(
                "doc-created",
                "source-a",
                "topic-a",
                "Budget-v2.docx",
                Some("2026-07-24T12:00:00Z"),
                Some("2026-07-24T12:30:00Z"),
                "scan-old",
            ),
            document(
                "doc-modified",
                "source-a",
                "topic-a",
                "Budget-v1.docx",
                Some("2026-07-23T12:00:00Z"),
                Some("2026-07-24T15:00:00Z"),
                "scan-current",
            ),
        ])
        .unwrap();

    let topics = TopicRepository::new(&database);
    let aggregate = topics.get("topic-a").unwrap().unwrap();
    assert_eq!(
        aggregate.newest_created_document_id.as_deref(),
        Some("doc-created")
    );
    assert_eq!(
        aggregate.recently_modified_document_id.as_deref(),
        Some("doc-modified")
    );

    assert_eq!(
        documents
            .mark_missing_not_seen("source-a", "scan-current")
            .unwrap(),
        1
    );
    let aggregate = topics.get("topic-a").unwrap().unwrap();
    assert_eq!(
        aggregate.newest_created_document_id.as_deref(),
        Some("doc-modified")
    );
    assert_eq!(
        aggregate.recently_modified_document_id.as_deref(),
        Some("doc-modified")
    );
}

#[test]
fn automatic_upsert_preserves_manual_topic_assignment() {
    let (_directory, database) = open_database();
    seed_source_and_topics(
        &database,
        &[
            topic("topic-manual", "Manual", "2026-07-24T08:00:00Z"),
            topic("topic-auto", "Automatic", "2026-07-24T08:00:00Z"),
        ],
    );
    let repository = DocumentRepository::new(&database);
    let mut manual = document(
        "doc-a",
        "source-a",
        "topic-manual",
        "Plan.docx",
        Some("2026-07-24T10:00:00Z"),
        Some("2026-07-24T10:00:00Z"),
        "scan-a",
    );
    manual.manual_topic = true;
    repository.upsert_batch(&[manual]).unwrap();

    let automatic = document(
        "replacement-id",
        "source-a",
        "topic-auto",
        "Plan.docx",
        Some("2026-07-24T10:00:00Z"),
        Some("2026-07-24T11:00:00Z"),
        "scan-b",
    );
    repository.upsert_batch(&[automatic]).unwrap();

    let persisted = repository.list_for_topic("topic-manual").unwrap();
    assert_eq!(persisted.len(), 1);
    assert_eq!(persisted[0].id, "doc-a");
    assert!(persisted[0].manual_topic);
    assert!(repository.list_for_topic("topic-auto").unwrap().is_empty());
}

#[test]
fn automatic_topic_update_preserves_manual_display_name() {
    let (_directory, database) = open_database();
    let topics = TopicRepository::new(&database);
    let mut manual = topic("topic-a", "Preferred Name", "2026-07-24T08:00:00Z");
    manual.display_name_manual = true;
    topics.upsert(&manual).unwrap();

    topics
        .upsert(&topic(
            "topic-a",
            "Automatically Inferred Name",
            "2026-07-24T09:00:00Z",
        ))
        .unwrap();

    let persisted = topics.get("topic-a").unwrap().unwrap();
    assert_eq!(persisted.display_name, "Preferred Name");
    assert!(persisted.display_name_manual);
}

#[test]
fn fts_index_tracks_document_and_topic_changes_and_rebuilds() {
    let (_directory, database) = open_database();
    seed_source_and_topics(
        &database,
        &[topic(
            "topic-a",
            "Quarterly Finance",
            "2026-07-24T08:00:00Z",
        )],
    );
    let documents = DocumentRepository::new(&database);
    let mut initial_document = document(
        "doc-a",
        "source-a",
        "topic-a",
        "LegacyMarker.docx",
        Some("2026-07-24T10:00:00Z"),
        Some("2026-07-24T10:00:00Z"),
        "scan-a",
    );
    initial_document.absolute_path = "C:/Documents/source-a/StablePath.docx".into();
    documents.upsert_batch(&[initial_document]).unwrap();
    let search = SearchRepository::new(&database);
    assert_eq!(
        search.search_topic_ids("LegacyMarker", 20, 0).unwrap(),
        ["topic-a"]
    );

    let mut renamed_document = document(
        "ignored-new-id",
        "source-a",
        "topic-a",
        "Forecast-v2.docx",
        Some("2026-07-24T10:00:00Z"),
        Some("2026-07-24T11:00:00Z"),
        "scan-b",
    );
    renamed_document.absolute_path = "C:/Documents/source-a/StablePath.docx".into();
    renamed_document.normalized_name = "Forecast".into();
    documents.upsert_batch(&[renamed_document]).unwrap();
    assert!(search
        .search_topic_ids("LegacyMarker", 20, 0)
        .unwrap()
        .is_empty());
    assert_eq!(
        search.search_topic_ids("Forecast", 20, 0).unwrap(),
        ["topic-a"]
    );

    let mut renamed_topic = TopicRepository::new(&database)
        .get("topic-a")
        .unwrap()
        .unwrap();
    renamed_topic.display_name = "Annual Planning".into();
    renamed_topic.display_name_manual = true;
    TopicRepository::new(&database)
        .upsert(&renamed_topic)
        .unwrap();
    assert_eq!(
        search.search_topic_ids("Planning", 20, 0).unwrap(),
        ["topic-a"]
    );

    search.rebuild().unwrap();
    assert_eq!(
        search.search_topic_ids("Forecast", 20, 0).unwrap(),
        ["topic-a"]
    );
}

#[test]
fn topic_and_search_pagination_are_stable() {
    let (_directory, database) = open_database();
    let topics = [
        topic("topic-c", "Shared C", "2026-07-24T08:00:00Z"),
        topic("topic-a", "Shared A", "2026-07-24T08:00:00Z"),
        topic("topic-b", "Shared B", "2026-07-24T08:00:00Z"),
    ];
    seed_source_and_topics(&database, &topics);
    let repository = TopicRepository::new(&database);
    let first_page = repository.list_page(2, 0).unwrap();
    let second_page = repository.list_page(2, 2).unwrap();
    assert_eq!(
        first_page
            .iter()
            .map(|topic| topic.id.as_str())
            .collect::<Vec<_>>(),
        ["topic-a", "topic-b"]
    );
    assert_eq!(second_page[0].id, "topic-c");

    let documents = DocumentRepository::new(&database);
    for topic in &topics {
        documents
            .upsert_batch(&[document(
                &format!("doc-{}", topic.id),
                "source-a",
                &topic.id,
                &format!("{}-Shared.docx", topic.id),
                Some("2026-07-24T10:00:00Z"),
                Some("2026-07-24T10:00:00Z"),
                "scan-a",
            )])
            .unwrap();
    }
    let search = SearchRepository::new(&database);
    assert_eq!(
        search.search_topic_ids("Shared", 2, 0).unwrap(),
        ["topic-a", "topic-b"]
    );
    assert_eq!(
        search.search_topic_ids("Shared", 2, 2).unwrap(),
        ["topic-c"]
    );
}

#[test]
fn scan_progress_errors_and_extension_rules_round_trip() {
    let (_directory, database) = open_database();
    IndexSourceRepository::new(&database)
        .upsert(&source("source-a"))
        .unwrap();
    let scans = ScanRepository::new(&database);
    let run = ScanRunRecord {
        id: "scan-a".into(),
        source_ids: vec!["source-a".into()],
        status: "running".into(),
        cursor_path: Some("C:/Documents/source-a/Finance".into()),
        started_at: Some("2026-07-24T08:00:00Z".into()),
        completed_at: None,
        discovered_count: 20,
        processed_count: 12,
        topic_count: 4,
        suggestion_count: 1,
        failure_count: 1,
        error_summary: Some("one inaccessible path".into()),
    };
    scans.upsert_run(&run).unwrap();
    assert_eq!(scans.get_run("scan-a").unwrap(), Some(run));

    let error = ScanErrorRecord {
        id: None,
        scan_id: "scan-a".into(),
        path: "C:/Documents/source-a/Restricted".into(),
        error_type: "permission_denied".into(),
        occurred_at: "2026-07-24T08:01:00Z".into(),
        retry_status: "pending".into(),
    };
    let error_id = scans.add_error(&error).unwrap();
    let errors = scans.list_errors("scan-a").unwrap();
    assert_eq!(errors.len(), 1);
    assert_eq!(errors[0].id, Some(error_id));
    assert_eq!(errors[0].error_type, "permission_denied");
    assert_eq!(scans.list_latest_errors().unwrap(), errors);

    let extensions = ExtensionRuleRepository::new(&database);
    extensions
        .upsert(&ExtensionRuleRecord {
            id: "custom-odt".into(),
            extension: "odt".into(),
            built_in: false,
            enabled: true,
        })
        .unwrap();
    let rules = extensions.list().unwrap();
    assert_eq!(rules.len(), 13);
    assert!(rules
        .iter()
        .any(|rule| rule.extension == "odt" && rule.enabled));
}

#[test]
fn scan_state_updates_preserve_the_latest_enabled_flag() {
    let (_directory, database) = open_database();
    let repository = IndexSourceRepository::new(&database);
    repository.upsert(&source("source-a")).unwrap();

    repository.set_enabled("source-a", false, "ready").unwrap();
    repository
        .update_scan_state(
            "source-a",
            "ready",
            Some("2026-07-24T09:00:00Z"),
            Some("2026-07-24T09:01:00Z"),
        )
        .unwrap();

    let persisted = repository.get("source-a").unwrap().unwrap();
    assert!(!persisted.enabled);
    assert_eq!(persisted.status, "paused");
    assert_eq!(
        persisted.last_scan_at.as_deref(),
        Some("2026-07-24T09:00:00Z")
    );
    assert_eq!(
        persisted.last_success_at.as_deref(),
        Some("2026-07-24T09:01:00Z")
    );
}

#[test]
fn document_sorting_supports_all_fields_missing_values_and_stable_ties() {
    let (_directory, database) = open_database();
    seed_source_and_topics(
        &database,
        &[topic("topic-a", "Plans", "2026-07-24T08:00:00Z")],
    );
    let repository = DocumentRepository::new(&database);
    let mut alpha = document(
        "doc-alpha",
        "source-a",
        "topic-a",
        "Alpha.docx",
        Some("2026-07-24T10:00:00Z"),
        Some("2026-07-24T12:00:00Z"),
        "scan-a",
    );
    alpha.version_sort_key = Some("version:0000000001".into());
    let mut beta = document(
        "doc-beta",
        "source-a",
        "topic-a",
        "beta.docx",
        Some("2026-07-24T10:00:00Z"),
        Some("2026-07-24T12:00:00Z"),
        "scan-a",
    );
    beta.version_sort_key = Some("version:0000000002".into());
    let mut newest = document(
        "doc-newest",
        "source-a",
        "topic-a",
        "Newest.docx",
        Some("2026-07-24T14:00:00Z"),
        Some("2026-07-24T09:00:00Z"),
        "scan-a",
    );
    newest.version_sort_key = Some("version:0000000003".into());
    let mut missing = document(
        "doc-missing",
        "source-a",
        "topic-a",
        "Missing.docx",
        None,
        None,
        "scan-a",
    );
    missing.version_label = None;
    missing.version_sort_key = None;
    repository
        .upsert_batch(&[missing, alpha, newest, beta])
        .unwrap();

    let ids = |field, direction| {
        repository
            .list_for_topic_sorted("topic-a", field, direction)
            .unwrap()
            .into_iter()
            .map(|document| document.id)
            .collect::<Vec<_>>()
    };
    assert_eq!(
        ids(SortField::CreatedAt, SortDirection::Desc),
        ["doc-newest", "doc-beta", "doc-alpha", "doc-missing"]
    );
    assert_eq!(
        ids(SortField::ModifiedAt, SortDirection::Desc),
        ["doc-beta", "doc-alpha", "doc-newest", "doc-missing"]
    );
    assert_eq!(
        ids(SortField::Version, SortDirection::Asc),
        ["doc-alpha", "doc-beta", "doc-newest", "doc-missing"]
    );
    assert_eq!(
        ids(SortField::FileName, SortDirection::Asc),
        ["doc-alpha", "doc-beta", "doc-missing", "doc-newest"]
    );

    let topic = TopicRepository::new(&database)
        .get("topic-a")
        .unwrap()
        .unwrap();
    assert_eq!(
        topic.newest_created_document_id.as_deref(),
        Some("doc-newest")
    );
    assert_eq!(
        topic.recently_modified_document_id.as_deref(),
        Some("doc-beta")
    );
}

#[test]
fn manual_topic_edits_are_transactional_and_preserved_by_scans() {
    let (_directory, database) = open_database();
    seed_source_and_topics(
        &database,
        &[
            topic("topic-a", "Plan A", "2026-07-24T08:00:00Z"),
            topic("topic-b", "Plan B", "2026-07-24T08:00:00Z"),
        ],
    );
    let documents = DocumentRepository::new(&database);
    documents
        .upsert_batch(&[
            document(
                "doc-a",
                "source-a",
                "topic-a",
                "Plan-A.docx",
                Some("2026-07-24T10:00:00Z"),
                Some("2026-07-24T12:00:00Z"),
                "scan-a",
            ),
            document(
                "doc-b",
                "source-a",
                "topic-b",
                "Plan-B.docx",
                Some("2026-07-24T11:00:00Z"),
                Some("2026-07-24T13:00:00Z"),
                "scan-a",
            ),
        ])
        .unwrap();
    let service = TopicService::new(&database);

    let renamed = service.rename_topic("topic-a", "Preferred Plan").unwrap();
    assert_eq!(renamed.summary.display_name, "Preferred Plan");
    assert!(renamed.display_name_manual);

    let merged = service
        .merge_topics(&["topic-b".into(), "topic-a".into()], "Combined Plan")
        .unwrap();
    assert_eq!(merged.summary.id, "topic-a");
    assert_eq!(merged.summary.document_count, 2);
    assert_eq!(merged.summary.newest_created_document.unwrap().id, "doc-b");
    assert_eq!(
        merged.summary.recently_modified_document.unwrap().id,
        "doc-b"
    );
    assert!(TopicRepository::new(&database)
        .get("topic-b")
        .unwrap()
        .is_none());

    let split = service
        .move_documents_to_topic(&["doc-b".into()], None, Some("Separate Plan"))
        .unwrap();
    let separate = split
        .iter()
        .find(|topic| topic.summary.display_name == "Separate Plan")
        .unwrap();
    assert_eq!(separate.summary.document_count, 1);
    assert_eq!(
        separate
            .summary
            .newest_created_document
            .as_ref()
            .unwrap()
            .id,
        "doc-b"
    );
    let remaining = split
        .iter()
        .find(|topic| topic.summary.id == "topic-a")
        .unwrap();
    assert_eq!(remaining.summary.document_count, 1);
    assert_eq!(
        remaining
            .summary
            .newest_created_document
            .as_ref()
            .unwrap()
            .id,
        "doc-a"
    );

    let manual_rule_count: i64 = database
        .read(|connection| {
            connection.query_row("SELECT COUNT(*) FROM manual_grouping_rules", [], |row| {
                row.get(0)
            })
        })
        .unwrap();
    assert_eq!(manual_rule_count, 2);

    let mut automatic = document(
        "replacement-id",
        "source-a",
        "topic-a",
        "Plan-B.docx",
        Some("2026-07-24T11:00:00Z"),
        Some("2026-07-24T14:00:00Z"),
        "scan-b",
    );
    automatic.absolute_path = "C:/Documents/source-a/Plan-B.docx".into();
    documents.upsert_batch(&[automatic]).unwrap();
    let persisted = documents.get("doc-b").unwrap().unwrap();
    assert_eq!(persisted.topic_id, separate.summary.id);
    assert!(persisted.manual_topic);
}

#[test]
fn pending_organize_suggestions_are_paged_and_mapped() {
    let (_directory, database) = open_database();
    database
        .transaction(|transaction| {
            transaction.execute_batch(
                "INSERT INTO grouping_suggestions(
                    id, source_topic_ids_json, proposed_display_name, confidence,
                    score, evidence_json, status, created_at, updated_at
                 ) VALUES
                    ('suggestion-high', '[\"topic-a\",\"topic-b\"]', 'Quarterly Plan', 'medium',
                     0.72, '[{\"kind\":\"keywords\",\"score\":0.42,\"summary\":\"Names overlap.\"}]',
                     'pending', '2026-07-24T08:00:00Z', '2026-07-24T09:00:00Z'),
                    ('suggestion-low', '[\"topic-c\"]', 'Archive', 'low',
                     0.51, '[]', 'pending', '2026-07-24T08:00:00Z', '2026-07-24T08:00:00Z'),
                    ('suggestion-dismissed', '[\"topic-d\"]', 'Dismissed', 'low',
                     0.90, '[]', 'dismissed', '2026-07-24T08:00:00Z', '2026-07-24T10:00:00Z');",
            )?;
            Ok(())
        })
        .unwrap();

    let first = GroupingService::new(&database)
        .list_organize_suggestions(1, 1)
        .unwrap();
    assert_eq!(first.total, 2);
    assert_eq!(first.items.len(), 1);
    assert_eq!(first.items[0].id, "suggestion-high");
    assert_eq!(first.items[0].source_topic_ids, ["topic-a", "topic-b"]);
    assert_eq!(first.items[0].evidence.len(), 1);

    let second = GroupingService::new(&database)
        .list_organize_suggestions(2, 1)
        .unwrap();
    assert_eq!(second.items[0].id, "suggestion-low");
}

#[test]
fn accepting_an_organize_suggestion_merges_topics_and_records_manual_rules() {
    let (_directory, database) = open_database();
    seed_source_and_topics(
        &database,
        &[
            topic("topic-a", "Quarterly Plan", "2026-07-24T08:00:00Z"),
            topic("topic-b", "Quarterly Planning", "2026-07-24T08:00:00Z"),
            topic("topic-c", "Related Draft", "2026-07-24T08:00:00Z"),
        ],
    );
    DocumentRepository::new(&database)
        .upsert_batch(&[
            document(
                "doc-a",
                "source-a",
                "topic-a",
                "Quarterly-Plan-v1.docx",
                Some("2026-07-24T10:00:00Z"),
                Some("2026-07-24T12:00:00Z"),
                "scan-a",
            ),
            document(
                "doc-b",
                "source-a",
                "topic-b",
                "Quarterly-Plan-v2.docx",
                Some("2026-07-24T11:00:00Z"),
                Some("2026-07-24T13:00:00Z"),
                "scan-a",
            ),
        ])
        .unwrap();
    database
        .transaction(|transaction| {
            transaction.execute_batch(
                "INSERT INTO grouping_suggestions(
                    id, source_topic_ids_json, proposed_display_name, confidence,
                    score, evidence_json, status, created_at, updated_at
                 ) VALUES
                    ('suggestion-accept', '[\"topic-b\",\"topic-a\"]', 'Quarterly Plan', 'medium',
                     0.72, '[]', 'pending', '2026-07-24T08:00:00Z', '2026-07-24T09:00:00Z'),
                    ('suggestion-related', '[\"topic-b\",\"topic-c\"]', 'Related Plan', 'medium',
                     0.65, '[]', 'pending', '2026-07-24T08:00:00Z', '2026-07-24T09:00:00Z');",
            )?;
            Ok(())
        })
        .unwrap();

    let merged = TopicService::new(&database)
        .accept_organize_suggestion("suggestion-accept")
        .unwrap();

    assert_eq!(merged.summary.id, "topic-a");
    assert_eq!(merged.summary.display_name, "Quarterly Plan");
    assert_eq!(merged.summary.document_count, 2);
    assert_eq!(merged.summary.newest_created_document.unwrap().id, "doc-b");
    assert_eq!(
        merged.summary.recently_modified_document.unwrap().id,
        "doc-b"
    );
    assert!(TopicRepository::new(&database)
        .get("topic-b")
        .unwrap()
        .is_none());
    for document_id in ["doc-a", "doc-b"] {
        let persisted = DocumentRepository::new(&database)
            .get(document_id)
            .unwrap()
            .unwrap();
        assert_eq!(persisted.topic_id, "topic-a");
        assert!(persisted.manual_topic);
    }
    let (accepted_status, related_status, manual_rule_count): (String, String, i64) = database
        .read(|connection| {
            Ok((
                connection.query_row(
                    "SELECT status FROM grouping_suggestions WHERE id = 'suggestion-accept'",
                    [],
                    |row| row.get(0),
                )?,
                connection.query_row(
                    "SELECT status FROM grouping_suggestions WHERE id = 'suggestion-related'",
                    [],
                    |row| row.get(0),
                )?,
                connection.query_row("SELECT COUNT(*) FROM manual_grouping_rules", [], |row| {
                    row.get(0)
                })?,
            ))
        })
        .unwrap();
    assert_eq!(accepted_status, "accepted");
    assert_eq!(related_status, "dismissed");
    assert_eq!(manual_rule_count, 2);
}

#[test]
fn dismissing_an_organize_suggestion_preserves_topics_and_documents() {
    let (_directory, database) = open_database();
    seed_source_and_topics(
        &database,
        &[
            topic("topic-a", "Plan A", "2026-07-24T08:00:00Z"),
            topic("topic-b", "Plan B", "2026-07-24T08:00:00Z"),
        ],
    );
    DocumentRepository::new(&database)
        .upsert_batch(&[document(
            "doc-a",
            "source-a",
            "topic-a",
            "Plan-A.docx",
            Some("2026-07-24T10:00:00Z"),
            Some("2026-07-24T12:00:00Z"),
            "scan-a",
        )])
        .unwrap();
    database
        .transaction(|transaction| {
            transaction.execute(
                "INSERT INTO grouping_suggestions(
                    id, source_topic_ids_json, proposed_display_name, confidence,
                    score, evidence_json, status, created_at, updated_at
                 ) VALUES (?1, ?2, ?3, 'medium', 0.61, '[]', 'pending', ?4, ?4)",
                rusqlite::params![
                    "suggestion-dismiss",
                    "[\"topic-a\",\"topic-b\"]",
                    "Plan",
                    "2026-07-24T09:00:00Z"
                ],
            )?;
            Ok(())
        })
        .unwrap();

    let dismissed = GroupingService::new(&database)
        .dismiss_organize_suggestion("suggestion-dismiss")
        .unwrap();

    assert_eq!(
        dismissed.status,
        document_index_core::domain::models::SuggestionStatus::Dismissed
    );
    assert_eq!(
        DocumentRepository::new(&database)
            .get("doc-a")
            .unwrap()
            .unwrap()
            .topic_id,
        "topic-a"
    );
    assert!(TopicRepository::new(&database)
        .get("topic-b")
        .unwrap()
        .is_some());
    assert_eq!(
        GroupingService::new(&database)
            .list_organize_suggestions(1, 20)
            .unwrap()
            .total,
        0
    );
}

#[test]
fn search_service_matches_metadata_filters_and_pages_topics_stably() {
    let (_directory, database) = open_database();
    IndexSourceRepository::new(&database)
        .upsert(&source("source-a"))
        .unwrap();
    IndexSourceRepository::new(&database)
        .upsert(&source("source-b"))
        .unwrap();
    let topics = TopicRepository::new(&database);
    for record in [
        topic("topic-title", "Quarterly Overview", "2026-07-24T08:00:00Z"),
        topic("topic-file", "Meeting Notes", "2026-07-24T08:00:00Z"),
        topic("topic-normalized", "Archive", "2026-07-24T08:00:00Z"),
        topic("topic-path", "Delta", "2026-07-24T08:00:00Z"),
        topic("topic-edge", "Boundary", "2026-07-24T08:00:00Z"),
    ] {
        topics.upsert(&record).unwrap();
    }
    let mut by_title = document(
        "doc-title",
        "source-a",
        "topic-title",
        "Alpha.docx",
        Some("2026-07-24T10:00:00Z"),
        Some("2026-07-24T12:00:00Z"),
        "scan-a",
    );
    by_title.absolute_path = "C:/Documents/source-a/Finance/Alpha.docx".into();
    let by_file = document(
        "doc-file",
        "source-b",
        "topic-file",
        "Quarterly-Notes.docx",
        Some("2026-07-24T11:00:00Z"),
        Some("2026-07-24T13:00:00Z"),
        "scan-a",
    );
    let mut by_normalized = document(
        "doc-normalized",
        "source-a",
        "topic-normalized",
        "Gamma.docx",
        Some("2026-07-24T12:00:00Z"),
        Some("2026-07-24T14:00:00Z"),
        "scan-a",
    );
    by_normalized.normalized_name = "quarterly archive".into();
    let mut by_path = document(
        "doc-path",
        "source-a",
        "topic-path",
        "Delta.docx",
        Some("2026-07-24T13:00:00Z"),
        Some("2026-07-24T15:00:00Z"),
        "scan-a",
    );
    by_path.absolute_path = "C:/Documents/source-a/Quarterly/Delta.docx".into();
    let mut boundary = document(
        "doc-edge",
        "source-a",
        "topic-edge",
        "Edge.docx",
        Some("2026-07-24T14:00:00Z"),
        Some("2026-07-24T16:00:00Z"),
        "scan-a",
    );
    boundary.absolute_path = "C:/Documents/source-a/Finance-Archive/Edge.docx".into();
    DocumentRepository::new(&database)
        .upsert_batch(&[by_title, by_file, by_normalized, by_path, boundary])
        .unwrap();

    let query = |text: &str, page: u32, page_size: u32| SearchQuery {
        text: text.into(),
        source_ids: Vec::new(),
        directory: None,
        created_from: None,
        created_to: None,
        modified_from: None,
        modified_to: None,
        sort_by: SortField::ModifiedAt,
        sort_direction: SortDirection::Desc,
        page,
        page_size,
    };
    let matching = SearchService::new(&database)
        .search_topics(query("quarterly", 1, 100))
        .unwrap();
    assert_eq!(matching.total, 4);
    assert_eq!(
        matching
            .items
            .iter()
            .map(|topic| topic.id.as_str())
            .collect::<Vec<_>>(),
        [
            "topic-path",
            "topic-normalized",
            "topic-file",
            "topic-title"
        ]
    );

    let mut filtered = query("", 1, 100);
    filtered.source_ids = vec!["source-a".into()];
    filtered.directory = Some("C:/Documents/source-a/Finance".into());
    filtered.created_from = Some("2026-07-24T09:00:00Z".into());
    filtered.created_to = Some("2026-07-24T11:00:00Z".into());
    filtered.modified_from = Some("2026-07-24T12:00:00Z".into());
    filtered.modified_to = Some("2026-07-24T12:00:00Z".into());
    let filtered = SearchService::new(&database)
        .search_topics(filtered)
        .unwrap();
    assert_eq!(filtered.total, 1);
    assert_eq!(filtered.items[0].id, "topic-title");

    let first = SearchService::new(&database)
        .search_topics(query("", 1, 2))
        .unwrap();
    let second = SearchService::new(&database)
        .search_topics(query("", 2, 2))
        .unwrap();
    assert_eq!(first.total, 5);
    assert_eq!(
        first
            .items
            .iter()
            .map(|topic| topic.id.as_str())
            .collect::<Vec<_>>(),
        ["topic-edge", "topic-path"]
    );
    assert_eq!(
        second
            .items
            .iter()
            .map(|topic| topic.id.as_str())
            .collect::<Vec<_>>(),
        ["topic-normalized", "topic-file"]
    );
}

#[test]
fn search_service_rejects_reversed_time_ranges() {
    let (_directory, database) = open_database();
    let error = SearchService::new(&database)
        .search_topics(SearchQuery {
            text: String::new(),
            source_ids: Vec::new(),
            directory: None,
            created_from: Some("2026-07-25T00:00:00Z".into()),
            created_to: Some("2026-07-24T00:00:00Z".into()),
            modified_from: None,
            modified_to: None,
            sort_by: SortField::CreatedAt,
            sort_direction: SortDirection::Desc,
            page: 1,
            page_size: 20,
        })
        .unwrap_err();
    assert_eq!(error.code, ErrorCode::InvalidInput);
    assert_eq!(error.field.as_deref(), Some("createdFrom"));
}

#[test]
fn topic_detail_returns_all_versions_and_marks_latest_available_documents() {
    let (_directory, database) = open_database();
    seed_source_and_topics(
        &database,
        &[topic("topic-a", "Project Plan", "2026-07-24T08:00:00Z")],
    );
    let mut newest_created = document(
        "doc-created",
        "source-a",
        "topic-a",
        "Project-v2.pdf",
        Some("2026-07-24T14:00:00Z"),
        Some("2026-07-24T10:00:00Z"),
        "scan-a",
    );
    newest_created.extension = "pdf".into();
    newest_created.version_label = Some("v2".into());
    newest_created.version_sort_key = Some("version:0000000002".into());
    newest_created.size_bytes = 2_048;
    newest_created.absolute_path = "C:/Documents/source-a/Plans/Project-v2.pdf".into();

    let mut recently_modified = document(
        "doc-modified",
        "source-a",
        "topic-a",
        "Project-v3.docx",
        Some("2026-07-24T11:00:00Z"),
        Some("2026-07-24T15:00:00Z"),
        "scan-a",
    );
    recently_modified.version_label = Some("v3".into());
    recently_modified.version_sort_key = Some("version:0000000003".into());

    let mut missing = document(
        "doc-missing",
        "source-a",
        "topic-a",
        "Project-v4.docx",
        Some("2026-07-24T16:00:00Z"),
        Some("2026-07-24T16:00:00Z"),
        "scan-a",
    );
    missing.version_label = Some("v4".into());
    missing.version_sort_key = Some("version:0000000004".into());
    missing.availability = "missing".into();

    let mut inaccessible = document(
        "doc-inaccessible",
        "source-a",
        "topic-a",
        "Project-v5.docx",
        Some("2026-07-24T17:00:00Z"),
        Some("2026-07-24T17:00:00Z"),
        "scan-a",
    );
    inaccessible.version_label = Some("v5".into());
    inaccessible.version_sort_key = Some("version:0000000005".into());
    inaccessible.availability = "inaccessible".into();

    DocumentRepository::new(&database)
        .upsert_batch(&[recently_modified, missing, newest_created, inaccessible])
        .unwrap();

    let detail = TopicService::new(&database)
        .detail("topic-a", SortField::CreatedAt, SortDirection::Desc)
        .unwrap();
    assert_eq!(detail.summary.document_count, 4);
    assert_eq!(
        detail.summary.newest_created_document.as_ref().unwrap().id,
        "doc-created"
    );
    assert_eq!(
        detail
            .summary
            .recently_modified_document
            .as_ref()
            .unwrap()
            .id,
        "doc-modified"
    );
    assert_eq!(
        detail
            .documents
            .iter()
            .map(|document| document.id.as_str())
            .collect::<Vec<_>>(),
        [
            "doc-inaccessible",
            "doc-missing",
            "doc-created",
            "doc-modified"
        ]
    );

    let created = detail
        .documents
        .iter()
        .find(|document| document.id == "doc-created")
        .unwrap();
    assert_eq!(created.version_label.as_deref(), Some("v2"));
    assert_eq!(
        created.version_sort_key.as_deref(),
        Some("version:0000000002")
    );
    assert_eq!(created.created_at.as_deref(), Some("2026-07-24T14:00:00Z"));
    assert_eq!(created.modified_at.as_deref(), Some("2026-07-24T10:00:00Z"));
    assert_eq!(created.extension, "pdf");
    assert_eq!(
        created.absolute_path,
        "C:/Documents/source-a/Plans/Project-v2.pdf"
    );
    assert_eq!(created.size_bytes, 2_048);
    assert_eq!(
        created.availability,
        document_index_core::domain::models::DocumentAvailability::Available
    );

    let missing = detail
        .documents
        .iter()
        .find(|document| document.id == "doc-missing")
        .unwrap();
    assert_eq!(
        missing.availability,
        document_index_core::domain::models::DocumentAvailability::Missing
    );
    let inaccessible = detail
        .documents
        .iter()
        .find(|document| document.id == "doc-inaccessible")
        .unwrap();
    assert_eq!(
        inaccessible.availability,
        document_index_core::domain::models::DocumentAvailability::Inaccessible
    );
}

#[test]
fn topic_detail_reports_a_missing_topic() {
    let (_directory, database) = open_database();
    let error = TopicService::new(&database)
        .detail("missing-topic", SortField::ModifiedAt, SortDirection::Desc)
        .unwrap_err();
    assert_eq!(error.code, ErrorCode::TopicNotFound);
    assert_eq!(error.field.as_deref(), Some("topicId"));
}

#[test]
fn local_missing_update_respects_directory_component_boundaries() {
    let (_directory, database) = open_database();
    seed_source_and_topics(
        &database,
        &[
            topic("topic-plan", "Plan", "2026-07-24T08:00:00Z"),
            topic("topic-planning", "Planning", "2026-07-24T08:00:00Z"),
        ],
    );
    let mut stale_plan = document(
        "doc-plan",
        "source-a",
        "topic-plan",
        "Old.docx",
        None,
        None,
        "older-scan",
    );
    stale_plan.absolute_path = "C:/Documents/source-a/Plan/Old.docx".into();
    let mut sibling = document(
        "doc-planning",
        "source-a",
        "topic-planning",
        "Current.docx",
        None,
        None,
        "older-scan",
    );
    sibling.absolute_path = "C:/Documents/source-a/Planning/Current.docx".into();
    let repository = DocumentRepository::new(&database);
    repository.upsert_batch(&[stale_plan, sibling]).unwrap();

    let changed = repository
        .mark_missing_not_seen_under(
            "source-a",
            std::path::Path::new("C:/Documents/source-a/Plan"),
            "current-scan",
        )
        .unwrap();

    assert_eq!(changed, 1);
    assert_eq!(
        repository.get("doc-plan").unwrap().unwrap().availability,
        "missing"
    );
    assert_eq!(
        repository
            .get("doc-planning")
            .unwrap()
            .unwrap()
            .availability,
        "available"
    );
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(32))]

    #[test]
    fn p1_each_document_has_one_topic(topic_choices in prop::collection::vec(0u8..8, 1..20)) {
        let (_directory, database) = open_database();
        let topics = (0..8)
            .map(|index| topic(&format!("topic-{index}"), &format!("Topic {index}"), "2026-07-24T08:00:00Z"))
            .collect::<Vec<_>>();
        seed_source_and_topics(&database, &topics);
        let documents = DocumentRepository::new(&database);
        for (index, choice) in topic_choices.into_iter().enumerate() {
            let mut candidate = document(
                &format!("candidate-{index}"),
                "source-a",
                &format!("topic-{choice}"),
                "Stable.docx",
                Some("2026-07-24T10:00:00Z"),
                Some("2026-07-24T10:00:00Z"),
                &format!("scan-{index}"),
            );
            candidate.absolute_path = "C:/Documents/source-a/Stable.docx".into();
            documents.upsert_batch(&[candidate]).unwrap();
        }
        let (document_count, topic_count): (i64, i64) = database.read(|connection| {
            connection.query_row(
                "SELECT COUNT(*), COUNT(DISTINCT topic_id) FROM documents WHERE absolute_path = ?1",
                ["C:/Documents/source-a/Stable.docx"],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
        }).unwrap();
        prop_assert_eq!(document_count, 1);
        prop_assert_eq!(topic_count, 1);
    }

    #[test]
    fn p2_manual_assignment_has_priority(automatic_topics in prop::collection::vec(0u8..8, 1..20)) {
        let (_directory, database) = open_database();
        let mut topics = (0..8)
            .map(|index| topic(&format!("topic-{index}"), &format!("Topic {index}"), "2026-07-24T08:00:00Z"))
            .collect::<Vec<_>>();
        topics.push(topic("topic-manual", "Manual", "2026-07-24T08:00:00Z"));
        seed_source_and_topics(&database, &topics);
        let documents = DocumentRepository::new(&database);
        let mut manual = document(
            "manual-document", "source-a", "topic-manual", "Stable.docx",
            Some("2026-07-24T10:00:00Z"), Some("2026-07-24T10:00:00Z"), "scan-manual",
        );
        manual.manual_topic = true;
        documents.upsert_batch(&[manual]).unwrap();
        for (index, choice) in automatic_topics.into_iter().enumerate() {
            documents.upsert_batch(&[document(
                &format!("automatic-{index}"), "source-a", &format!("topic-{choice}"), "Stable.docx",
                Some("2026-07-24T10:00:00Z"), Some("2026-07-24T10:00:00Z"), &format!("scan-{index}"),
            )]).unwrap();
        }
        let persisted = documents.get("manual-document").unwrap().unwrap();
        prop_assert_eq!(persisted.topic_id, "topic-manual");
        prop_assert!(persisted.manual_topic);
    }

    #[test]
    fn p3_p4_dual_markers_select_latest_times(
        created_values in prop::collection::btree_set(0u16..10000, 1..20),
        modified_values in prop::collection::btree_set(10000u16..20000, 1..20),
    ) {
        let count = created_values.len().min(modified_values.len());
        let created_values = created_values.into_iter().take(count).collect::<Vec<_>>();
        let modified_values = modified_values.into_iter().take(count).collect::<Vec<_>>();
        let (_directory, database) = open_database();
        seed_source_and_topics(&database, &[topic("topic-a", "Topic", "2026-07-24T08:00:00Z")]);
        let records = created_values.iter().zip(&modified_values).enumerate().map(|(index, (created, modified))| {
            document(
                &format!("doc-{index}"), "source-a", "topic-a", &format!("File-{index}.docx"),
                Some(&format!("created-{created:05}")),
                Some(&format!("modified-{modified:05}")),
                "scan-a",
            )
        }).collect::<Vec<_>>();
        DocumentRepository::new(&database).upsert_batch(&records).unwrap();
        let aggregate = TopicRepository::new(&database).get("topic-a").unwrap().unwrap();
        let expected_created = created_values.iter().enumerate().max_by_key(|(_, value)| *value).unwrap().0;
        let expected_modified = modified_values.iter().enumerate().max_by_key(|(_, value)| *value).unwrap().0;
        prop_assert_eq!(aggregate.newest_created_document_id, Some(format!("doc-{expected_created}")));
        prop_assert_eq!(aggregate.recently_modified_document_id, Some(format!("doc-{expected_modified}")));
    }

    #[test]
    fn p5_sorting_is_stable(path_values in prop::collection::btree_set(0u16..10000, 1..20)) {
        let (_directory, database) = open_database();
        seed_source_and_topics(&database, &[topic("topic-a", "Topic", "2026-07-24T08:00:00Z")]);
        let mut records = path_values.iter().map(|value| {
            let mut record = document(
                &format!("doc-{value:05}"), "source-a", "topic-a", "Same.docx",
                Some("2026-07-24T10:00:00Z"), Some("2026-07-24T10:00:00Z"), "scan-a",
            );
            record.absolute_path = format!("C:/Documents/source-a/{value:05}/Same.docx");
            record.version_sort_key = Some("version:0000000001".into());
            record
        }).collect::<Vec<_>>();
        records.reverse();
        let repository = DocumentRepository::new(&database);
        repository.upsert_batch(&records).unwrap();
        let first = repository.list_for_topic_sorted("topic-a", SortField::ModifiedAt, SortDirection::Desc).unwrap();
        let second = repository.list_for_topic_sorted("topic-a", SortField::ModifiedAt, SortDirection::Desc).unwrap();
        let first_ids = first.into_iter().map(|record| record.id).collect::<Vec<_>>();
        let second_ids = second.into_iter().map(|record| record.id).collect::<Vec<_>>();
        let expected = path_values.into_iter().map(|value| format!("doc-{value:05}")).collect::<Vec<_>>();
        prop_assert_eq!(&first_ids, &second_ids);
        prop_assert_eq!(first_ids, expected);
    }
}
