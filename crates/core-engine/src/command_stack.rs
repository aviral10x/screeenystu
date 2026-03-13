use project_model::Project;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

/// Errors from the command stack.
#[derive(Debug, Error)]
pub enum CommandError {
    #[error("Nothing to undo")]
    NothingToUndo,
    #[error("Nothing to redo")]
    NothingToRedo,
    #[error("Command execution failed: {0}")]
    ExecutionFailed(String),
}

/// A command that can be executed, undone, and redone.
/// All project mutations go through commands for undo/redo support.
pub trait Command: std::fmt::Debug + Send + Sync {
    /// Unique ID for this command instance
    fn id(&self) -> Uuid;

    /// Human-readable description for the undo/redo menu
    fn description(&self) -> &str;

    /// Execute the command, mutating the project.
    fn execute(&self, project: &mut Project) -> Result<(), CommandError>;

    /// Undo the command, restoring the project to its previous state.
    fn undo(&self, project: &mut Project) -> Result<(), CommandError>;

    /// Serialize this command for persistence (optional, for crash recovery).
    fn to_json(&self) -> Option<String> {
        None
    }
}

/// The command stack manages undo/redo for project editing.
pub struct CommandStack {
    /// Executed commands (undo stack)
    undo_stack: Vec<Box<dyn Command>>,
    /// Undone commands (redo stack)
    redo_stack: Vec<Box<dyn Command>>,
    /// Maximum number of commands to keep
    max_size: usize,
    /// Whether the project has unsaved changes
    dirty: bool,
    /// Index of last saved state (for dirty tracking)
    save_index: Option<usize>,
}

impl CommandStack {
    pub fn new(max_size: usize) -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_size,
            dirty: false,
            save_index: Some(0),
        }
    }

    /// Execute a command and push it onto the undo stack.
    pub fn execute(
        &mut self,
        command: Box<dyn Command>,
        project: &mut Project,
    ) -> Result<(), CommandError> {
        command.execute(project)?;

        // Clear redo stack when a new command is executed
        self.redo_stack.clear();

        self.undo_stack.push(command);
        self.dirty = true;

        // Trim if over max size
        if self.undo_stack.len() > self.max_size {
            self.undo_stack.remove(0);
            // Adjust save index
            self.save_index = self.save_index.and_then(|i| i.checked_sub(1));
        }

        project.touch();
        Ok(())
    }

    /// Undo the last command.
    pub fn undo(&mut self, project: &mut Project) -> Result<(), CommandError> {
        let command = self.undo_stack.pop().ok_or(CommandError::NothingToUndo)?;
        command.undo(project)?;
        self.redo_stack.push(command);
        self.dirty = self.save_index != Some(self.undo_stack.len());
        project.touch();
        Ok(())
    }

    /// Redo the last undone command.
    pub fn redo(&mut self, project: &mut Project) -> Result<(), CommandError> {
        let command = self.redo_stack.pop().ok_or(CommandError::NothingToRedo)?;
        command.execute(project)?;
        self.undo_stack.push(command);
        self.dirty = self.save_index != Some(self.undo_stack.len());
        project.touch();
        Ok(())
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }

    pub fn is_dirty(&self) -> bool {
        self.dirty
    }

    /// Mark the current state as saved.
    pub fn mark_saved(&mut self) {
        self.save_index = Some(self.undo_stack.len());
        self.dirty = false;
    }

    /// Get the description of the next undo command.
    pub fn undo_description(&self) -> Option<&str> {
        self.undo_stack.last().map(|c| c.description())
    }

    /// Get the description of the next redo command.
    pub fn redo_description(&self) -> Option<&str> {
        self.redo_stack.last().map(|c| c.description())
    }

    /// Clear all commands.
    pub fn clear(&mut self) {
        self.undo_stack.clear();
        self.redo_stack.clear();
        self.dirty = false;
        self.save_index = Some(0);
    }
}

// --- Concrete command implementations ---

/// Set the project name.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetProjectNameCommand {
    pub id: Uuid,
    pub new_name: String,
    pub old_name: String,
}

impl SetProjectNameCommand {
    pub fn new(new_name: String, old_name: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            new_name,
            old_name,
        }
    }
}

impl Command for SetProjectNameCommand {
    fn id(&self) -> Uuid {
        self.id
    }

    fn description(&self) -> &str {
        "Rename Project"
    }

    fn execute(&self, project: &mut Project) -> Result<(), CommandError> {
        project.name = self.new_name.clone();
        Ok(())
    }

    fn undo(&self, project: &mut Project) -> Result<(), CommandError> {
        project.name = self.old_name.clone();
        Ok(())
    }
}

/// Set trim range on the timeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetTrimCommand {
    pub id: Uuid,
    pub new_trim: Option<project_model::project::TimeRange>,
    pub old_trim: Option<project_model::project::TimeRange>,
}

impl Command for SetTrimCommand {
    fn id(&self) -> Uuid {
        self.id
    }

    fn description(&self) -> &str {
        "Set Trim"
    }

    fn execute(&self, project: &mut Project) -> Result<(), CommandError> {
        project.timeline.trim = self.new_trim;
        Ok(())
    }

    fn undo(&self, project: &mut Project) -> Result<(), CommandError> {
        project.timeline.trim = self.old_trim;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_stack_undo_redo() {
        let mut project = Project::new("Test");
        let mut stack = CommandStack::new(100);

        let cmd = SetProjectNameCommand::new("New Name".into(), "Test".into());
        stack.execute(Box::new(cmd), &mut project).unwrap();
        assert_eq!(project.name, "New Name");
        assert!(stack.can_undo());
        assert!(!stack.can_redo());

        stack.undo(&mut project).unwrap();
        assert_eq!(project.name, "Test");
        assert!(!stack.can_undo());
        assert!(stack.can_redo());

        stack.redo(&mut project).unwrap();
        assert_eq!(project.name, "New Name");
    }

    #[test]
    fn test_command_stack_dirty_tracking() {
        let mut project = Project::new("Test");
        let mut stack = CommandStack::new(100);

        assert!(!stack.is_dirty());

        let cmd = SetProjectNameCommand::new("Changed".into(), "Test".into());
        stack.execute(Box::new(cmd), &mut project).unwrap();
        assert!(stack.is_dirty());

        stack.mark_saved();
        assert!(!stack.is_dirty());

        stack.undo(&mut project).unwrap();
        assert!(stack.is_dirty());
    }
}
