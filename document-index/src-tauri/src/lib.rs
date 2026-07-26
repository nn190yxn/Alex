pub mod commands;
pub mod database;
pub mod domain;
pub mod repositories;
pub mod services;

pub use domain::error::{CommandResult, DomainError, ErrorCode};

#[cfg(feature = "desktop-app")]
pub fn run() {
    if let Err(message) = run_desktop() {
        show_startup_error(&message);
    }
}

#[cfg(feature = "desktop-app")]
fn run_desktop() -> Result<(), String> {
    use std::sync::Arc;

    use tauri::Manager;

    let context = tauri::generate_context!();
    let app_data_dir = dirs::data_dir()
        .ok_or_else(|| "无法确定当前用户的应用数据目录。".to_owned())?
        .join(&context.config().identifier);
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|_| "无法创建资料索引的本地数据目录。请检查磁盘空间和目录权限。".to_owned())?;
    let database = Arc::new(
        database::Database::open(app_data_dir.join("document-index.sqlite3"))
            .map_err(|_| "无法打开资料索引数据库。请检查磁盘空间和数据目录权限。".to_owned())?,
    );
    let scan_coordinator = services::ScanCoordinator::new(database.clone());
    let watch_service = services::WatchService::new(scan_coordinator.clone());
    let preview_service = services::PreviewService::new(database.clone());
    let recycle_service = Arc::new(services::RecycleBinService::new(database));

    tauri::Builder::default()
        .manage(scan_coordinator)
        .manage(watch_service)
        .manage(preview_service)
        .manage(recycle_service)
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let coordinator = app.state::<Arc<services::ScanCoordinator>>();
            services::SourceService::new(coordinator.database()).list_sources()?;
            let progress_sink = commands::indexing::progress_sink(app.handle().clone());
            coordinator.resume_unfinished(progress_sink.clone())?;
            coordinator.start_unscanned_sources(progress_sink)?;
            let watcher = app.state::<Arc<services::WatchService>>();
            watcher.sync_sources()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::backup::export_index_backup,
            commands::backup::restore_index_backup,
            commands::health::health,
            commands::indexing::list_sources,
            commands::indexing::add_source,
            commands::indexing::set_source_enabled,
            commands::indexing::start_scan,
            commands::indexing::cancel_scan,
            commands::indexing::get_scan_status,
            commands::indexing::get_index_status,
            commands::indexing::list_scan_errors,
            commands::indexing::list_extensions,
            commands::indexing::update_extensions,
            commands::topics::rename_topic,
            commands::topics::merge_topics,
            commands::topics::move_documents_to_topic,
            commands::topics::list_organize_suggestions,
            commands::topics::accept_organize_suggestion,
            commands::topics::dismiss_organize_suggestion,
            commands::search::search_topics,
            commands::search::get_topic_detail,
            commands::search::open_document,
            commands::search::reveal_document,
            commands::preview::create_preview_session,
            commands::preview::resize_preview_session,
            commands::preview::close_preview_session,
            commands::preview::recycle_documents,
            commands::preview::open_recycle_bin,
        ])
        .run(context)
        .map_err(|_| "资料索引桌面窗口启动失败。".to_owned())
}

#[cfg(all(feature = "desktop-app", target_os = "windows"))]
fn show_startup_error(message: &str) {
    use std::os::windows::ffi::OsStrExt;
    use windows::{
        core::PCWSTR,
        Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK},
    };

    let message = std::ffi::OsStr::new(message)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    let title = std::ffi::OsStr::new("资料索引启动失败")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    unsafe {
        let _ = MessageBoxW(
            None,
            PCWSTR(message.as_ptr()),
            PCWSTR(title.as_ptr()),
            MB_OK | MB_ICONERROR,
        );
    }
}

#[cfg(all(feature = "desktop-app", not(target_os = "windows")))]
fn show_startup_error(message: &str) {
    eprintln!("{message}");
}
