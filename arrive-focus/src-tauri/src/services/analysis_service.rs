use std::{
    cmp::Ordering,
    collections::{BTreeMap, HashSet},
};

use chrono::{DateTime, Duration, LocalResult, NaiveDate, TimeZone, Utc};
use chrono_tz::Tz;

use crate::{
    domain::analysis::{AnalysisQuery, AnalysisSort, AnalysisSummary, TaskAnalysisRow},
    repositories::{
        analysis_repository::{AnalysisEvent, AnalysisRepository},
        database::Database,
    },
    DomainError,
};

pub struct AnalysisService<'a> {
    database: &'a Database,
}

impl<'a> AnalysisService<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn get_task_breakdown(&self, query: AnalysisQuery) -> Result<AnalysisSummary, DomainError> {
        let starts_on = parse_date(&query.starts_on, "startsOn")?;
        let ends_on = parse_date(&query.ends_on, "endsOn")?;
        if starts_on > ends_on {
            return Err(error(
                "ANALYSIS_RANGE_INVALID",
                "startsOn must be on or before endsOn",
                None,
            ));
        }
        let timezone = query.timezone.parse::<Tz>().map_err(|_| {
            error(
                "ANALYSIS_TIMEZONE_INVALID",
                "timezone must be a valid IANA timezone",
                Some("timezone"),
            )
        })?;
        let after_end = ends_on
            .checked_add_signed(Duration::days(1))
            .ok_or_else(|| {
                error(
                    "ANALYSIS_DATE_INVALID",
                    "date range exceeds supported dates",
                    None,
                )
            })?;
        let utc_start = local_day_start(starts_on, timezone)?;
        let utc_end = local_day_start(after_end, timezone)?;
        let repository = AnalysisRepository::new(self.database);
        let mut events =
            repository.list_completed_events(&utc_start.to_rfc3339(), &utc_end.to_rfc3339())?;
        events
            .extend(repository.list_focus_events(&utc_start.to_rfc3339(), &utc_end.to_rfc3339())?);
        Ok(build_summary(&query, events))
    }
}

fn build_summary(query: &AnalysisQuery, events: Vec<AnalysisEvent>) -> AnalysisSummary {
    let mut rows: BTreeMap<String, TaskAnalysisRow> = BTreeMap::new();
    let mut instance_ids: BTreeMap<String, HashSet<String>> = BTreeMap::new();
    for event in events {
        let row = rows
            .entry(event.task_id.clone())
            .or_insert_with(|| TaskAnalysisRow {
                task_id: event.task_id.clone(),
                task_instance_count: 0,
                title: event.title.clone(),
                category: event.category.clone(),
                project: event.project.clone(),
                completed_count: 0,
                focus_seconds: 0,
                effective_session_count: 0,
                cancelled_session_count: 0,
                last_completed_at: None,
            });
        if event.completed_at.is_some() {
            row.completed_count = row.completed_count.saturating_add(1);
            if row
                .last_completed_at
                .as_ref()
                .map_or(true, |current| event.completed_at.as_ref() > Some(current))
            {
                row.last_completed_at = event.completed_at.clone();
            }
        }
        if event.effective {
            row.focus_seconds = row.focus_seconds.saturating_add(event.actual_seconds);
        }
        if event.effective {
            row.effective_session_count = row.effective_session_count.saturating_add(1);
        }
        if event.cancelled {
            row.cancelled_session_count = row.cancelled_session_count.saturating_add(1);
        }
        if let Some(instance_id) = event.task_instance_id {
            instance_ids
                .entry(event.task_id)
                .or_default()
                .insert(instance_id);
        }
    }
    for (task_id, ids) in instance_ids {
        if let Some(row) = rows.get_mut(&task_id) {
            row.task_instance_count = ids.len() as u32;
        }
    }
    let mut rows = rows.into_values().collect::<Vec<_>>();
    rows.sort_by(|left, right| compare_rows(left, right, query.sort));
    let summary = rows.iter().fold(
        (0_u32, 0_u64, 0_u32, 0_u32),
        |(completed, focus, effective, cancelled), row| {
            (
                completed.saturating_add(row.completed_count),
                focus.saturating_add(row.focus_seconds),
                effective.saturating_add(row.effective_session_count),
                cancelled.saturating_add(row.cancelled_session_count),
            )
        },
    );
    AnalysisSummary {
        starts_on: query.starts_on.clone(),
        ends_on: query.ends_on.clone(),
        task_count: rows.len() as u32,
        completed_count: summary.0,
        focus_seconds: summary.1,
        effective_session_count: summary.2,
        cancelled_session_count: summary.3,
        rows,
    }
}

fn compare_rows(left: &TaskAnalysisRow, right: &TaskAnalysisRow, sort: AnalysisSort) -> Ordering {
    let primary = match sort {
        AnalysisSort::CompletedCount => right.completed_count.cmp(&left.completed_count),
        AnalysisSort::FocusSeconds => right.focus_seconds.cmp(&left.focus_seconds),
        AnalysisSort::EffectiveSessionCount => right
            .effective_session_count
            .cmp(&left.effective_session_count),
        AnalysisSort::Title => left.title.cmp(&right.title),
    };
    primary
        .then_with(|| left.title.cmp(&right.title))
        .then_with(|| left.task_id.cmp(&right.task_id))
}

fn parse_date(value: &str, field: &str) -> Result<NaiveDate, DomainError> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
        error(
            "ANALYSIS_DATE_INVALID",
            "date must use YYYY-MM-DD",
            Some(field),
        )
    })
}

fn local_day_start(date: NaiveDate, timezone: Tz) -> Result<DateTime<Utc>, DomainError> {
    let midnight = date.and_hms_opt(0, 0, 0).expect("midnight is valid");
    for minute in 0..=1_440 {
        let local = midnight + Duration::minutes(minute);
        match timezone.from_local_datetime(&local) {
            LocalResult::Single(value) => return Ok(value.with_timezone(&Utc)),
            LocalResult::Ambiguous(first, second) => {
                return Ok(first.min(second).with_timezone(&Utc))
            }
            LocalResult::None => {}
        }
    }
    Err(error(
        "ANALYSIS_TIMEZONE_INVALID",
        "timezone has no valid instant for a calendar boundary",
        Some("timezone"),
    ))
}

fn error(code: &str, message: &str, field: Option<&str>) -> DomainError {
    DomainError {
        code: code.into(),
        message: message.into(),
        field: field.map(str::to_string),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::calendar::CalendarProject;

    fn event(
        task_id: &str,
        instance_id: Option<&str>,
        completed_at: Option<&str>,
        seconds: u64,
        effective: bool,
        cancelled: bool,
    ) -> AnalysisEvent {
        AnalysisEvent {
            task_id: task_id.into(),
            task_instance_id: instance_id.map(str::to_string),
            title: format!("Task {task_id}"),
            category: "work".into(),
            project: None::<CalendarProject>,
            completed_at: completed_at.map(str::to_string),
            actual_seconds: seconds,
            effective,
            cancelled,
        }
    }

    #[test]
    fn aggregates_events_and_keeps_cancelled_sessions_out_of_effective_metrics() {
        let query = AnalysisQuery {
            starts_on: "2026-07-20".into(),
            ends_on: "2026-07-21".into(),
            timezone: "UTC".into(),
            sort: AnalysisSort::CompletedCount,
        };
        let result = build_summary(
            &query,
            vec![
                event(
                    "task-1",
                    Some("instance-1"),
                    Some("2026-07-20T10:00:00Z"),
                    0,
                    false,
                    false,
                ),
                event("task-1", Some("instance-1"), None, 900, true, false),
                event("task-1", Some("instance-2"), None, 300, false, true),
                event("task-2", None, None, 0, false, false),
            ],
        );
        assert_eq!(result.task_count, 2);
        assert_eq!(result.completed_count, 1);
        assert_eq!(result.focus_seconds, 900);
        assert_eq!(result.effective_session_count, 1);
        assert_eq!(result.cancelled_session_count, 1);
        assert_eq!(result.rows[0].task_instance_count, 2);
    }

    #[test]
    fn validates_date_order_and_timezone() {
        let service_query = AnalysisQuery {
            starts_on: "2026-07-22".into(),
            ends_on: "2026-07-20".into(),
            timezone: "UTC".into(),
            sort: AnalysisSort::Title,
        };
        assert_eq!(
            parse_date(&service_query.starts_on, "startsOn").unwrap(),
            NaiveDate::from_ymd_opt(2026, 7, 22).unwrap()
        );
        assert_eq!(
            "ANALYSIS_DATE_INVALID",
            parse_date("bad", "startsOn").unwrap_err().code
        );
        assert!("Mars/Phobos".parse::<Tz>().is_err());
    }
}
