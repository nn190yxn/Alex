use std::time::{Duration, Instant};

use document_index_core::{
    database::Database,
    domain::models::{Page, SearchQuery, SortDirection, SortField, TopicSummary},
    services::SearchService,
};
use rusqlite::params;
use tempfile::TempDir;

const SOURCE_COUNT: usize = 8;
const TOPIC_COUNT: usize = 20_000;
const VERSIONS_PER_TOPIC: usize = 5;
const DOCUMENT_COUNT: usize = TOPIC_COUNT * VERSIONS_PER_TOPIC;
const SEARCH_LIMIT: Duration = Duration::from_millis(500);
const WARMUP_RUNS: usize = 2;
const MEASURED_RUNS: usize = 7;

#[test]
fn fts_query_plan_is_driven_by_the_virtual_table() {
    let database = Database::open_in_memory().expect("diagnostic database should open");
    let plan = database
        .read(|connection| {
            let mut statement = connection.prepare(
                "EXPLAIN QUERY PLAN
                 SELECT COUNT(DISTINCT d.topic_id)
                 FROM topic_search JOIN documents d ON d.id = topic_search.document_id
                 WHERE d.availability = 'available' AND topic_search MATCH ?1",
            )?;
            let rows = statement
                .query_map(["\"quarter\"*"], |row| row.get::<_, String>(3))?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            Ok(rows)
        })
        .expect("FTS plan should be available");
    assert!(
        plan.iter()
            .any(|step| step.contains("topic_search VIRTUAL TABLE")),
        "FTS virtual table should drive the query plan: {plan:?}"
    );
    assert!(
        plan.iter().all(|step| !step.contains("CORRELATED")),
        "FTS query plan must not contain a correlated subquery: {plan:?}"
    );
}

#[test]
#[ignore = "creates 100,000 metadata records; run explicitly in release mode"]
fn common_metadata_searches_complete_within_500ms_after_warmup() {
    let fixture_started = Instant::now();
    let (_directory, database) = build_fixture();
    println!(
        "metadata fixture: {DOCUMENT_COUNT} documents, {TOPIC_COUNT} topics, {} ms",
        fixture_started.elapsed().as_millis()
    );

    let browse = SearchQuery {
        text: String::new(),
        source_ids: Vec::new(),
        directory: None,
        created_from: None,
        created_to: None,
        modified_from: None,
        modified_to: None,
        sort_by: SortField::ModifiedAt,
        sort_direction: SortDirection::Desc,
        page: 2,
        page_size: 20,
    };
    let fts_prefix = SearchQuery {
        text: "quarter".into(),
        page: 1,
        ..browse.clone()
    };
    let combined_filters = SearchQuery {
        source_ids: vec!["source-2".into()],
        directory: Some("C:/Metadata/source-2/division-10".into()),
        created_from: Some("2024-01-01T00:00:00Z".into()),
        created_to: Some("2024-12-31T23:59:59Z".into()),
        modified_from: Some("2025-01-01T00:00:00Z".into()),
        modified_to: Some("2025-12-31T23:59:59Z".into()),
        page: 1,
        ..browse.clone()
    };

    let browse_max = measure_search(&database, "empty topic browse page", &browse);
    let fts_max = measure_search(&database, "common FTS prefix", &fts_prefix);
    let filters_max = measure_search(
        &database,
        "source/directory/dual-time filters",
        &combined_filters,
    );

    assert_under_limit("empty topic browse page", browse_max);
    assert_under_limit("common FTS prefix", fts_max);
    assert_under_limit("source/directory/dual-time filters", filters_max);
}

fn build_fixture() -> (TempDir, Database) {
    let directory = tempfile::tempdir().expect("temporary directory should be created");
    let database = Database::open(directory.path().join("metadata-performance.sqlite3"))
        .expect("performance database should open and migrate");
    let categories = [
        "quarterly-plan",
        "budget-review",
        "contract-archive",
        "research-notes",
        "meeting-minutes",
    ];

    database
        .transaction(|transaction| {
            {
                let mut insert_source = transaction.prepare(
                    "INSERT INTO index_sources(id, path, display_name, enabled, status, added_at)
                     VALUES (?1, ?2, ?3, 1, 'ready', '2026-07-25T00:00:00Z')",
                )?;
                for source in 0..SOURCE_COUNT {
                    insert_source.execute(params![
                        format!("source-{source}"),
                        format!("C:/Metadata/source-{source}"),
                        format!("Performance source {source}"),
                    ])?;
                }
            }

            let mut insert_topic = transaction.prepare(
                "INSERT INTO topics(
                    id, canonical_name, display_name, display_name_manual, grouping_confidence,
                    newest_created_document_id, recently_modified_document_id, created_at, updated_at
                 ) VALUES (?1, ?2, ?3, 0, 'high', ?4, ?4, ?5, ?6)",
            )?;
            let mut insert_document = transaction.prepare(
                "INSERT INTO documents(
                    id, source_id, topic_id, absolute_path, file_identity, file_name,
                    normalized_name, extension, version_label, version_sort_key, size_bytes,
                    created_at, modified_at, availability, manual_topic, indexed_at
                 ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13,
                    'available', 0, '2026-07-25T00:00:00Z'
                 )",
            )?;

            for topic in 0..TOPIC_COUNT {
                let source = topic % SOURCE_COUNT;
                let division = topic % 20;
                let category = categories[topic % categories.len()];
                let topic_id = format!("topic-{topic:05}");
                let normalized_name = format!("{category}-{topic:05}");
                let latest_document_id = format!("doc-{topic:05}-4");
                let topic_created = timestamp(2022 + topic % 4, topic, 0);
                let topic_updated = timestamp(2025 + topic % 2, topic, 4);
                insert_topic.execute(params![
                    topic_id,
                    normalized_name,
                    format!("{} {topic:05}", category.replace('-', " ")),
                    latest_document_id,
                    topic_created,
                    topic_updated,
                ])?;

                for version in 0..VERSIONS_PER_TOPIC {
                    let document_id = format!("doc-{topic:05}-{version}");
                    let file_name = format!("{normalized_name}-v{}.docx", version + 1);
                    insert_document.execute(params![
                        document_id,
                        format!("source-{source}"),
                        topic_id,
                        format!(
                            "C:/Metadata/source-{source}/division-{division}/{category}/{file_name}"
                        ),
                        format!("identity-{topic:05}-{version}"),
                        file_name,
                        normalized_name,
                        "docx",
                        format!("v{}", version + 1),
                        format!("version:{:010}", version + 1),
                        4_096 + ((topic * 31 + version * 127) % 2_000_000) as i64,
                        timestamp(2022 + topic % 4, topic, version),
                        timestamp(2025 + topic % 2, topic, version),
                    ])?;
                }
            }
            Ok(())
        })
        .expect("metadata fixture should be inserted in one transaction");

    let (documents, fts_rows): (u64, u64) = database
        .read(|connection| {
            Ok((
                connection.query_row("SELECT COUNT(*) FROM documents", [], |row| row.get(0))?,
                connection.query_row("SELECT COUNT(*) FROM topic_search", [], |row| row.get(0))?,
            ))
        })
        .expect("fixture counts should be readable");
    assert_eq!(documents as usize, DOCUMENT_COUNT);
    assert_eq!(fts_rows as usize, DOCUMENT_COUNT);
    (directory, database)
}

fn timestamp(year: usize, topic: usize, version: usize) -> String {
    let month = (topic / 4) % 12 + 1;
    let day = topic % 28 + 1;
    let hour = version;
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:00:00Z")
}

fn measure_search(database: &Database, label: &str, query: &SearchQuery) -> Duration {
    let search = SearchService::new(database);
    for _ in 0..WARMUP_RUNS {
        let page = search
            .search_topics(query.clone())
            .expect("warm search should succeed");
        assert_non_empty(label, &page);
    }

    let mut samples = Vec::with_capacity(MEASURED_RUNS);
    for _ in 0..MEASURED_RUNS {
        let started = Instant::now();
        let page = search
            .search_topics(query.clone())
            .expect("measured search should succeed");
        let elapsed = started.elapsed();
        assert_non_empty(label, &page);
        samples.push(elapsed);
    }
    let maximum = samples.iter().copied().max().expect("samples should exist");
    let rendered = samples
        .iter()
        .map(|sample| format!("{:.2}", sample.as_secs_f64() * 1_000.0))
        .collect::<Vec<_>>()
        .join(", ");
    println!(
        "{label}: [{rendered}] ms; max {:.2} ms",
        maximum.as_secs_f64() * 1_000.0
    );
    maximum
}

fn assert_non_empty(label: &str, page: &Page<TopicSummary>) {
    assert!(page.total > 0, "{label} should match fixture topics");
    assert!(
        !page.items.is_empty(),
        "{label} should return a result page"
    );
}

fn assert_under_limit(label: &str, elapsed: Duration) {
    assert!(
        elapsed < SEARCH_LIMIT,
        "{label} took {:.2} ms after warmup, exceeding the 500 ms R10.2 limit",
        elapsed.as_secs_f64() * 1_000.0
    );
}
