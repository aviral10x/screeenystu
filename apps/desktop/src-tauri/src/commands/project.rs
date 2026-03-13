use crate::state::AppState;
use project_model::Project;
use tauri::State;

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
