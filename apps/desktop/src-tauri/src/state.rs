use std::sync::Mutex;

use core_engine::command_stack::CommandStack;
use project_model::Project;

use crate::capture_manager::CaptureManager;

/// Application state managed by Tauri.
pub struct AppState {
    pub project: Mutex<Option<Project>>,
    pub command_stack: Mutex<CommandStack>,
    pub capture_manager: Mutex<Option<CaptureManager>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            project: Mutex::new(None),
            command_stack: Mutex::new(CommandStack::new(200)),
            capture_manager: Mutex::new(None),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
