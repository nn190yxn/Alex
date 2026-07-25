use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        mpsc::{self, Receiver, RecvTimeoutError, SyncSender, TrySendError},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};

use crate::{
    domain::error::{DomainError, ErrorCode},
    repositories::IndexSourceRepository,
};

use super::{source_service::source_path_accessible, ScanCoordinator, SourceService};

const EVENT_QUEUE_CAPACITY: usize = 1_024;
const DEBOUNCE_WINDOW: Duration = Duration::from_millis(400);
const WORKER_TICK: Duration = Duration::from_millis(50);

pub struct WatchService {
    coordinator: Arc<ScanCoordinator>,
    event_tx: SyncSender<WatchMessage>,
    registrations: Mutex<HashMap<String, WatchRegistration>>,
    active_generations: Arc<Mutex<HashMap<String, u64>>>,
    overflowed: Arc<Mutex<HashMap<(String, u64), PathBuf>>>,
    next_generation: AtomicU64,
}

struct WatchRegistration {
    _watcher: RecommendedWatcher,
    root: PathBuf,
    generation: u64,
}

#[derive(Debug)]
struct WatchMessage {
    source_id: String,
    root: PathBuf,
    generation: u64,
    event: Event,
}

struct PendingBatch {
    root: PathBuf,
    directories: Vec<PathBuf>,
    deadline: Instant,
}

impl WatchService {
    pub fn new(coordinator: Arc<ScanCoordinator>) -> Arc<Self> {
        let (event_tx, event_rx) = mpsc::sync_channel(EVENT_QUEUE_CAPACITY);
        let active_generations = Arc::new(Mutex::new(HashMap::new()));
        let overflowed = Arc::new(Mutex::new(HashMap::new()));
        spawn_worker(
            Arc::clone(&coordinator),
            event_rx,
            Arc::clone(&active_generations),
            Arc::clone(&overflowed),
        );
        Arc::new(Self {
            coordinator,
            event_tx,
            registrations: Mutex::new(HashMap::new()),
            active_generations,
            overflowed,
            next_generation: AtomicU64::new(1),
        })
    }

    pub fn sync_sources(&self) -> Result<(), DomainError> {
        let desired = SourceService::new(self.coordinator.database())
            .refresh_source_statuses()?
            .into_iter()
            .filter(|source| source.enabled)
            .filter(|source| source_path_accessible(Path::new(&source.path)))
            .map(|source| (source.id, PathBuf::from(source.path)))
            .collect::<HashMap<_, _>>();
        let mut registrations = self.registrations.lock().map_err(|_| lock_error())?;
        registrations.retain(|source_id, registration| {
            desired
                .get(source_id)
                .is_some_and(|root| root == &registration.root)
        });

        let mut active = self.active_generations.lock().map_err(|_| lock_error())?;
        active.clear();
        for (source_id, registration) in registrations.iter() {
            active.insert(source_id.clone(), registration.generation);
        }

        for (source_id, root) in desired {
            if registrations.contains_key(&source_id) {
                continue;
            }
            let generation = self.next_generation.fetch_add(1, Ordering::Relaxed);
            let callback_source_id = source_id.clone();
            let callback_root = root.clone();
            let callback_tx = self.event_tx.clone();
            let callback_overflowed = Arc::clone(&self.overflowed);
            let watcher_result =
                notify::recommended_watcher(move |result: notify::Result<Event>| match result {
                    Ok(event) => queue_message(
                        &callback_tx,
                        &callback_overflowed,
                        WatchMessage {
                            source_id: callback_source_id.clone(),
                            root: callback_root.clone(),
                            generation,
                            event,
                        },
                    ),
                    Err(_) => record_overflow(
                        &callback_overflowed,
                        &callback_source_id,
                        generation,
                        &callback_root,
                    ),
                });
            let Ok(mut watcher) = watcher_result else {
                mark_source_unavailable(self.coordinator.database(), &source_id)?;
                continue;
            };
            if watcher.watch(&root, RecursiveMode::Recursive).is_err() {
                mark_source_unavailable(self.coordinator.database(), &source_id)?;
                continue;
            }
            registrations.insert(
                source_id.clone(),
                WatchRegistration {
                    _watcher: watcher,
                    root,
                    generation,
                },
            );
            active.insert(source_id, generation);
        }
        Ok(())
    }
}

fn mark_source_unavailable(
    database: &crate::database::Database,
    source_id: &str,
) -> Result<(), DomainError> {
    IndexSourceRepository::new(database).update_scan_state(source_id, "unavailable", None, None)?;
    Ok(())
}

fn spawn_worker(
    coordinator: Arc<ScanCoordinator>,
    event_rx: Receiver<WatchMessage>,
    active_generations: Arc<Mutex<HashMap<String, u64>>>,
    overflowed: Arc<Mutex<HashMap<(String, u64), PathBuf>>>,
) {
    std::thread::spawn(move || {
        let mut pending = HashMap::<(String, u64), PendingBatch>::new();
        loop {
            match event_rx.recv_timeout(WORKER_TICK) {
                Ok(message) => add_message(&mut pending, message),
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => break,
            }
            drain_overflow(&overflowed, &mut pending);
            reconcile_due(&coordinator, &active_generations, &mut pending);
        }
    });
}

fn queue_message(
    sender: &SyncSender<WatchMessage>,
    overflowed: &Mutex<HashMap<(String, u64), PathBuf>>,
    message: WatchMessage,
) {
    if let Err(TrySendError::Full(message) | TrySendError::Disconnected(message)) =
        sender.try_send(message)
    {
        record_overflow(
            overflowed,
            &message.source_id,
            message.generation,
            &message.root,
        );
    }
}

fn record_overflow(
    overflowed: &Mutex<HashMap<(String, u64), PathBuf>>,
    source_id: &str,
    generation: u64,
    root: &Path,
) {
    if let Ok(mut overflowed) = overflowed.lock() {
        overflowed.insert((source_id.to_owned(), generation), root.to_path_buf());
    }
}

fn drain_overflow(
    overflowed: &Mutex<HashMap<(String, u64), PathBuf>>,
    pending: &mut HashMap<(String, u64), PendingBatch>,
) {
    let entries = match overflowed.lock() {
        Ok(mut overflowed) => overflowed.drain().collect::<Vec<_>>(),
        Err(_) => return,
    };
    for (key, root) in entries {
        pending.insert(
            key,
            PendingBatch {
                directories: vec![root.clone()],
                root,
                deadline: Instant::now() + DEBOUNCE_WINDOW,
            },
        );
    }
}

fn add_message(pending: &mut HashMap<(String, u64), PendingBatch>, message: WatchMessage) {
    let directories = event_directories(&message.event, &message.root);
    if directories.is_empty() {
        return;
    }
    let batch = pending
        .entry((message.source_id, message.generation))
        .or_insert_with(|| PendingBatch {
            root: message.root,
            directories: Vec::new(),
            deadline: Instant::now() + DEBOUNCE_WINDOW,
        });
    batch.directories.extend(directories);
    batch.directories = fold_directories(std::mem::take(&mut batch.directories));
    batch.deadline = Instant::now() + DEBOUNCE_WINDOW;
}

fn reconcile_due(
    coordinator: &ScanCoordinator,
    active_generations: &Mutex<HashMap<String, u64>>,
    pending: &mut HashMap<(String, u64), PendingBatch>,
) {
    let now = Instant::now();
    let due = pending
        .iter()
        .filter(|(_, batch)| batch.deadline <= now)
        .map(|(key, _)| key.clone())
        .collect::<Vec<_>>();
    for key in due {
        let is_active = active_generations
            .lock()
            .ok()
            .and_then(|active| active.get(&key.0).copied())
            == Some(key.1);
        if !is_active {
            pending.remove(&key);
            continue;
        }
        let Some(batch) = pending.remove(&key) else {
            continue;
        };
        if let Err(error) = coordinator.reconcile_directories(&key.0, batch.directories) {
            if error.code == ErrorCode::ScanAlreadyRunning {
                pending.insert(
                    key,
                    PendingBatch {
                        root: batch.root.clone(),
                        directories: vec![batch.root],
                        deadline: Instant::now() + DEBOUNCE_WINDOW,
                    },
                );
            }
        }
    }
}

fn event_directories(event: &Event, root: &Path) -> Vec<PathBuf> {
    if matches!(event.kind, EventKind::Access(_)) {
        return Vec::new();
    }
    if event.need_rescan() || event.paths.is_empty() {
        return vec![root.to_path_buf()];
    }
    fold_directories(
        event
            .paths
            .iter()
            .map(|path| {
                if path.is_dir() {
                    path.to_path_buf()
                } else {
                    path.parent().unwrap_or(root).to_path_buf()
                }
            })
            .filter(|path| path.starts_with(root))
            .collect(),
    )
}

fn fold_directories(mut directories: Vec<PathBuf>) -> Vec<PathBuf> {
    directories.sort();
    directories.dedup();
    let mut folded: Vec<PathBuf> = Vec::with_capacity(directories.len());
    for directory in directories {
        if folded
            .iter()
            .any(|ancestor| directory.starts_with(ancestor))
        {
            continue;
        }
        folded.push(directory);
    }
    folded
}

fn lock_error() -> DomainError {
    DomainError {
        code: ErrorCode::InternalError,
        message: "The file monitor state is temporarily unavailable.".into(),
        field: None,
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use notify::event::{AccessKind, CreateKind, ModifyKind};

    use super::*;

    #[test]
    fn event_paths_are_merged_into_affected_directories() {
        let root = Path::new("/source");
        let event = Event::new(EventKind::Modify(ModifyKind::Any))
            .add_path(root.join("team-a/one.docx"))
            .add_path(root.join("team-a/two.docx"))
            .add_path(root.join("team-b/three.docx"));

        assert_eq!(
            event_directories(&event, root),
            vec![root.join("team-a"), root.join("team-b")]
        );
    }

    #[test]
    fn access_events_are_ignored() {
        let root = Path::new("/source");
        let event =
            Event::new(EventKind::Access(AccessKind::Any)).add_path(root.join("document.docx"));

        assert!(event_directories(&event, root).is_empty());
    }

    #[test]
    fn ancestor_directories_absorb_descendants() {
        let root = Path::new("/source");
        assert_eq!(
            fold_directories(vec![
                root.join("team/project"),
                root.join("team"),
                root.join("other"),
            ]),
            vec![root.join("other"), root.join("team")]
        );
    }

    #[test]
    fn a_full_event_queue_schedules_a_root_reconcile() {
        let (sender, _receiver) = mpsc::sync_channel(1);
        let overflowed = Mutex::new(HashMap::new());
        let root = PathBuf::from("/source");
        let event =
            Event::new(EventKind::Create(CreateKind::File)).add_path(root.join("document.docx"));
        sender
            .try_send(WatchMessage {
                source_id: "source-a".into(),
                root: root.clone(),
                generation: 1,
                event: event.clone(),
            })
            .unwrap();

        queue_message(
            &sender,
            &overflowed,
            WatchMessage {
                source_id: "source-a".into(),
                root: root.clone(),
                generation: 1,
                event,
            },
        );

        assert_eq!(
            overflowed.lock().unwrap().get(&("source-a".into(), 1)),
            Some(&root)
        );
    }

    #[test]
    fn sync_skips_offline_sources_and_rebuilds_recovered_watchers() {
        let database = Arc::new(crate::database::Database::open_in_memory().unwrap());
        let parent = tempfile::tempdir().unwrap();
        let source_path = parent.path().join("source");
        let offline_path = parent.path().join("offline");
        fs::create_dir(&source_path).unwrap();
        let source = SourceService::new(&database)
            .add_source(source_path.to_str().unwrap())
            .unwrap();
        let watcher = WatchService::new(ScanCoordinator::new(database.clone()));

        watcher.sync_sources().unwrap();
        assert_eq!(watcher.registrations.lock().unwrap().len(), 1);

        fs::rename(&source_path, &offline_path).unwrap();
        watcher.sync_sources().unwrap();
        assert!(watcher.registrations.lock().unwrap().is_empty());
        assert_eq!(
            IndexSourceRepository::new(&database)
                .get(&source.id)
                .unwrap()
                .unwrap()
                .status,
            "unavailable"
        );

        fs::rename(&offline_path, &source_path).unwrap();
        watcher.sync_sources().unwrap();
        assert_eq!(watcher.registrations.lock().unwrap().len(), 1);
        assert_eq!(
            IndexSourceRepository::new(&database)
                .get(&source.id)
                .unwrap()
                .unwrap()
                .status,
            "ready"
        );
    }
}
