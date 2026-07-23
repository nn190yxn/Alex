use std::path::Path;

use arrive_focus_core::{
    repositories::database::Database, services::backup_service::BackupService,
};
use chrono::{TimeZone, Utc};
use rusqlite::{params, OptionalExtension};
use serde_json::json;

const NOW: &str = "2026-07-21T08:00:00Z";

#[test]
fn validation_rejects_unknown_versions_and_broken_references() {
    let source_directory = tempfile::tempdir().unwrap();
    let source = Database::open(source_directory.path().join("source.sqlite3")).unwrap();
    seed_source(&source);
    let json = export_json(&source);

    let mut unknown_version: serde_json::Value = serde_json::from_str(&json).unwrap();
    unknown_version["formatVersion"] = json!(99);
    let version_error = BackupService::parse_json(&unknown_version.to_string()).unwrap_err();
    assert_eq!(version_error.code, "BACKUP_VERSION_UNSUPPORTED");
    assert_eq!(version_error.field.as_deref(), Some("formatVersion"));

    let mut broken_reference: serde_json::Value = serde_json::from_str(&json).unwrap();
    broken_reference["data"]["tasks"][0]["projectId"] = json!("missing-project");
    let reference_error = BackupService::parse_json(&broken_reference.to_string()).unwrap_err();
    assert_eq!(reference_error.code, "BACKUP_REFERENCE_INVALID");
    assert_eq!(reference_error.field.as_deref(), Some("tasks.projectId"));
}

#[test]
fn restore_replaces_business_data_and_creates_a_readable_snapshot() {
    let source_directory = tempfile::tempdir().unwrap();
    let source = Database::open(source_directory.path().join("source.sqlite3")).unwrap();
    seed_source(&source);
    let backup = BackupService::parse_json(&export_json(&source)).unwrap();

    let target_directory = tempfile::tempdir().unwrap();
    let target_path = target_directory.path().join("target.sqlite3");
    let target = Database::open(&target_path).unwrap();
    seed_target(&target);
    let snapshot_directory = target_directory.path().join("backups");

    let result = BackupService::new(&target)
        .restore(
            backup,
            Path::new("selected.json"),
            &snapshot_directory,
            Utc.with_ymd_and_hms(2026, 7, 21, 10, 0, 0).unwrap(),
        )
        .unwrap();

    let snapshot = BackupService::inspect_path(Path::new(&result.snapshot_path)).unwrap();
    assert_eq!(snapshot.envelope.data.projects.len(), 1);
    assert_eq!(snapshot.envelope.data.projects[0].id, "existing-project");

    let restored = BackupService::parse_json(&export_json(&target)).unwrap();
    assert_eq!(restored.envelope.data.projects[0].id, "incoming-project");
    assert_eq!(
        restored.envelope.data.tasks[0].project_id.as_deref(),
        Some("incoming-project")
    );
    assert_eq!(restored.summary.counts.total, 2);

    drop(target);
    let reopened = Database::open(&target_path).unwrap();
    assert_eq!(
        project_name(&reopened, "incoming-project").as_deref(),
        Some("Incoming data")
    );
    assert_eq!(project_name(&reopened, "existing-project"), None);
}

#[test]
fn failed_restore_rolls_back_data_and_preserves_the_pre_restore_snapshot() {
    let source_directory = tempfile::tempdir().unwrap();
    let source = Database::open(source_directory.path().join("source.sqlite3")).unwrap();
    seed_source(&source);
    let backup = BackupService::parse_json(&export_json(&source)).unwrap();

    let target_directory = tempfile::tempdir().unwrap();
    let target = Database::open(target_directory.path().join("target.sqlite3")).unwrap();
    seed_target(&target);
    target
        .write(|transaction| {
            transaction.execute_batch(
                "CREATE TRIGGER reject_incoming_project
                 BEFORE INSERT ON projects
                 WHEN NEW.id = 'incoming-project'
                 BEGIN
                     SELECT RAISE(ABORT, 'injected restore failure');
                 END;",
            )
        })
        .unwrap();

    let error = BackupService::new(&target)
        .restore(
            backup,
            Path::new("selected.json"),
            &target_directory.path().join("backups"),
            Utc.with_ymd_and_hms(2026, 7, 21, 10, 0, 0).unwrap(),
        )
        .unwrap_err();

    assert_eq!(error.code, "BACKUP_RESTORE_FAILED");
    assert_eq!(
        project_name(&target, "existing-project").as_deref(),
        Some("Existing data")
    );
    assert_eq!(project_name(&target, "incoming-project"), None);

    let snapshot_path = target
        .read(|connection| {
            connection.query_row(
                "SELECT path FROM backup_history WHERE kind = 'pre_restore'",
                [],
                |row| row.get::<_, String>(0),
            )
        })
        .unwrap();
    let snapshot = BackupService::inspect_path(Path::new(&snapshot_path)).unwrap();
    assert_eq!(snapshot.envelope.data.projects.len(), 1);
    assert_eq!(snapshot.envelope.data.projects[0].id, "existing-project");
}

fn export_json(database: &Database) -> String {
    BackupService::new(database)
        .export_json_at(Utc.with_ymd_and_hms(2026, 7, 21, 9, 0, 0).unwrap())
        .unwrap()
}

fn seed_source(database: &Database) {
    database
        .write(|transaction| {
            transaction.execute(
                "INSERT INTO projects(id, name, description, color, icon, status, started_on, created_at, updated_at) VALUES ('incoming-project', 'Incoming data', '', 'mint', 'folder', 'active', '2026-07-21', ?1, ?1)",
                [NOW],
            )?;
            transaction.execute(
                "INSERT INTO tasks(id, project_id, title, category, priority, status, created_at, updated_at) VALUES ('incoming-task', 'incoming-project', 'Restore backup', 'work', 2, 'pending', ?1, ?1)",
                [NOW],
            )?;
            Ok(())
        })
        .unwrap();
}

fn seed_target(database: &Database) {
    database
        .write(|transaction| {
            transaction.execute(
                "INSERT INTO projects(id, name, description, color, icon, status, started_on, created_at, updated_at) VALUES ('existing-project', 'Existing data', '', 'blue', 'folder', 'active', '2026-07-01', ?1, ?1)",
                [NOW],
            )?;
            transaction.execute(
                "INSERT INTO window_state(window_label, x, y, width, height, scale_factor, maximized, updated_at) VALUES ('main', 0, 0, 1200, 800, 1, 0, ?1)",
                [NOW],
            )?;
            Ok(())
        })
        .unwrap();
}

fn project_name(database: &Database, project_id: &str) -> Option<String> {
    database
        .read(|connection| {
            connection
                .query_row(
                    "SELECT name FROM projects WHERE id = ?1",
                    params![project_id],
                    |row| row.get(0),
                )
                .optional()
        })
        .unwrap()
}
