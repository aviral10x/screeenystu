mod capture_manager;
mod commands;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            // Project commands
            commands::project::create_project,
            commands::project::get_project_state,
            commands::project::save_project,
            commands::project::load_project,
            commands::project::undo,
            commands::project::redo,
            // Recording commands
            commands::recording::start_recording,
            commands::recording::pause_recording,
            commands::recording::resume_recording,
            commands::recording::stop_recording,
            commands::recording::add_recording_flag,
            // Source listing commands
            commands::sources::list_displays,
            commands::sources::list_windows,
            commands::sources::list_mics,
            commands::sources::list_cameras,
            // Manifest commands
            commands::manifest::create_project_from_recording,
            commands::manifest::save_project_bundle,
            // Zoom commands
            commands::zoom::analyze_zoom,
            commands::zoom::apply_zoom_suggestions,
            commands::zoom::add_zoom_segment,
            commands::zoom::remove_zoom_segment,
            commands::zoom::update_zoom_segment,
            commands::zoom::get_zoom_segments,
            // Export commands
            commands::export::start_export,
            commands::export::cancel_export,
            // Timeline commands
            commands::timeline::set_trim,
            commands::timeline::clear_trim,
            commands::timeline::split_at_playhead,
            commands::timeline::add_speed_segment,
            commands::timeline::remove_speed_segment,
            commands::timeline::get_speed_segments,
            commands::timeline::set_camera_layout,
            // Share commands
            commands::share::upload_and_share,
            // Proxy commands
            commands::proxy::generate_proxy,
            commands::proxy::check_proxy,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ScreenCraft");
}
