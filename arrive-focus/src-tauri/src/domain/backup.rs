use std::collections::HashSet;

use chrono::{DateTime, Datelike, NaiveDate, NaiveTime, Utc, Weekday};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::recurrence::RecurrencePattern;
use crate::DomainError;

pub const CURRENT_BACKUP_FORMAT_VERSION: u32 = 1;
pub const MAX_BACKUP_BYTES: usize = 128 * 1024 * 1024;
const MAX_COLLECTION_RECORDS: usize = 250_000;
const MAX_TOTAL_RECORDS: usize = 1_000_000;
const MAX_PREFERENCES: usize = 100;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupEnvelope {
    pub format_version: u32,
    pub exported_at: String,
    pub data: BackupData,
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupData {
    pub projects: Vec<BackupProject>,
    pub tasks: Vec<BackupTask>,
    pub check_items: Vec<BackupCheckItem>,
    pub recurrence_rules: Vec<BackupRecurrenceRule>,
    pub task_instances: Vec<BackupTaskInstance>,
    pub focus_sessions: Vec<BackupFocusSession>,
    pub active_focus: Option<BackupActiveFocus>,
    pub notes: Vec<BackupNote>,
    pub weekly_goals: Vec<BackupWeeklyGoal>,
    pub preferences: Vec<BackupPreference>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupProject {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub icon: String,
    pub status: String,
    pub started_on: String,
    pub target_on: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupTask {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub category: String,
    pub priority: i64,
    pub scheduled_date: Option<String>,
    pub scheduled_time: Option<String>,
    pub status: String,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupCheckItem {
    pub id: String,
    pub task_id: String,
    pub title: String,
    pub position: i64,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupRecurrenceRule {
    pub id: String,
    pub task_template_id: String,
    pub pattern: RecurrencePattern,
    pub local_time: Option<String>,
    pub timezone: String,
    pub starts_on: String,
    pub ends_on: Option<String>,
    pub status: String,
    pub version: u32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupTaskInstance {
    pub id: String,
    pub recurrence_rule_id: String,
    pub rule_version: u32,
    pub scheduled_date: String,
    pub scheduled_at: Option<String>,
    pub snapshot_title: String,
    pub snapshot_project_id: Option<String>,
    pub status: String,
    pub completed_at: Option<String>,
    pub source_instance_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupFocusSession {
    pub id: String,
    pub task_id: Option<String>,
    pub task_instance_id: Option<String>,
    pub project_id: Option<String>,
    pub planned_seconds: i64,
    pub actual_seconds: i64,
    pub interruption_count: i64,
    pub completion_kind: String,
    pub started_at: String,
    pub ended_at: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupActiveFocus {
    pub task_id: Option<String>,
    pub task_instance_id: Option<String>,
    pub state: String,
    pub planned_seconds: i64,
    pub remaining_seconds: i64,
    pub started_at: String,
    pub target_ends_at: Option<String>,
    pub paused_at: Option<String>,
    pub interruption_count: i64,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupNote {
    pub id: String,
    pub body: String,
    pub note_date: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupWeeklyGoal {
    pub id: String,
    pub week_starts_on: String,
    pub title: String,
    pub category: String,
    pub target_count: i64,
    pub completed_count: i64,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupPreference {
    pub key: String,
    pub value: Value,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupRecordCounts {
    pub projects: usize,
    pub tasks: usize,
    pub check_items: usize,
    pub recurrence_rules: usize,
    pub task_instances: usize,
    pub focus_sessions: usize,
    pub active_focus: usize,
    pub notes: usize,
    pub weekly_goals: usize,
    pub preferences: usize,
    pub total: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupImportSummary {
    pub counts: BackupRecordCounts,
    pub earliest_date: Option<String>,
    pub latest_date: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupExportResult {
    pub path: String,
    pub summary: BackupImportSummary,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInspection {
    pub token: String,
    pub path: String,
    pub format_version: u32,
    pub exported_at: String,
    pub summary: BackupImportSummary,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupRestoreResult {
    pub source_path: String,
    pub snapshot_path: String,
    pub summary: BackupImportSummary,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ValidatedBackup {
    pub envelope: BackupEnvelope,
    pub summary: BackupImportSummary,
}

impl BackupEnvelope {
    pub fn validate(&self) -> Result<BackupImportSummary, DomainError> {
        if self.format_version != CURRENT_BACKUP_FORMAT_VERSION {
            return Err(backup_error(
                "BACKUP_VERSION_UNSUPPORTED",
                format!("unsupported backup format version: {}", self.format_version),
                Some("formatVersion"),
            ));
        }
        parse_timestamp(&self.exported_at, "exportedAt")?;
        self.data.validate()
    }
}

impl BackupData {
    pub fn validate(&self) -> Result<BackupImportSummary, DomainError> {
        let counts = self.record_counts()?;
        validate_unique_ids(
            "projects",
            self.projects.iter().map(|item| item.id.as_str()),
        )?;
        validate_unique_ids("tasks", self.tasks.iter().map(|item| item.id.as_str()))?;
        validate_unique_ids(
            "checkItems",
            self.check_items.iter().map(|item| item.id.as_str()),
        )?;
        validate_unique_ids(
            "recurrenceRules",
            self.recurrence_rules.iter().map(|item| item.id.as_str()),
        )?;
        validate_unique_ids(
            "taskInstances",
            self.task_instances.iter().map(|item| item.id.as_str()),
        )?;
        validate_unique_ids(
            "focusSessions",
            self.focus_sessions.iter().map(|item| item.id.as_str()),
        )?;
        validate_unique_ids("notes", self.notes.iter().map(|item| item.id.as_str()))?;
        validate_unique_ids(
            "weeklyGoals",
            self.weekly_goals.iter().map(|item| item.id.as_str()),
        )?;
        validate_unique_ids(
            "preferences",
            self.preferences.iter().map(|item| item.key.as_str()),
        )?;

        let project_ids = ids(self.projects.iter().map(|item| item.id.as_str()));
        let task_ids = ids(self.tasks.iter().map(|item| item.id.as_str()));
        let rule_ids = ids(self.recurrence_rules.iter().map(|item| item.id.as_str()));
        let instance_ids = ids(self.task_instances.iter().map(|item| item.id.as_str()));

        for project in &self.projects {
            validate_project(project)?;
        }
        for task in &self.tasks {
            validate_task(task)?;
            validate_optional_reference(
                "tasks.projectId",
                task.project_id.as_deref(),
                &project_ids,
            )?;
        }
        let mut check_positions = HashSet::new();
        for item in &self.check_items {
            validate_required_id(&item.id, "checkItems.id")?;
            validate_reference("checkItems.taskId", &item.task_id, &task_ids)?;
            validate_text(&item.title, 1, 200, "checkItems.title")?;
            if item.position < 0 || !check_positions.insert((&item.task_id, item.position)) {
                return Err(invalid_field("checkItems.position"));
            }
            validate_optional_timestamp(item.completed_at.as_deref(), "checkItems.completedAt")?;
            validate_timestamps(&item.created_at, &item.updated_at, "checkItems")?;
        }
        for rule in &self.recurrence_rules {
            validate_rule(rule)?;
            validate_reference(
                "recurrenceRules.taskTemplateId",
                &rule.task_template_id,
                &task_ids,
            )?;
        }
        let mut instance_dates = HashSet::new();
        for instance in &self.task_instances {
            validate_instance(instance)?;
            validate_reference(
                "taskInstances.recurrenceRuleId",
                &instance.recurrence_rule_id,
                &rule_ids,
            )?;
            validate_optional_reference(
                "taskInstances.snapshotProjectId",
                instance.snapshot_project_id.as_deref(),
                &project_ids,
            )?;
            validate_optional_reference(
                "taskInstances.sourceInstanceId",
                instance.source_instance_id.as_deref(),
                &instance_ids,
            )?;
            if instance.source_instance_id.as_deref() == Some(instance.id.as_str())
                || !instance_dates.insert((&instance.recurrence_rule_id, &instance.scheduled_date))
            {
                return Err(invalid_field("taskInstances.sourceInstanceId"));
            }
        }
        for session in &self.focus_sessions {
            validate_focus_session(session)?;
            validate_optional_reference(
                "focusSessions.taskId",
                session.task_id.as_deref(),
                &task_ids,
            )?;
            validate_optional_reference(
                "focusSessions.taskInstanceId",
                session.task_instance_id.as_deref(),
                &instance_ids,
            )?;
            validate_optional_reference(
                "focusSessions.projectId",
                session.project_id.as_deref(),
                &project_ids,
            )?;
        }
        if let Some(active) = &self.active_focus {
            validate_active_focus(active)?;
            validate_optional_reference(
                "activeFocus.taskId",
                active.task_id.as_deref(),
                &task_ids,
            )?;
            validate_optional_reference(
                "activeFocus.taskInstanceId",
                active.task_instance_id.as_deref(),
                &instance_ids,
            )?;
        }
        for note in &self.notes {
            validate_required_id(&note.id, "notes.id")?;
            validate_text(&note.body, 0, 4_000, "notes.body")?;
            parse_date(&note.note_date, "notes.noteDate")?;
            validate_timestamps(&note.created_at, &note.updated_at, "notes")?;
        }
        let mut goal_positions = HashSet::new();
        for goal in &self.weekly_goals {
            validate_goal(goal)?;
            if !goal_positions.insert((&goal.week_starts_on, goal.position)) {
                return Err(invalid_field("weeklyGoals.position"));
            }
        }
        for preference in &self.preferences {
            validate_required_id(&preference.key, "preferences.key")?;
            if !preference.value.is_object() {
                return Err(invalid_field("preferences.value"));
            }
            parse_timestamp(&preference.updated_at, "preferences.updatedAt")?;
        }

        let (earliest_date, latest_date) = self.date_range()?;
        Ok(BackupImportSummary {
            counts,
            earliest_date,
            latest_date,
        })
    }

    fn record_counts(&self) -> Result<BackupRecordCounts, DomainError> {
        let collections = [
            ("projects", self.projects.len()),
            ("tasks", self.tasks.len()),
            ("checkItems", self.check_items.len()),
            ("recurrenceRules", self.recurrence_rules.len()),
            ("taskInstances", self.task_instances.len()),
            ("focusSessions", self.focus_sessions.len()),
            ("notes", self.notes.len()),
            ("weeklyGoals", self.weekly_goals.len()),
        ];
        for (field, count) in collections {
            if count > MAX_COLLECTION_RECORDS {
                return Err(backup_error(
                    "BACKUP_RECORD_LIMIT_EXCEEDED",
                    format!("{field} contains too many records"),
                    Some(field),
                ));
            }
        }
        if self.preferences.len() > MAX_PREFERENCES {
            return Err(backup_error(
                "BACKUP_RECORD_LIMIT_EXCEEDED",
                "preferences contains too many records",
                Some("preferences"),
            ));
        }
        let active_focus = usize::from(self.active_focus.is_some());
        let total = collections.iter().map(|(_, count)| count).sum::<usize>()
            + self.preferences.len()
            + active_focus;
        if total > MAX_TOTAL_RECORDS {
            return Err(backup_error(
                "BACKUP_RECORD_LIMIT_EXCEEDED",
                "backup contains too many records",
                Some("data"),
            ));
        }
        Ok(BackupRecordCounts {
            projects: self.projects.len(),
            tasks: self.tasks.len(),
            check_items: self.check_items.len(),
            recurrence_rules: self.recurrence_rules.len(),
            task_instances: self.task_instances.len(),
            focus_sessions: self.focus_sessions.len(),
            active_focus,
            notes: self.notes.len(),
            weekly_goals: self.weekly_goals.len(),
            preferences: self.preferences.len(),
            total,
        })
    }

    fn date_range(&self) -> Result<(Option<String>, Option<String>), DomainError> {
        let mut dates = Vec::new();
        for value in self
            .projects
            .iter()
            .flat_map(|item| [Some(item.started_on.as_str()), item.target_on.as_deref()])
            .flatten()
            .chain(
                self.tasks
                    .iter()
                    .filter_map(|item| item.scheduled_date.as_deref()),
            )
            .chain(
                self.task_instances
                    .iter()
                    .map(|item| item.scheduled_date.as_str()),
            )
            .chain(self.notes.iter().map(|item| item.note_date.as_str()))
            .chain(
                self.weekly_goals
                    .iter()
                    .map(|item| item.week_starts_on.as_str()),
            )
        {
            dates.push(parse_date(value, "data.dateRange")?);
        }
        for session in &self.focus_sessions {
            dates.push(
                parse_timestamp(&session.started_at, "focusSessions.startedAt")?.date_naive(),
            );
            dates.push(parse_timestamp(&session.ended_at, "focusSessions.endedAt")?.date_naive());
        }
        dates.sort_unstable();
        Ok((
            dates.first().map(ToString::to_string),
            dates.last().map(ToString::to_string),
        ))
    }
}

fn validate_project(project: &BackupProject) -> Result<(), DomainError> {
    validate_required_id(&project.id, "projects.id")?;
    validate_text(&project.name, 1, 80, "projects.name")?;
    validate_text(&project.description, 0, 2_000, "projects.description")?;
    validate_required_id(&project.color, "projects.color")?;
    validate_required_id(&project.icon, "projects.icon")?;
    if !["active", "paused", "completed", "archived"].contains(&project.status.as_str()) {
        return Err(invalid_field("projects.status"));
    }
    let start = parse_date(&project.started_on, "projects.startedOn")?;
    if let Some(target) = &project.target_on {
        if parse_date(target, "projects.targetOn")? < start {
            return Err(invalid_field("projects.targetOn"));
        }
    }
    validate_timestamps(&project.created_at, &project.updated_at, "projects")
}

fn validate_task(task: &BackupTask) -> Result<(), DomainError> {
    validate_required_id(&task.id, "tasks.id")?;
    validate_text(&task.title, 1, 200, "tasks.title")?;
    if !["work", "study", "health", "life"].contains(&task.category.as_str())
        || !(0..=3).contains(&task.priority)
        || !["pending", "completed", "removed"].contains(&task.status.as_str())
    {
        return Err(invalid_field("tasks"));
    }
    if let Some(date) = &task.scheduled_date {
        parse_date(date, "tasks.scheduledDate")?;
    } else if task.scheduled_time.is_some() {
        return Err(invalid_field("tasks.scheduledTime"));
    }
    if let Some(time) = &task.scheduled_time {
        parse_time(time, "tasks.scheduledTime")?;
    }
    validate_optional_timestamp(task.completed_at.as_deref(), "tasks.completedAt")?;
    if (task.status == "completed") != task.completed_at.is_some() {
        return Err(invalid_field("tasks.completedAt"));
    }
    validate_timestamps(&task.created_at, &task.updated_at, "tasks")
}

fn validate_rule(rule: &BackupRecurrenceRule) -> Result<(), DomainError> {
    use super::recurrence::RecurrenceRule;

    validate_required_id(&rule.id, "recurrenceRules.id")?;
    if !["active", "paused", "ended"].contains(&rule.status.as_str()) {
        return Err(invalid_field("recurrenceRules.status"));
    }
    let status = match rule.status.as_str() {
        "active" => super::recurrence::RecurrenceStatus::Active,
        "paused" => super::recurrence::RecurrenceStatus::Paused,
        _ => super::recurrence::RecurrenceStatus::Ended,
    };
    RecurrenceRule {
        id: rule.id.clone(),
        task_template_id: rule.task_template_id.clone(),
        pattern: rule.pattern.clone(),
        local_time: rule.local_time.clone(),
        timezone: rule.timezone.clone(),
        starts_on: rule.starts_on.clone(),
        ends_on: rule.ends_on.clone(),
        status,
        version: rule.version,
    }
    .validate()
    .map_err(|_| invalid_field("recurrenceRules"))?;
    validate_timestamps(&rule.created_at, &rule.updated_at, "recurrenceRules")
}

fn validate_instance(instance: &BackupTaskInstance) -> Result<(), DomainError> {
    validate_required_id(&instance.id, "taskInstances.id")?;
    if instance.rule_version == 0
        || !["pending", "completed", "skipped", "rescheduled"].contains(&instance.status.as_str())
    {
        return Err(invalid_field("taskInstances"));
    }
    parse_date(&instance.scheduled_date, "taskInstances.scheduledDate")?;
    validate_optional_timestamp(
        instance.scheduled_at.as_deref(),
        "taskInstances.scheduledAt",
    )?;
    validate_text(
        &instance.snapshot_title,
        1,
        200,
        "taskInstances.snapshotTitle",
    )?;
    validate_optional_timestamp(
        instance.completed_at.as_deref(),
        "taskInstances.completedAt",
    )?;
    if (instance.status == "completed") != instance.completed_at.is_some() {
        return Err(invalid_field("taskInstances.completedAt"));
    }
    validate_timestamps(&instance.created_at, &instance.updated_at, "taskInstances")
}

fn validate_focus_session(session: &BackupFocusSession) -> Result<(), DomainError> {
    validate_required_id(&session.id, "focusSessions.id")?;
    if session.planned_seconds <= 0
        || session.actual_seconds < 0
        || session.actual_seconds > session.planned_seconds
        || session.interruption_count < 0
        || !["deadline", "early", "cancelled"].contains(&session.completion_kind.as_str())
    {
        return Err(invalid_field("focusSessions"));
    }
    let started = parse_timestamp(&session.started_at, "focusSessions.startedAt")?;
    let ended = parse_timestamp(&session.ended_at, "focusSessions.endedAt")?;
    if ended < started {
        return Err(invalid_field("focusSessions.endedAt"));
    }
    parse_timestamp(&session.created_at, "focusSessions.createdAt")?;
    Ok(())
}

fn validate_active_focus(active: &BackupActiveFocus) -> Result<(), DomainError> {
    if active.task_id.is_some() == active.task_instance_id.is_some()
        || active.planned_seconds <= 0
        || active.remaining_seconds < 0
        || active.remaining_seconds > active.planned_seconds
        || active.interruption_count < 0
    {
        return Err(invalid_field("activeFocus"));
    }
    parse_timestamp(&active.started_at, "activeFocus.startedAt")?;
    parse_timestamp(&active.updated_at, "activeFocus.updatedAt")?;
    match active.state.as_str() {
        "running" if active.target_ends_at.is_some() && active.paused_at.is_none() => {
            validate_optional_timestamp(
                active.target_ends_at.as_deref(),
                "activeFocus.targetEndsAt",
            )
        }
        "paused" if active.target_ends_at.is_none() && active.paused_at.is_some() => {
            validate_optional_timestamp(active.paused_at.as_deref(), "activeFocus.pausedAt")
        }
        _ => Err(invalid_field("activeFocus.state")),
    }
}

fn validate_goal(goal: &BackupWeeklyGoal) -> Result<(), DomainError> {
    validate_required_id(&goal.id, "weeklyGoals.id")?;
    let week = parse_date(&goal.week_starts_on, "weeklyGoals.weekStartsOn")?;
    if week.weekday() != Weekday::Mon
        || !["completed_tasks", "focus_minutes", "active_days"].contains(&goal.category.as_str())
        || goal.target_count <= 0
        || goal.completed_count < 0
        || goal.completed_count > goal.target_count
        || goal.position < 0
    {
        return Err(invalid_field("weeklyGoals"));
    }
    validate_text(&goal.title, 1, 200, "weeklyGoals.title")?;
    validate_timestamps(&goal.created_at, &goal.updated_at, "weeklyGoals")
}

fn validate_unique_ids<'a>(
    field: &str,
    values: impl Iterator<Item = &'a str>,
) -> Result<(), DomainError> {
    let mut seen = HashSet::new();
    for value in values {
        validate_required_id(value, field)?;
        if !seen.insert(value) {
            return Err(backup_error(
                "BACKUP_DUPLICATE_ID",
                format!("duplicate identifier in {field}"),
                Some(field),
            ));
        }
    }
    Ok(())
}

fn ids<'a>(values: impl Iterator<Item = &'a str>) -> HashSet<&'a str> {
    values.collect()
}

fn validate_reference(field: &str, value: &str, ids: &HashSet<&str>) -> Result<(), DomainError> {
    if ids.contains(value) {
        Ok(())
    } else {
        Err(backup_error(
            "BACKUP_REFERENCE_INVALID",
            format!("{field} references a missing record"),
            Some(field),
        ))
    }
}

fn validate_optional_reference(
    field: &str,
    value: Option<&str>,
    ids: &HashSet<&str>,
) -> Result<(), DomainError> {
    value.map_or(Ok(()), |value| validate_reference(field, value, ids))
}

fn validate_required_id(value: &str, field: &str) -> Result<(), DomainError> {
    if value.trim().is_empty() || value.chars().count() > 200 {
        Err(invalid_field(field))
    } else {
        Ok(())
    }
}

fn validate_text(value: &str, min: usize, max: usize, field: &str) -> Result<(), DomainError> {
    let length = value.trim().chars().count();
    if (min..=max).contains(&length) {
        Ok(())
    } else {
        Err(invalid_field(field))
    }
}

fn validate_timestamps(
    created_at: &str,
    updated_at: &str,
    prefix: &str,
) -> Result<(), DomainError> {
    parse_timestamp(created_at, &format!("{prefix}.createdAt"))?;
    parse_timestamp(updated_at, &format!("{prefix}.updatedAt"))?;
    Ok(())
}

fn validate_optional_timestamp(value: Option<&str>, field: &str) -> Result<(), DomainError> {
    value.map_or(Ok(()), |value| parse_timestamp(value, field).map(|_| ()))
}

fn parse_date(value: &str, field: &str) -> Result<NaiveDate, DomainError> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| invalid_field(field))
}

fn parse_time(value: &str, field: &str) -> Result<NaiveTime, DomainError> {
    NaiveTime::parse_from_str(value, "%H:%M").map_err(|_| invalid_field(field))
}

fn parse_timestamp(value: &str, field: &str) -> Result<DateTime<Utc>, DomainError> {
    DateTime::parse_from_rfc3339(value)
        .map(|value| value.with_timezone(&Utc))
        .map_err(|_| invalid_field(field))
}

fn invalid_field(field: &str) -> DomainError {
    backup_error(
        "BACKUP_FIELD_INVALID",
        format!("invalid backup field: {field}"),
        Some(field),
    )
}

pub fn backup_error(code: &str, message: impl Into<String>, field: Option<&str>) -> DomainError {
    DomainError {
        code: code.into(),
        message: message.into(),
        field: field.map(str::to_string),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn timestamp() -> String {
        "2026-07-21T08:00:00Z".into()
    }

    fn valid_envelope() -> BackupEnvelope {
        BackupEnvelope {
            format_version: CURRENT_BACKUP_FORMAT_VERSION,
            exported_at: timestamp(),
            data: BackupData {
                projects: vec![BackupProject {
                    id: "project-1".into(),
                    name: "Ship backup".into(),
                    description: String::new(),
                    color: "mint".into(),
                    icon: "archive".into(),
                    status: "active".into(),
                    started_on: "2026-07-21".into(),
                    target_on: Some("2026-07-31".into()),
                    created_at: timestamp(),
                    updated_at: timestamp(),
                }],
                tasks: vec![BackupTask {
                    id: "task-1".into(),
                    project_id: Some("project-1".into()),
                    title: "Implement parser".into(),
                    category: "work".into(),
                    priority: 3,
                    scheduled_date: Some("2026-07-22".into()),
                    scheduled_time: Some("09:30".into()),
                    status: "pending".into(),
                    completed_at: None,
                    created_at: timestamp(),
                    updated_at: timestamp(),
                }],
                ..BackupData::default()
            },
        }
    }

    #[test]
    fn validates_counts_references_and_date_summary() {
        let summary = valid_envelope().validate().unwrap();
        assert_eq!(summary.counts.projects, 1);
        assert_eq!(summary.counts.tasks, 1);
        assert_eq!(summary.counts.total, 2);
        assert_eq!(summary.earliest_date.as_deref(), Some("2026-07-21"));
        assert_eq!(summary.latest_date.as_deref(), Some("2026-07-31"));
    }

    #[test]
    fn rejects_unknown_versions_and_duplicate_ids() {
        let mut envelope = valid_envelope();
        envelope.format_version = 2;
        assert_eq!(
            envelope.validate().unwrap_err().code,
            "BACKUP_VERSION_UNSUPPORTED"
        );

        let mut envelope = valid_envelope();
        envelope.data.tasks.push(envelope.data.tasks[0].clone());
        assert_eq!(envelope.validate().unwrap_err().code, "BACKUP_DUPLICATE_ID");
    }

    #[test]
    fn rejects_missing_references_before_restore() {
        let mut envelope = valid_envelope();
        envelope.data.tasks[0].project_id = Some("missing".into());
        let error = envelope.validate().unwrap_err();
        assert_eq!(error.code, "BACKUP_REFERENCE_INVALID");
        assert_eq!(error.field.as_deref(), Some("tasks.projectId"));
    }

    #[test]
    fn rejects_invalid_field_ranges() {
        let mut envelope = valid_envelope();
        envelope.data.tasks[0].priority = 4;
        assert_eq!(
            envelope.validate().unwrap_err().code,
            "BACKUP_FIELD_INVALID"
        );
    }
}
