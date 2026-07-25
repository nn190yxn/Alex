use std::{fs, sync::Arc, thread, time::Duration};

use document_index_core::{
    database::Database,
    domain::models::{ScanStatus, SearchQuery, SortDirection, SortField},
    repositories::{
        DocumentRecord, DocumentRepository, IndexSourceRecord, IndexSourceRepository,
        ScanRepository, ScanRunRecord, TopicRecord, TopicRepository,
    },
    services::{
        BackupPreferences, BackupService, ScanCoordinator, SearchService, SourceService,
        TopicService,
    },
};
use tempfile::TempDir;

const BODY_MARKER: &str = "BODY_MARKER_MUST_NEVER_ENTER_THE_INDEX";
const CURSOR_SEPARATOR: char = '\u{1f}';

fn open_database(directory: &TempDir, name: &str) -> Arc<Database> {
    Arc::new(Database::open(directory.path().join(name)).expect("database should open"))
}

fn wait_for_terminal(coordinator: &ScanCoordinator, scan_id: &str) {
    for _ in 0..500 {
        let progress = coordinator
            .get_scan_status(scan_id)
            .expect("scan status should remain readable");
        if matches!(
            progress.run.status,
            ScanStatus::Completed | ScanStatus::Cancelled | ScanStatus::Failed
        ) {
            assert_eq!(progress.run.status, ScanStatus::Completed);
            return;
        }
        thread::sleep(Duration::from_millis(10));
    }
    panic!("scan did not finish within the test deadline");
}

fn search(
    database: &Database,
    text: &str,
) -> document_index_core::domain::models::Page<document_index_core::domain::models::TopicSummary> {
    SearchService::new(database)
        .search_topics(SearchQuery {
            text: text.into(),
            source_ids: Vec::new(),
            directory: None,
            created_from: None,
            created_to: None,
            modified_from: None,
            modified_to: None,
            sort_by: SortField::ModifiedAt,
            sort_direction: SortDirection::Desc,
            page: 1,
            page_size: 100,
        })
        .expect("search should succeed")
}

fn active_index_shape(database: &Database) -> (i64, i64, i64) {
    database
        .read(|connection| {
            Ok((
                connection.query_row(
                    "SELECT COUNT(*) FROM documents WHERE availability = 'available'",
                    [],
                    |row| row.get(0),
                )?,
                connection.query_row(
                    "SELECT COUNT(DISTINCT topic_id) FROM documents WHERE availability = 'available'",
                    [],
                    |row| row.get(0),
                )?,
                connection.query_row(
                    "SELECT COUNT(*) FROM topics t
                     WHERE t.newest_created_document_id IN (
                         SELECT id FROM documents WHERE availability = 'available'
                     ) AND t.recently_modified_document_id IN (
                         SELECT id FROM documents WHERE availability = 'available'
                     )",
                    [],
                    |row| row.get(0),
                )?,
            ))
        })
        .expect("index shape should be readable")
}

#[test]
fn local_reconcile_keeps_search_and_topic_aggregates_consistent_for_file_changes() {
    let directory = tempfile::tempdir().unwrap();
    let source_root = directory.path().join("source");
    let team_a = source_root.join("team-a");
    let team_b = source_root.join("team-b");
    let nested = team_a.join("nested");
    fs::create_dir_all(&nested).unwrap();
    fs::create_dir_all(&team_b).unwrap();

    let version_one = team_a.join("Quarterly Plan V1.txt");
    fs::write(&version_one, format!("{BODY_MARKER}: initial")).unwrap();
    let database = open_database(&directory, "incremental.sqlite3");
    let source = SourceService::new(&database)
        .add_source(source_root.to_str().unwrap())
        .unwrap();
    let coordinator = ScanCoordinator::new(database.clone());
    let initial = coordinator
        .start_scan(vec![source.id.clone()], Arc::new(|_| {}))
        .unwrap();
    wait_for_terminal(&coordinator, &initial.id);
    assert_eq!(active_index_shape(&database), (1, 1, 1));
    assert_eq!(search(&database, BODY_MARKER).total, 0);

    let version_two = team_a.join("Quarterly Plan V2.txt");
    fs::write(&version_two, format!("{BODY_MARKER}: second")).unwrap();
    let added = coordinator
        .reconcile_directories(
            &source.id,
            vec![team_a.clone(), nested.clone(), team_a.clone()],
        )
        .unwrap();
    assert_eq!(added.processed_count, 2);
    assert_eq!(active_index_shape(&database), (2, 1, 1));

    let modified_body = format!("{BODY_MARKER}: modified with a longer metadata size");
    fs::write(&version_two, &modified_body).unwrap();
    coordinator
        .reconcile_directories(&source.id, vec![team_a.clone()])
        .unwrap();
    let modified = DocumentRepository::new(&database)
        .get_by_source_path(&source.id, version_two.to_str().unwrap())
        .unwrap()
        .unwrap();
    assert_eq!(modified.size_bytes, modified_body.len() as i64);
    assert_eq!(search(&database, BODY_MARKER).total, 0);

    let renamed = team_a.join("Quarterly Plan Final.txt");
    fs::rename(&version_two, &renamed).unwrap();
    coordinator
        .reconcile_directories(&source.id, vec![team_a.clone()])
        .unwrap();
    assert_eq!(search(&database, "V2").total, 0);
    assert_eq!(search(&database, "Final").total, 1);
    assert_eq!(active_index_shape(&database), (2, 2, 2));

    let moved = team_b.join("Quarterly Plan V1.txt");
    fs::rename(&version_one, &moved).unwrap();
    coordinator
        .reconcile_directories(&source.id, vec![team_b.clone(), team_a.clone()])
        .unwrap();
    assert_eq!(active_index_shape(&database), (2, 2, 2));
    assert_eq!(search(&database, "team-b").total, 1);

    fs::remove_file(&renamed).unwrap();
    coordinator
        .reconcile_directories(&source.id, vec![team_a.clone()])
        .unwrap();
    assert_eq!(search(&database, "Final").total, 0);
    assert_eq!(active_index_shape(&database), (1, 1, 1));

    let overflow_discovery = nested.join("Quarterly Plan V3.txt");
    fs::write(
        &overflow_discovery,
        format!("{BODY_MARKER}: root rescan after overflow"),
    )
    .unwrap();
    let root_rescan = coordinator
        .reconcile_directories(&source.id, vec![source_root])
        .unwrap();
    assert_eq!(root_rescan.processed_count, 2);
    assert_eq!(active_index_shape(&database), (2, 1, 1));
    let result = search(&database, "Quarterly Plan");
    assert_eq!(result.total, 1);
    assert!(result.items[0].newest_created_document.is_some());
    assert!(result.items[0].recently_modified_document.is_some());
    assert_eq!(search(&database, BODY_MARKER).total, 0);
}

#[test]
fn manual_grouping_survives_rename_and_updates_the_rule_path() {
    let directory = tempfile::tempdir().unwrap();
    let source_root = directory.path().join("source");
    let archive = source_root.join("archive");
    fs::create_dir_all(&archive).unwrap();
    let original_path = source_root.join("Original Proposal.txt");
    fs::write(&original_path, "metadata-only identity fixture").unwrap();

    let database = open_database(&directory, "manual-rename.sqlite3");
    let source = SourceService::new(&database)
        .add_source(source_root.to_str().unwrap())
        .unwrap();
    let coordinator = ScanCoordinator::new(database.clone());
    let initial = coordinator
        .start_scan(vec![source.id.clone()], Arc::new(|_| {}))
        .unwrap();
    wait_for_terminal(&coordinator, &initial.id);

    let original = DocumentRepository::new(&database)
        .get_by_source_path(&source.id, original_path.to_str().unwrap())
        .unwrap()
        .unwrap();
    assert!(original.file_identity.is_some());
    let details = TopicService::new(&database)
        .move_documents_to_topic(&[original.id.clone()], None, Some("Curated Proposal"))
        .unwrap();
    let curated_topic_id = details
        .iter()
        .find(|detail| detail.summary.display_name == "Curated Proposal")
        .unwrap()
        .summary
        .id
        .clone();

    let renamed_path = archive.join("Proposal Final.txt");
    fs::rename(&original_path, &renamed_path).unwrap();
    coordinator
        .reconcile_directories(&source.id, vec![source_root.clone()])
        .unwrap();

    let renamed = DocumentRepository::new(&database)
        .get_by_source_path(&source.id, renamed_path.to_str().unwrap())
        .unwrap()
        .unwrap();
    assert_eq!(renamed.id, original.id);
    assert_eq!(renamed.topic_id, curated_topic_id);
    assert!(renamed.manual_topic);
    assert_eq!(renamed.file_name, "Proposal Final.txt");
    assert!(DocumentRepository::new(&database)
        .get_by_source_path(&source.id, original_path.to_str().unwrap())
        .unwrap()
        .is_none());

    let delivered_path = source_root.join("Proposal Delivered.txt");
    fs::rename(&renamed_path, &delivered_path).unwrap();
    let full_scan = coordinator
        .start_scan(vec![source.id.clone()], Arc::new(|_| {}))
        .unwrap();
    wait_for_terminal(&coordinator, &full_scan.id);
    let delivered = DocumentRepository::new(&database)
        .get_by_source_path(&source.id, delivered_path.to_str().unwrap())
        .unwrap()
        .unwrap();
    assert_eq!(delivered.id, original.id);
    assert_eq!(delivered.topic_id, curated_topic_id);
    assert!(delivered.manual_topic);

    let (document_count, rule_path, rule_identity): (i64, String, Option<String>) = database
        .read(|connection| {
            Ok((
                connection.query_row("SELECT COUNT(*) FROM documents", [], |row| row.get(0))?,
                connection.query_row(
                    "SELECT absolute_path FROM manual_grouping_rules WHERE document_id = ?1",
                    [&original.id],
                    |row| row.get(0),
                )?,
                connection.query_row(
                    "SELECT file_identity FROM manual_grouping_rules WHERE document_id = ?1",
                    [&original.id],
                    |row| row.get(0),
                )?,
            ))
        })
        .unwrap();
    assert_eq!(document_count, 1);
    assert_eq!(rule_path, delivered_path.to_string_lossy());
    assert_eq!(rule_identity, delivered.file_identity);
    assert_eq!(
        TopicService::new(&database)
            .detail(
                &curated_topic_id,
                SortField::ModifiedAt,
                SortDirection::Desc,
            )
            .unwrap()
            .summary
            .display_name,
        "Curated Proposal"
    );
}

#[cfg(unix)]
#[test]
fn live_hard_link_is_not_mistaken_for_a_manual_document_move() {
    let directory = tempfile::tempdir().unwrap();
    let source_root = directory.path().join("source");
    fs::create_dir(&source_root).unwrap();
    let original_path = source_root.join("Linked Draft.txt");
    let linked_path = source_root.join("Linked Copy.txt");
    fs::write(&original_path, "shared metadata fixture").unwrap();

    let database = open_database(&directory, "hard-link.sqlite3");
    let source = SourceService::new(&database)
        .add_source(source_root.to_str().unwrap())
        .unwrap();
    let coordinator = ScanCoordinator::new(database.clone());
    let initial = coordinator
        .start_scan(vec![source.id.clone()], Arc::new(|_| {}))
        .unwrap();
    wait_for_terminal(&coordinator, &initial.id);
    let original = DocumentRepository::new(&database)
        .get_by_source_path(&source.id, original_path.to_str().unwrap())
        .unwrap()
        .unwrap();
    TopicService::new(&database)
        .move_documents_to_topic(&[original.id.clone()], None, Some("Curated Link"))
        .unwrap();

    fs::hard_link(&original_path, &linked_path).unwrap();
    coordinator
        .reconcile_directories(&source.id, vec![source_root])
        .unwrap();

    let linked = DocumentRepository::new(&database)
        .get_by_source_path(&source.id, linked_path.to_str().unwrap())
        .unwrap()
        .unwrap();
    assert_ne!(linked.id, original.id);
    assert_eq!(linked.file_identity, original.file_identity);
    let document_count: i64 = database
        .read(|connection| {
            connection.query_row("SELECT COUNT(*) FROM documents", [], |row| row.get(0))
        })
        .unwrap();
    assert_eq!(document_count, 2);
}

#[test]
fn unfinished_scan_resumes_from_its_cursor_and_continues_across_offline_sources() {
    let directory = tempfile::tempdir().unwrap();
    let source_a_root = directory.path().join("source-a");
    let source_b_root = directory.path().join("source-b");
    fs::create_dir(&source_a_root).unwrap();
    fs::create_dir(&source_b_root).unwrap();
    let first_path = source_a_root.join("Cursor First.txt");
    let second_path = source_a_root.join("Cursor Second.txt");
    let cross_source_path = source_b_root.join("Cross Source.txt");
    fs::write(&first_path, "first metadata record").unwrap();
    fs::write(&second_path, "second metadata record").unwrap();
    fs::write(&cross_source_path, "cross source metadata record").unwrap();

    let database = open_database(&directory, "resume.sqlite3");
    let sources = IndexSourceRepository::new(&database);
    for (id, path) in [
        ("source-a", source_a_root.as_path()),
        ("source-b", source_b_root.as_path()),
    ] {
        sources
            .upsert(&IndexSourceRecord {
                id: id.into(),
                path: path.to_string_lossy().into_owned(),
                display_name: id.into(),
                enabled: true,
                status: "ready".into(),
                added_at: "2026-07-24T08:00:00Z".into(),
                last_scan_at: None,
                last_success_at: None,
            })
            .unwrap();
    }
    TopicRepository::new(&database)
        .upsert(&TopicRecord {
            id: "topic-first".into(),
            canonical_name: "cursor first".into(),
            display_name: "cursor first".into(),
            display_name_manual: false,
            grouping_confidence: "low".into(),
            newest_created_document_id: None,
            recently_modified_document_id: None,
            created_at: "2026-07-24T08:00:00Z".into(),
            updated_at: "2026-07-24T08:00:00Z".into(),
        })
        .unwrap();
    DocumentRepository::new(&database)
        .upsert_batch(&[DocumentRecord {
            id: "document-first".into(),
            source_id: "source-a".into(),
            topic_id: "topic-first".into(),
            absolute_path: first_path.to_string_lossy().into_owned(),
            file_identity: None,
            file_name: "Cursor First.txt".into(),
            normalized_name: "cursor first".into(),
            extension: "txt".into(),
            version_label: None,
            version_sort_key: None,
            size_bytes: 21,
            created_at: None,
            modified_at: None,
            availability: "available".into(),
            manual_topic: false,
            indexed_at: "resume-with-cursor".into(),
        }])
        .unwrap();
    ScanRepository::new(&database)
        .upsert_run(&ScanRunRecord {
            id: "resume-with-cursor".into(),
            source_ids: vec!["source-a".into(), "source-b".into()],
            status: "running".into(),
            cursor_path: Some(format!(
                "source-a{CURSOR_SEPARATOR}{}",
                first_path.to_string_lossy()
            )),
            started_at: Some("2026-07-24T08:00:00Z".into()),
            completed_at: None,
            discovered_count: 1,
            processed_count: 1,
            topic_count: 1,
            suggestion_count: 0,
            failure_count: 0,
            error_summary: None,
        })
        .unwrap();

    let coordinator = ScanCoordinator::new(database.clone());
    let resumed = coordinator.resume_unfinished(Arc::new(|_| {})).unwrap();
    assert_eq!(resumed.len(), 1);
    wait_for_terminal(&coordinator, "resume-with-cursor");
    assert_eq!(active_index_shape(&database).0, 3);
    assert_eq!(
        DocumentRepository::new(&database)
            .get("document-first")
            .unwrap()
            .unwrap()
            .availability,
        "available"
    );
    assert_eq!(search(&database, "Cross Source").total, 1);

    let disconnected = directory.path().join("source-a-disconnected");
    fs::rename(&source_a_root, &disconnected).unwrap();
    fs::write(source_b_root.join("Continued Online.txt"), "online").unwrap();
    ScanRepository::new(&database)
        .upsert_run(&ScanRunRecord {
            id: "resume-with-offline-source".into(),
            source_ids: vec!["source-a".into(), "source-b".into()],
            status: "queued".into(),
            cursor_path: None,
            started_at: None,
            completed_at: None,
            discovered_count: 0,
            processed_count: 0,
            topic_count: 0,
            suggestion_count: 0,
            failure_count: 0,
            error_summary: None,
        })
        .unwrap();
    coordinator.resume_unfinished(Arc::new(|_| {})).unwrap();
    wait_for_terminal(&coordinator, "resume-with-offline-source");

    assert_eq!(
        IndexSourceRepository::new(&database)
            .get("source-a")
            .unwrap()
            .unwrap()
            .status,
        "unavailable"
    );
    assert_eq!(
        DocumentRepository::new(&database)
            .get("document-first")
            .unwrap()
            .unwrap()
            .availability,
        "available"
    );
    assert_eq!(search(&database, "Cursor First").total, 1);
    assert_eq!(search(&database, "Continued Online").total, 1);
}

#[test]
fn restored_backup_rebuilds_derived_data_and_accepts_later_local_updates() {
    let directory = tempfile::tempdir().unwrap();
    let source_root = directory.path().join("archive");
    fs::create_dir(&source_root).unwrap();
    fs::write(
        source_root.join("Archive Plan V1.txt"),
        format!("{BODY_MARKER}: backup one"),
    )
    .unwrap();
    fs::write(
        source_root.join("Archive Plan V2.txt"),
        format!("{BODY_MARKER}: backup two"),
    )
    .unwrap();

    let original = open_database(&directory, "original.sqlite3");
    let source = SourceService::new(&original)
        .add_source(source_root.to_str().unwrap())
        .unwrap();
    let original_coordinator = ScanCoordinator::new(original.clone());
    let initial = original_coordinator
        .start_scan(vec![source.id.clone()], Arc::new(|_| {}))
        .unwrap();
    wait_for_terminal(&original_coordinator, &initial.id);
    let backup_path = directory.path().join("index-backup.json");
    BackupService::new(&original)
        .export(
            backup_path.to_str().unwrap(),
            BackupPreferences {
                default_time_dimension: "modifiedAt".into(),
                workspace_split: 50.0,
            },
        )
        .unwrap();
    assert!(!fs::read_to_string(&backup_path)
        .unwrap()
        .contains(BODY_MARKER));

    let restored = open_database(&directory, "restored.sqlite3");
    BackupService::new(&restored)
        .restore(backup_path.to_str().unwrap())
        .unwrap();
    assert_eq!(active_index_shape(&restored), (2, 1, 1));
    assert_eq!(search(&restored, "Archive Plan").total, 1);
    assert_eq!(search(&restored, BODY_MARKER).total, 0);

    fs::write(
        source_root.join("Archive Plan V3.txt"),
        format!("{BODY_MARKER}: after restore"),
    )
    .unwrap();
    let restored_coordinator = ScanCoordinator::new(restored.clone());
    let summary = restored_coordinator
        .reconcile_directories(&source.id, vec![source_root])
        .unwrap();
    assert_eq!(summary.processed_count, 3);
    assert_eq!(active_index_shape(&restored), (3, 1, 1));
    assert_eq!(search(&restored, "V3").total, 1);
    assert_eq!(search(&restored, BODY_MARKER).total, 0);
}
