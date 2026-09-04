use rusqlite::{params, Row};

use super::database::Database;
use crate::{domain::calendar::CalendarProject, DomainError};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AnalysisEvent {
    pub task_id: String,
    pub task_instance_id: Option<String>,
    pub title: String,
    pub category: String,
    pub project: Option<CalendarProject>,
    pub completed_at: Option<String>,
    pub actual_seconds: u64,
    pub effective: bool,
    pub cancelled: bool,
}

pub struct AnalysisRepository<'a> {
    database: &'a Database,
}

impl<'a> AnalysisRepository<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn list_completed_events(
        &self,
        utc_start: &str,
        utc_end: &str,
    ) -> Result<Vec<AnalysisEvent>, DomainError> {
        self.database.read(|connection| {
            let mut statement = connection.prepare(
                "SELECT t.id, NULL, t.title, t.category, p.id, p.name, p.color, p.icon, p.status,
                        t.completed_at
                 FROM tasks t
                 LEFT JOIN projects p ON p.id = t.project_id
                 WHERE t.status = 'completed'
                   AND julianday(t.completed_at) >= julianday(?1)
                   AND julianday(t.completed_at) < julianday(?2)
                   AND NOT EXISTS (SELECT 1 FROM recurrence_rules r WHERE r.task_template_id = t.id)
                 UNION ALL
                 SELECT r.task_template_id, i.id, i.snapshot_title, t.category,
                        p.id, p.name, p.color, p.icon, p.status, i.completed_at
                 FROM task_instances i
                 JOIN recurrence_rules r ON r.id = i.recurrence_rule_id
                 JOIN tasks t ON t.id = r.task_template_id
                 LEFT JOIN projects p ON p.id = i.snapshot_project_id
                 WHERE i.status = 'completed'
                   AND julianday(i.completed_at) >= julianday(?1)
                   AND julianday(i.completed_at) < julianday(?2)",
            )?;
            let events = statement
                .query_map(params![utc_start, utc_end], map_completed)?
                .collect();
            events
        })
    }

    pub fn list_focus_events(
        &self,
        utc_start: &str,
        utc_end: &str,
    ) -> Result<Vec<AnalysisEvent>, DomainError> {
        self.database.read(|connection| {
            let mut statement = connection.prepare(
                "SELECT COALESCE(f.task_id, r.task_template_id), f.task_instance_id,
                        COALESCE(t.title, i.snapshot_title, template.title, 'Independent focus'),
                        COALESCE(t.category, template.category, 'work'),
                        p.id, p.name, p.color, p.icon, p.status,
                        f.actual_seconds, f.completion_kind
                 FROM focus_sessions f
                 LEFT JOIN tasks t ON t.id = f.task_id
                 LEFT JOIN task_instances i ON i.id = f.task_instance_id
                 LEFT JOIN recurrence_rules r ON r.id = i.recurrence_rule_id
                 LEFT JOIN tasks template ON template.id = r.task_template_id
                 LEFT JOIN projects p ON p.id = f.project_id
                 WHERE julianday(f.ended_at) >= julianday(?1)
                   AND julianday(f.ended_at) < julianday(?2)
                   AND COALESCE(f.task_id, r.task_template_id) IS NOT NULL",
            )?;
            let events = statement
                .query_map(params![utc_start, utc_end], map_focus)?
                .collect();
            events
        })
    }
}

fn map_completed(row: &Row<'_>) -> rusqlite::Result<AnalysisEvent> {
    Ok(AnalysisEvent {
        task_id: row.get(0)?,
        task_instance_id: row.get(1)?,
        title: row.get(2)?,
        category: row.get(3)?,
        project: map_project(row, 4)?,
        completed_at: row.get(9)?,
        actual_seconds: 0,
        effective: false,
        cancelled: false,
    })
}

fn map_focus(row: &Row<'_>) -> rusqlite::Result<AnalysisEvent> {
    let actual_seconds = row.get::<_, i64>(9)?;
    let completion_kind = row.get::<_, String>(10)?;
    Ok(AnalysisEvent {
        task_id: row.get(0)?,
        task_instance_id: row.get(1)?,
        title: row.get(2)?,
        category: row.get(3)?,
        project: map_project(row, 4)?,
        completed_at: None,
        actual_seconds: u64::try_from(actual_seconds)
            .map_err(|_| invalid_type(9, "actual_seconds"))?,
        effective: matches!(completion_kind.as_str(), "deadline" | "early"),
        cancelled: completion_kind == "cancelled",
    })
}

fn map_project(row: &Row<'_>, start: usize) -> rusqlite::Result<Option<CalendarProject>> {
    let Some(id) = row.get::<_, Option<String>>(start)? else {
        return Ok(None);
    };
    Ok(Some(CalendarProject {
        id,
        name: row.get(start + 1)?,
        color: row.get(start + 2)?,
        icon: row.get(start + 3)?,
        status: row.get(start + 4)?,
    }))
}

fn invalid_type(index: usize, name: &str) -> rusqlite::Error {
    rusqlite::Error::InvalidColumnType(index, name.into(), rusqlite::types::Type::Text)
}
