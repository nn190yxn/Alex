use std::{fs, sync::Arc, thread, time::Duration};

use document_index_core::{
    database::Database,
    domain::models::{Page, ScanStatus, SearchQuery, SortDirection, SortField, TopicSummary},
    repositories::{DocumentRepository, TopicRepository},
    services::{
        BackupPreferences, BackupService, ScanCoordinator, SearchService, SourceService,
        TopicService,
    },
};
const BODY_MARKER: &str = "CORE_FLOW_BODY_9_2_MUST_STAY_OUT_OF_METADATA";

fn wait_for_completed_scan(coordinator: &ScanCoordinator, scan_id: &str) {
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

fn run_scan(coordinator: &Arc<ScanCoordinator>, source_id: &str) {
    let run = coordinator
        .start_scan(vec![source_id.to_owned()], Arc::new(|_| {}))
        .expect("scan should start");
    wait_for_completed_scan(coordinator, &run.id);
}

fn search(database: &Database, text: &str, sort_by: SortField) -> Page<TopicSummary> {
    SearchService::new(database)
        .search_topics(SearchQuery {
            text: text.into(),
            source_ids: Vec::new(),
            directory: None,
            created_from: None,
            created_to: None,
            modified_from: None,
            modified_to: None,
            sort_by,
            sort_direction: SortDirection::Desc,
            page: 1,
            page_size: 100,
        })
        .expect("metadata search should succeed")
}

fn document_at(
    database: &Database,
    source_id: &str,
    path: &std::path::Path,
) -> document_index_core::repositories::DocumentRecord {
    let path = fs::canonicalize(path).expect("fixture path should remain accessible");
    DocumentRepository::new(database)
        .get_by_source_path(source_id, path.to_str().unwrap())
        .expect("document lookup should succeed")
        .expect("document should be indexed")
}

fn write_fixture(path: &std::path::Path, label: &str) {
    fs::write(path, format!("{BODY_MARKER}:{label}")).expect("fixture document should be written");
}

// P1-P8 are asserted through the public service flow below. P9 remains covered by
// scan_coordinator::tests::cancels_an_active_background_scan and P10 by
// scan_coordinator::tests::records_unavailable_source_and_continues_other_sources.
// The algorithm-level P1-P5 generators remain in sqlite_repositories.rs.
#[test]
fn core_metadata_flow_is_accepted_end_to_end() {
    let fixture = tempfile::tempdir().unwrap();
    let source_root = fixture.path().join("source");
    let archive_north = source_root.join("ArchiveNorth");
    let archive_south = source_root.join("ArchiveSouth");
    let outside_root = fixture.path().join("outside");
    fs::create_dir_all(&archive_north).unwrap();
    fs::create_dir_all(&archive_south).unwrap();
    fs::create_dir_all(&outside_root).unwrap();

    let atlas_v1 = archive_north.join("Project Atlas V1.txt");
    let atlas_v2 = archive_south.join("Project Atlas V2.txt");
    let budget = archive_north.join("Budget Notes.txt");
    let default_docx = archive_south.join("Default Handbook.docx");
    let custom_note = archive_south.join("Field Notes.note");
    let unsupported = archive_south.join("Ignored Payload.bin");
    let outside = outside_root.join("Outside Secret.txt");
    for (path, label) in [
        (&atlas_v1, "atlas-one"),
        (&atlas_v2, "atlas-two"),
        (&budget, "budget"),
        (&default_docx, "default-docx"),
        (&custom_note, "custom-note"),
        (&unsupported, "unsupported"),
        (&outside, "outside-source"),
    ] {
        write_fixture(path, label);
    }

    let database = Arc::new(
        Database::open(fixture.path().join("acceptance.sqlite3"))
            .expect("disk SQLite database should open"),
    );
    let sources = SourceService::new(&database);
    let default_rules = sources.list_extensions().unwrap();
    assert!(default_rules
        .iter()
        .any(|rule| rule.extension == "txt" && rule.built_in && rule.enabled));
    assert!(default_rules
        .iter()
        .any(|rule| rule.extension == "docx" && rule.built_in && rule.enabled));

    let source = sources
        .add_source(source_root.to_str().unwrap())
        .expect("index source should be added");
    let coordinator = ScanCoordinator::new(database.clone());
    run_scan(&coordinator, &source.id);

    assert_eq!(coordinator.index_status().unwrap().document_count, 4);
    assert_eq!(
        search(&database, "Project Atlas", SortField::ModifiedAt).total,
        1
    );
    assert_eq!(
        search(&database, "Project Atlas", SortField::ModifiedAt).items[0].document_count,
        2
    );
    assert_eq!(
        search(&database, "ArchiveNorth", SortField::ModifiedAt).total,
        2
    );
    assert_eq!(
        search(&database, "Default Handbook", SortField::ModifiedAt).total,
        1
    );
    assert_eq!(
        search(&database, "Field Notes", SortField::ModifiedAt).total,
        0
    );
    assert_eq!(
        search(&database, "Ignored Payload", SortField::ModifiedAt).total,
        0
    );
    assert_eq!(
        search(&database, "Outside Secret", SortField::ModifiedAt).total,
        0
    );
    assert_eq!(
        search(&database, BODY_MARKER, SortField::ModifiedAt).total,
        0
    );

    let mut first = document_at(&database, &source.id, &atlas_v1);
    let mut second = document_at(&database, &source.id, &atlas_v2);
    assert_eq!(first.topic_id, second.topic_id);
    first.created_at = Some("2026-07-24T10:00:00.000Z".into());
    first.modified_at = Some("2026-07-24T15:00:00.000Z".into());
    second.created_at = Some("2026-07-24T12:00:00.000Z".into());
    second.modified_at = Some("2026-07-24T13:00:00.000Z".into());
    DocumentRepository::new(&database)
        .upsert_batch(&[first.clone(), second.clone()])
        .unwrap();

    let topics = TopicService::new(&database);
    let created_order = topics
        .detail(&first.topic_id, SortField::CreatedAt, SortDirection::Desc)
        .unwrap();
    assert_eq!(created_order.documents[0].id, second.id);
    assert_eq!(
        created_order
            .summary
            .newest_created_document
            .as_ref()
            .unwrap()
            .id,
        second.id
    );
    assert_eq!(
        created_order
            .summary
            .recently_modified_document
            .as_ref()
            .unwrap()
            .id,
        first.id
    );
    let modified_order = topics
        .detail(&first.topic_id, SortField::ModifiedAt, SortDirection::Desc)
        .unwrap();
    assert_eq!(modified_order.documents[0].id, first.id);
    assert_eq!(
        modified_order.documents,
        topics
            .detail(&first.topic_id, SortField::ModifiedAt, SortDirection::Desc)
            .unwrap()
            .documents
    );

    let enabled = sources
        .update_extensions(&["txt".into(), ".NOTE".into()])
        .unwrap();
    assert!(enabled
        .iter()
        .any(|rule| rule.extension == "note" && !rule.built_in && rule.enabled));
    assert!(enabled
        .iter()
        .any(|rule| rule.extension == "docx" && rule.built_in && !rule.enabled));
    run_scan(&coordinator, &source.id);
    assert_eq!(coordinator.index_status().unwrap().document_count, 4);
    assert_eq!(
        search(&database, "Field Notes", SortField::ModifiedAt).total,
        1
    );
    assert_eq!(
        search(&database, "Default Handbook", SortField::ModifiedAt).total,
        0
    );
    assert_eq!(
        search(&database, "Ignored Payload", SortField::ModifiedAt).total,
        0
    );
    assert_eq!(
        search(&database, BODY_MARKER, SortField::ModifiedAt).total,
        0
    );
    assert_eq!(
        document_at(&database, &source.id, &default_docx).availability,
        "missing"
    );

    let atlas_topic = search(&database, "Project Atlas", SortField::ModifiedAt).items[0].clone();
    let budget_topic = search(&database, "Budget Notes", SortField::ModifiedAt).items[0].clone();
    let budget_document = document_at(&database, &source.id, &budget);
    let renamed = topics
        .rename_topic(&atlas_topic.id, "Atlas Curated")
        .unwrap();
    assert_eq!(renamed.summary.display_name, "Atlas Curated");
    assert!(renamed.display_name_manual);
    assert_eq!(
        search(&database, "Atlas Curated", SortField::ModifiedAt).total,
        1
    );

    let merged = topics
        .merge_topics(
            &[atlas_topic.id.clone(), budget_topic.id],
            "Portfolio Curated",
        )
        .unwrap();
    assert_eq!(merged.summary.document_count, 3);
    assert_eq!(merged.summary.display_name, "Portfolio Curated");
    let split = topics
        .move_documents_to_topic(&[budget_document.id.clone()], None, Some("Budget Split"))
        .unwrap();
    let portfolio = split
        .iter()
        .find(|detail| detail.summary.display_name == "Portfolio Curated")
        .unwrap();
    let split_budget = split
        .iter()
        .find(|detail| detail.summary.display_name == "Budget Split")
        .unwrap();
    assert_eq!(portfolio.summary.document_count, 2);
    assert_eq!(split_budget.summary.document_count, 1);
    let portfolio_id = portfolio.summary.id.clone();
    let split_budget_id = split_budget.summary.id.clone();

    run_scan(&coordinator, &source.id);
    let rescanned_first = document_at(&database, &source.id, &atlas_v1);
    let rescanned_second = document_at(&database, &source.id, &atlas_v2);
    let rescanned_budget = document_at(&database, &source.id, &budget);
    assert_eq!(rescanned_first.topic_id, portfolio_id);
    assert_eq!(rescanned_second.topic_id, portfolio_id);
    assert_eq!(rescanned_budget.topic_id, split_budget_id);
    assert!(rescanned_first.manual_topic);
    assert!(rescanned_second.manual_topic);
    assert!(rescanned_budget.manual_topic);
    assert_eq!(
        topics
            .detail(&portfolio_id, SortField::ModifiedAt, SortDirection::Desc)
            .unwrap()
            .summary
            .display_name,
        "Portfolio Curated"
    );
    assert_eq!(
        topics
            .detail(&split_budget_id, SortField::ModifiedAt, SortDirection::Desc)
            .unwrap()
            .summary
            .display_name,
        "Budget Split"
    );

    let (orphan_documents, fts_documents, manual_rules): (i64, i64, i64) = database
        .read(|connection| {
            Ok((
                connection.query_row(
                    "SELECT COUNT(*) FROM documents d LEFT JOIN topics t ON t.id = d.topic_id WHERE t.id IS NULL",
                    [],
                    |row| row.get(0),
                )?,
                connection.query_row("SELECT COUNT(*) FROM topic_search", [], |row| row.get(0))?,
                connection.query_row("SELECT COUNT(*) FROM manual_grouping_rules", [], |row| row.get(0))?,
            ))
        })
        .unwrap();
    let document_count: i64 = database
        .read(|connection| {
            connection.query_row("SELECT COUNT(*) FROM documents", [], |row| row.get(0))
        })
        .unwrap();
    assert_eq!(orphan_documents, 0);
    assert_eq!(fts_documents, document_count);
    assert_eq!(manual_rules, 3);
    assert!(DocumentRepository::new(&database)
        .get_by_source_path(&source.id, outside.to_str().unwrap())
        .unwrap()
        .is_none());
    assert!(DocumentRepository::new(&database)
        .get_by_source_path(&source.id, unsupported.to_str().unwrap())
        .unwrap()
        .is_none());

    let first_order = search(&database, "", SortField::ModifiedAt)
        .items
        .into_iter()
        .map(|topic| topic.id)
        .collect::<Vec<_>>();
    let second_order = search(&database, "", SortField::ModifiedAt)
        .items
        .into_iter()
        .map(|topic| topic.id)
        .collect::<Vec<_>>();
    assert_eq!(first_order, second_order);

    let backup_path = fixture.path().join("core-flow-backup.json");
    BackupService::new(&database)
        .export(
            backup_path.to_str().unwrap(),
            BackupPreferences {
                default_time_dimension: "modifiedAt".into(),
                workspace_split: 50.0,
            },
        )
        .unwrap();
    assert!(!fs::read_to_string(backup_path)
        .unwrap()
        .contains(BODY_MARKER));
    assert_eq!(
        search(&database, BODY_MARKER, SortField::ModifiedAt).total,
        0
    );

    assert!(
        TopicRepository::new(&database)
            .get(&portfolio_id)
            .unwrap()
            .unwrap()
            .display_name_manual
    );
}
