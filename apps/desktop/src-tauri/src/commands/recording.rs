use crate::capture_manager::{CaptureManager, RecordingConfig};
use crate::state::AppState;
use tauri::{AppHandle, State};

/// Start a recording session.
#[tauri::command]
pub fn start_recording(
    config: String,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let recording_config: RecordingConfig =
        serde_json::from_str(&config).map_err(|e| format!("Invalid config: {}", e))?;

    let mut mgr_lock = state.capture_manager.lock().map_err(|e| e.to_string())?;

    // Initialize capture manager if needed
    if mgr_lock.is_none() {
        *mgr_lock = Some(CaptureManager::new(&app_handle));
    }

    let mgr = mgr_lock.as_mut().unwrap();
    mgr.start(recording_config, app_handle)?;

    Ok(serde_json::json!({"status": "starting"}).to_string())
}

/// Pause the current recording.
#[tauri::command]
pub fn pause_recording(state: State<'_, AppState>) -> Result<(), String> {
    let mut mgr_lock = state.capture_manager.lock().map_err(|e| e.to_string())?;
    match mgr_lock.as_mut() {
        Some(mgr) => mgr.pause(),
        None => Err("No capture manager".into()),
    }
}

/// Resume a paused recording.
#[tauri::command]
pub fn resume_recording(state: State<'_, AppState>) -> Result<(), String> {
    let mut mgr_lock = state.capture_manager.lock().map_err(|e| e.to_string())?;
    match mgr_lock.as_mut() {
        Some(mgr) => mgr.resume(),
        None => Err("No capture manager".into()),
    }
}

/// Stop the current recording.
#[tauri::command]
pub fn stop_recording(state: State<'_, AppState>) -> Result<String, String> {
    let mut mgr_lock = state.capture_manager.lock().map_err(|e| e.to_string())?;
    match mgr_lock.as_mut() {
        Some(mgr) => {
            mgr.stop()?;
            Ok(serde_json::json!({"status": "stopped"}).to_string())
        }
        None => Err("No capture manager".into()),
    }
}

/// Add a flag/marker during recording.
#[tauri::command]
pub fn add_recording_flag(
    label: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut mgr_lock = state.capture_manager.lock().map_err(|e| e.to_string())?;
    match mgr_lock.as_mut() {
        Some(mgr) => mgr.add_flag(label),
        None => Err("No capture manager".into()),
    }
}
