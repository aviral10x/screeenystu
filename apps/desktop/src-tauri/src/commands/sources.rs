use crate::capture_manager::CaptureManager;
use crate::state::AppState;
use std::path::PathBuf;
use tauri::{AppHandle, State};

/// List available displays for recording.
#[tauri::command]
pub fn list_displays(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let helper_path = get_helper_path(&app_handle, &state)?;
    CaptureManager::list_sources(&helper_path, "displays")
}

/// List available windows for recording.
#[tauri::command]
pub fn list_windows(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let helper_path = get_helper_path(&app_handle, &state)?;
    CaptureManager::list_sources(&helper_path, "windows")
}

/// List available microphones.
#[tauri::command]
pub fn list_mics(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let helper_path = get_helper_path(&app_handle, &state)?;
    CaptureManager::list_sources(&helper_path, "mics")
}

/// List available cameras.
#[tauri::command]
pub fn list_cameras(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let helper_path = get_helper_path(&app_handle, &state)?;
    CaptureManager::list_sources(&helper_path, "cameras")
}

pub fn get_helper_path(app_handle: &AppHandle, state: &State<'_, AppState>) -> Result<PathBuf, String> {
    let mut mgr_lock = state.capture_manager.lock().map_err(|e| e.to_string())?;
    if mgr_lock.is_none() {
        *mgr_lock = Some(CaptureManager::new(app_handle));
    }
    // For listing, we just need the helper path — create a temp manager
    // In practice the helper path is cached, so this is lightweight
    drop(mgr_lock);

    // Re-derive the path
    let dev_paths = [
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../../native/swift-capture/.build/debug/screencraft-capture"),
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../../native/swift-capture/.build/release/screencraft-capture"),
    ];

    for path in &dev_paths {
        if path.exists() {
            return Ok(path.canonicalize().unwrap_or_else(|_| path.clone()));
        }
    }

    Ok(PathBuf::from("screencraft-capture"))
}
