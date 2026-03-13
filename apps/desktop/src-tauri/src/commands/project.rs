use crate::state::AppState;
use project_model::Project;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub id: String,
    pub name: String,
    pub path: String,
    pub last_modified: u64,
}

/// Get the default projects directory (~/Movies/ScreenCraft or ~/Documents/ScreenCraft)
#[tauri::command]
pub fn get_default_projects_dir(app_handle: AppHandle) -> Result<String, String> {
    let base_dir = app_handle
        .path()
        .video_dir()
        .unwrap_or_else(|_| app_handle.path().document_dir().unwrap_or_else(|_| PathBuf::from(".")));

    let projects_dir = base_dir.join("ScreenCraft");

    if !projects_dir.exists() {
        std::fs::create_dir_all(&projects_dir).map_err(|e| e.to_string())?;
    }

    Ok(projects_dir.to_string_lossy().to_string())
}

/// List recent projects from the default directory
#[tauri::command]
pub fn list_recent_projects(app_handle: AppHandle) -> Result<Vec<ProjectMetadata>, String> {
    let projects_dir_str = get_default_projects_dir(app_handle)?;
    let projects_dir = PathBuf::from(projects_dir_str);

    let mut projects = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&projects_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let project_file = path.join("project.json");
                if project_file.exists() {
                    if let Ok(json) = std::fs::read_to_string(&project_file) {
                        if let Ok(project) = Project::from_json(&json) {
                            let metadata = entry.metadata().ok();
                            let last_modified = metadata
                                .and_then(|m| m.modified().ok())
                                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                                .map(|d| d.as_secs())
                                .unwrap_or(0);

                            projects.push(ProjectMetadata {
                                id: project.id.to_string(),
                                name: project.name,
                                path: path.to_string_lossy().to_string(),
                                last_modified,
                            });
                        }
                    }
                }
            }
        }
    }

    // Sort by last modified descending
    projects.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));

    Ok(projects)
}

/// Create a new project.
#[tauri::command]
pub fn create_project(name: String, state: State<'_, AppState>) -> Result<String, String> {
    let project = Project::new(name);
    let json = project.to_json().map_err(|e| e.to_string())?;
    let id = project.id.to_string();

    let mut project_lock = state.project.lock().map_err(|e| e.to_string())?;
    *project_lock = Some(project);

    let mut stack = state.command_stack.lock().map_err(|e| e.to_string())?;
    stack.clear();

    tracing::info!("Created new project: {}", id);
    Ok(json)
}

/// Get the current project state as JSON.
#[tauri::command]
pub fn get_project_state(state: State<'_, AppState>) -> Result<String, String> {
    let project = state.project.lock().map_err(|e| e.to_string())?;
    match project.as_ref() {
        Some(p) => p.to_json().map_err(|e| e.to_string()),
        None => Err("No project loaded".into()),
    }
}

/// Save the current project to disk.
#[tauri::command]
pub fn save_project(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let project = state.project.lock().map_err(|e| e.to_string())?;
    match project.as_ref() {
        Some(p) => {
            let json = p.to_json().map_err(|e| e.to_string())?;
            std::fs::write(&path, json).map_err(|e| e.to_string())?;

            let mut stack = state.command_stack.lock().map_err(|e| e.to_string())?;
            stack.mark_saved();

            tracing::info!("Saved project to: {}", path);
            Ok(())
        }
        None => Err("No project loaded".into()),
    }
}

/// Load a project from disk.
#[tauri::command]
pub fn load_project(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let project = Project::from_json(&json).map_err(|e| e.to_string())?;
    let result_json = project.to_json().map_err(|e| e.to_string())?;

    let mut project_lock = state.project.lock().map_err(|e| e.to_string())?;
    *project_lock = Some(project);

    let mut stack = state.command_stack.lock().map_err(|e| e.to_string())?;
    stack.clear();
    stack.mark_saved();

    tracing::info!("Loaded project from: {}", path);
    Ok(result_json)
}

/// Undo the last command.
#[tauri::command]
pub fn undo(state: State<'_, AppState>) -> Result<String, String> {
    let mut project = state.project.lock().map_err(|e| e.to_string())?;
    let mut stack = state.command_stack.lock().map_err(|e| e.to_string())?;

    match project.as_mut() {
        Some(p) => {
            stack.undo(p).map_err(|e| e.to_string())?;
            p.to_json().map_err(|e| e.to_string())
        }
        None => Err("No project loaded".into()),
    }
}

/// Redo the last undone command.
#[tauri::command]
pub fn redo(state: State<'_, AppState>) -> Result<String, String> {
    let mut project = state.project.lock().map_err(|e| e.to_string())?;
    let mut stack = state.command_stack.lock().map_err(|e| e.to_string())?;

    match project.as_mut() {
        Some(p) => {
            stack.redo(p).map_err(|e| e.to_string())?;
            p.to_json().map_err(|e| e.to_string())
        }
        None => Err("No project loaded".into()),
    }
}
