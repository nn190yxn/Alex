use crate::{
    domain::{
        focus::{FocusCompletionKind, FocusSession},
        notification::{
            NotificationCandidate, NotificationKind, ReminderWindow, SystemNotification,
        },
        settings::{NotificationPermissionState, NotificationPreferences, NotificationSettings},
    },
    repositories::{
        database::Database,
        notification_repository::{NotificationRepository, NotificationReservation},
        preferences_repository::PreferencesRepository,
        recurrence_repository::RecurrenceRepository,
        task_repository::TaskRepository,
    },
    DomainError,
};

pub trait NotificationPublisher {
    fn permission_state(&self) -> Result<NotificationPermissionState, DomainError>;
    fn publish(&self, notification: &SystemNotification) -> Result<(), DomainError>;
}

pub struct NotificationService<'a> {
    database: &'a Database,
}

impl<'a> NotificationService<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn settings(
        &self,
        publisher: &impl NotificationPublisher,
    ) -> Result<NotificationSettings, DomainError> {
        Ok(NotificationSettings {
            preferences: PreferencesRepository::new(self.database).get_notifications()?,
            permission_state: publisher.permission_state()?,
        })
    }

    pub fn update_preferences(
        &self,
        preferences: NotificationPreferences,
    ) -> Result<NotificationPreferences, DomainError> {
        PreferencesRepository::new(self.database).set_notifications(preferences)
    }

    pub fn notify_focus_completed(
        &self,
        session: &FocusSession,
        publisher: &impl NotificationPublisher,
    ) -> Result<bool, DomainError> {
        if session.completion_kind == FocusCompletionKind::Cancelled {
            return Ok(false);
        }
        let preferences = PreferencesRepository::new(self.database).get_notifications()?;
        if !preferences.notifications_enabled {
            return Ok(false);
        }
        let title = self.focus_title(session)?;
        self.publish_candidate(
            NotificationCandidate {
                kind: NotificationKind::FocusCompleted,
                source_id: session.id.clone(),
                title,
                scheduled_for: session.ended_at.to_rfc3339(),
            },
            SystemNotification {
                title: "专注完成".into(),
                body: format!(
                    "{} · 已专注 {}",
                    self.focus_title(session)?,
                    format_duration(session.actual_seconds)
                ),
                sound_enabled: preferences.sound_enabled,
            },
            publisher,
        )
    }

    pub fn reconcile_task_reminders(
        &self,
        window: ReminderWindow,
        publisher: &impl NotificationPublisher,
    ) -> Result<usize, DomainError> {
        let preferences = PreferencesRepository::new(self.database).get_notifications()?;
        if !preferences.notifications_enabled {
            return Ok(0);
        }
        let candidates = NotificationRepository::new(self.database).list_due_tasks(window)?;
        let mut delivered = 0;
        let mut first_error = None;
        for candidate in candidates {
            let notification = SystemNotification {
                title: "任务到时".into(),
                body: candidate.title.clone(),
                sound_enabled: preferences.sound_enabled,
            };
            match self.publish_candidate(candidate, notification, publisher) {
                Ok(true) => delivered += 1,
                Ok(false) => {}
                Err(error) => {
                    first_error.get_or_insert(error);
                }
            }
        }
        first_error.map_or(Ok(delivered), Err)
    }

    fn publish_candidate(
        &self,
        candidate: NotificationCandidate,
        notification: SystemNotification,
        publisher: &impl NotificationPublisher,
    ) -> Result<bool, DomainError> {
        let repository = NotificationRepository::new(self.database);
        match repository.reserve(
            candidate.kind,
            &candidate.source_id,
            &candidate.scheduled_for,
            notification.sound_enabled,
        )? {
            NotificationReservation::Acquired => {}
            NotificationReservation::AlreadySent => return Ok(false),
            NotificationReservation::InFlight => {
                return Err(DomainError {
                    code: "NOTIFICATION_DELIVERY_IN_FLIGHT".into(),
                    message: "notification delivery is still in flight".into(),
                    field: None,
                });
            }
        }
        match publisher.publish(&notification) {
            Ok(()) => {
                repository.mark_sent(
                    candidate.kind,
                    &candidate.source_id,
                    &candidate.scheduled_for,
                )?;
                Ok(true)
            }
            Err(error) => {
                repository.mark_failed(
                    candidate.kind,
                    &candidate.source_id,
                    &candidate.scheduled_for,
                    &error.code,
                )?;
                Err(error)
            }
        }
    }

    fn focus_title(&self, session: &FocusSession) -> Result<String, DomainError> {
        if let Some(task_id) = session.task_id.as_deref() {
            if let Some(task) = TaskRepository::new(self.database).get(task_id)? {
                return Ok(task.title);
            }
        }
        if let Some(instance_id) = session.task_instance_id.as_deref() {
            if let Some(instance) =
                RecurrenceRepository::new(self.database).get_instance(instance_id)?
            {
                return Ok(instance.snapshot_title);
            }
        }
        Ok("本轮专注".into())
    }
}

fn format_duration(seconds: i64) -> String {
    let seconds = seconds.max(0);
    let minutes = seconds / 60;
    let remaining = seconds % 60;
    match (minutes, remaining) {
        (0, seconds) => format!("{seconds} 秒"),
        (minutes, 0) => format!("{minutes} 分钟"),
        (minutes, seconds) => format!("{minutes} 分 {seconds} 秒"),
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use chrono::{FixedOffset, TimeZone, Utc};
    use proptest::prelude::*;

    use super::*;
    use crate::{
        repositories::{focus_repository::FocusRepository, task_repository::TaskRecord},
        services::focus_service::FocusService,
    };

    struct FakePublisher {
        published: Mutex<Vec<SystemNotification>>,
        error: Option<DomainError>,
    }

    impl FakePublisher {
        fn working() -> Self {
            Self {
                published: Mutex::new(Vec::new()),
                error: None,
            }
        }
    }

    impl NotificationPublisher for FakePublisher {
        fn permission_state(&self) -> Result<NotificationPermissionState, DomainError> {
            Ok(NotificationPermissionState::Granted)
        }

        fn publish(&self, notification: &SystemNotification) -> Result<(), DomainError> {
            if let Some(error) = self.error.clone() {
                return Err(error);
            }
            self.published.lock().unwrap().push(notification.clone());
            Ok(())
        }
    }

    fn task(database: &Database, id: &str, title: &str, time: Option<&str>) {
        task_at(database, id, title, "2026-07-20", time);
    }

    fn task_at(database: &Database, id: &str, title: &str, date: &str, time: Option<&str>) {
        let stamp = "2026-07-20T00:00:00Z".to_string();
        TaskRepository::new(database)
            .insert(&TaskRecord {
                id: id.into(),
                project_id: None,
                title: title.into(),
                category: "work".into(),
                priority: 0,
                scheduled_date: Some(date.into()),
                scheduled_time: time.map(str::to_string),
                status: "pending".into(),
                completed_at: None,
                created_at: stamp.clone(),
                updated_at: stamp,
            })
            .unwrap();
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(64))]

        #[test]
        fn p7_repeated_event_processing_creates_at_most_one_notification_record(
            event_kind in 0_u8..3,
            source_id in "[A-Za-z0-9][A-Za-z0-9_-]{0,23}",
            title in "[A-Za-z0-9][A-Za-z0-9 _-]{0,31}",
            day in 1_u32..29,
            hour in 0_u32..24,
            minute in 0_u32..60,
            repeat_count in 2_usize..9,
            sound_enabled in any::<bool>(),
            publisher_fails in any::<bool>(),
        ) {
            let database = Database::open_in_memory().unwrap();
            PreferencesRepository::new(&database)
                .set_notifications(NotificationPreferences {
                    notifications_enabled: true,
                    sound_enabled,
                })
                .unwrap();
            let publisher = FakePublisher {
                published: Mutex::new(Vec::new()),
                error: publisher_fails.then(|| DomainError {
                    code: "NOTIFICATION_DENIED".into(),
                    message: "denied".into(),
                    field: None,
                }),
            };
            let service = NotificationService::new(&database);
            let offset = FixedOffset::east_opt(8 * 3600).unwrap();
            let scheduled_at = offset
                .with_ymd_and_hms(2026, 7, day, hour, minute, 0)
                .unwrap();

            match event_kind {
                0 => {
                    let ended_at = scheduled_at.with_timezone(&Utc);
                    let session = FocusSession {
                        id: source_id,
                        task_id: None,
                        task_instance_id: None,
                        project_id: None,
                        planned_seconds: 1_500,
                        actual_seconds: 1_500,
                        interruption_count: 0,
                        completion_kind: FocusCompletionKind::Deadline,
                        started_at: ended_at - chrono::Duration::minutes(25),
                        ended_at,
                        created_at: ended_at,
                    };
                    for _ in 0..repeat_count {
                        let _ = service.notify_focus_completed(&session, &publisher);
                    }
                }
                1 => {
                    let date = scheduled_at.format("%Y-%m-%d").to_string();
                    let time = scheduled_at.format("%H:%M").to_string();
                    task_at(&database, &source_id, &title, &date, Some(&time));
                    let window = ReminderWindow {
                        starts_at: scheduled_at - chrono::Duration::minutes(1),
                        ends_at: scheduled_at,
                    };
                    for _ in 0..repeat_count {
                        let _ = service.reconcile_task_reminders(window, &publisher);
                    }
                }
                _ => {
                    let template_id = format!("template-{source_id}");
                    let rule_id = format!("rule-{source_id}");
                    let date = scheduled_at.format("%Y-%m-%d").to_string();
                    task_at(&database, &template_id, &title, &date, None);
                    database.write(|tx| {
                        let stamp = "2026-07-01T00:00:00Z";
                        tx.execute(
                            "INSERT INTO recurrence_rules(id, task_template_id, pattern_json, local_time, timezone, starts_on, status, version, created_at, updated_at) VALUES (?1, ?2, '{\"kind\":\"daily\",\"interval\":1}', ?3, 'Asia/Shanghai', ?4, 'active', 1, ?5, ?5)",
                            rusqlite::params![rule_id, template_id, scheduled_at.format("%H:%M").to_string(), date, stamp],
                        )?;
                        tx.execute(
                            "INSERT INTO task_instances(id, recurrence_rule_id, rule_version, scheduled_date, scheduled_at, snapshot_title, status, created_at, updated_at) VALUES (?1, ?2, 1, ?3, ?4, ?5, 'pending', ?6, ?6)",
                            rusqlite::params![source_id, rule_id, date, scheduled_at.to_rfc3339(), title, stamp],
                        )?;
                        Ok(())
                    }).unwrap();
                    let window = ReminderWindow {
                        starts_at: scheduled_at - chrono::Duration::minutes(1),
                        ends_at: scheduled_at,
                    };
                    for _ in 0..repeat_count {
                        let _ = service.reconcile_task_reminders(window, &publisher);
                    }
                }
            }

            prop_assert_eq!(
                NotificationRepository::new(&database).count_deliveries().unwrap(),
                1
            );
            prop_assert!(publisher.published.lock().unwrap().len() <= 1);
        }
    }

    #[test]
    fn completed_focus_is_notified_once_with_title_and_duration() {
        let database = Database::open_in_memory().unwrap();
        task(&database, "task", "Write release notes", None);
        let start = Utc.with_ymd_and_hms(2026, 7, 20, 2, 0, 0).unwrap();
        let service = FocusService::new(&database);
        service
            .start_at(
                crate::domain::focus::FocusTarget {
                    task_id: Some("task".into()),
                    task_instance_id: None,
                },
                25,
                start,
            )
            .unwrap();
        let session = service
            .finish_at(
                FocusCompletionKind::Early,
                start + chrono::Duration::seconds(125),
            )
            .unwrap();
        let publisher = FakePublisher::working();
        let notifications = NotificationService::new(&database);

        assert!(notifications
            .notify_focus_completed(&session, &publisher)
            .unwrap());
        assert!(!notifications
            .notify_focus_completed(&session, &publisher)
            .unwrap());
        let published = publisher.published.lock().unwrap();
        assert_eq!(published.len(), 1);
        assert_eq!(published[0].body, "Write release notes · 已专注 2 分 5 秒");
        assert!(published[0].sound_enabled);
        assert_eq!(
            NotificationRepository::new(&database)
                .count_deliveries()
                .unwrap(),
            1
        );
        assert!(FocusRepository::new(&database)
            .get_session(&session.id)
            .unwrap()
            .is_some());
    }

    #[test]
    fn disabled_notifications_create_no_delivery_record() {
        let database = Database::open_in_memory().unwrap();
        PreferencesRepository::new(&database)
            .set_notifications(NotificationPreferences {
                notifications_enabled: false,
                sound_enabled: true,
            })
            .unwrap();
        let publisher = FakePublisher::working();
        let session = FocusSession {
            id: "session".into(),
            task_id: None,
            task_instance_id: None,
            project_id: None,
            planned_seconds: 60,
            actual_seconds: 60,
            interruption_count: 0,
            completion_kind: FocusCompletionKind::Deadline,
            started_at: Utc::now(),
            ended_at: Utc::now(),
            created_at: Utc::now(),
        };

        assert!(!NotificationService::new(&database)
            .notify_focus_completed(&session, &publisher)
            .unwrap());
        assert_eq!(
            NotificationRepository::new(&database)
                .count_deliveries()
                .unwrap(),
            0
        );
    }

    #[test]
    fn due_task_reminders_are_deduplicated_and_honor_sound_setting() {
        let database = Database::open_in_memory().unwrap();
        task(&database, "task", "Join review", Some("10:00"));
        PreferencesRepository::new(&database)
            .set_notifications(NotificationPreferences {
                notifications_enabled: true,
                sound_enabled: false,
            })
            .unwrap();
        let offset = FixedOffset::east_opt(8 * 3600).unwrap();
        let window = ReminderWindow {
            starts_at: offset.with_ymd_and_hms(2026, 7, 20, 9, 55, 0).unwrap(),
            ends_at: offset.with_ymd_and_hms(2026, 7, 20, 10, 0, 0).unwrap(),
        };
        let publisher = FakePublisher::working();
        let service = NotificationService::new(&database);

        assert_eq!(
            service
                .reconcile_task_reminders(window, &publisher)
                .unwrap(),
            1
        );
        assert_eq!(
            service
                .reconcile_task_reminders(window, &publisher)
                .unwrap(),
            0
        );
        let published = publisher.published.lock().unwrap();
        assert_eq!(published.len(), 1);
        assert!(!published[0].sound_enabled);
    }

    #[test]
    fn publisher_failures_are_recorded_and_retried() {
        let database = Database::open_in_memory().unwrap();
        task(&database, "task", "Join review", Some("10:00"));
        let offset = FixedOffset::east_opt(8 * 3600).unwrap();
        let window = ReminderWindow {
            starts_at: offset.with_ymd_and_hms(2026, 7, 20, 9, 55, 0).unwrap(),
            ends_at: offset.with_ymd_and_hms(2026, 7, 20, 10, 0, 0).unwrap(),
        };
        let publisher = FakePublisher {
            published: Mutex::new(Vec::new()),
            error: Some(DomainError {
                code: "NOTIFICATION_DENIED".into(),
                message: "denied".into(),
                field: None,
            }),
        };
        let service = NotificationService::new(&database);

        let error = service
            .reconcile_task_reminders(window, &publisher)
            .unwrap_err();
        assert_eq!(error.code, "NOTIFICATION_DENIED");
        assert_eq!(
            NotificationRepository::new(&database)
                .delivery_status()
                .unwrap(),
            Some(("failed".into(), Some("NOTIFICATION_DENIED".into())))
        );

        let working_publisher = FakePublisher::working();
        assert_eq!(
            service
                .reconcile_task_reminders(window, &working_publisher)
                .unwrap(),
            1
        );
        assert_eq!(
            service
                .reconcile_task_reminders(window, &working_publisher)
                .unwrap(),
            0
        );
        assert_eq!(working_publisher.published.lock().unwrap().len(), 1);
        assert_eq!(
            NotificationRepository::new(&database)
                .delivery_status()
                .unwrap(),
            Some(("sent".into(), None))
        );
    }

    #[test]
    fn in_flight_delivery_keeps_reconciliation_pending() {
        let database = Database::open_in_memory().unwrap();
        task(&database, "task", "Join review", Some("10:00"));
        assert_eq!(
            NotificationRepository::new(&database)
                .reserve(
                    NotificationKind::TaskDue,
                    "task",
                    "2026-07-20T10:00:00",
                    true,
                )
                .unwrap(),
            NotificationReservation::Acquired
        );
        let offset = FixedOffset::east_opt(8 * 3600).unwrap();
        let window = ReminderWindow {
            starts_at: offset.with_ymd_and_hms(2026, 7, 20, 9, 55, 0).unwrap(),
            ends_at: offset.with_ymd_and_hms(2026, 7, 20, 10, 0, 0).unwrap(),
        };
        let publisher = FakePublisher::working();

        let error = NotificationService::new(&database)
            .reconcile_task_reminders(window, &publisher)
            .unwrap_err();
        assert_eq!(error.code, "NOTIFICATION_DELIVERY_IN_FLIGHT");
        assert!(publisher.published.lock().unwrap().is_empty());
    }
}
