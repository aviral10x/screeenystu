use crate::commands::sources::get_helper_path;
use crate::state::AppState;
use tauri::{AppHandle, State};
use std::process::Command;

/// Check all permissions
#[tauri::command]
pub fn check_permissions(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let helper_path = get_helper_path(&app_handle, &state)?;
    
    let output = Command::new(helper_path)
        .arg("check-permissions")
        .output()
        .map_err(|e| format!("Failed to spawn helper: {}", e))?;
        
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Request a specific permission
#[tauri::command]
pub fn request_permission(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    permission_type: String,
) -> Result<String, String> {
    let helper_path = get_helper_path(&app_handle, &state)?;
    
    let output = Command::new(helper_path)
        .arg("request-permission")
        .arg(&permission_type)
        .output()
        .map_err(|e| format!("Failed to spawn helper: {}", e))?;
        
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
