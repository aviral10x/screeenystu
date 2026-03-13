use project_model::export::{ExportPreset, RenderJob, RenderJobStatus};
use project_model::Project;
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum ExportError {
    #[error("No sources available for export")]
    NoSources,
    #[error("Export cancelled")]
    Cancelled,
    #[error("Render failed: {0}")]
    RenderFailed(String),
    #[error("IO error: {0}")]
    IoError(String),
}

/// Progress callback for export operations.
pub type ProgressCallback = Box<dyn Fn(f64) + Send + Sync>;

/// The export pipeline trait. Implementations handle actual rendering.
pub trait ExportPipeline: Send + Sync {
    /// Start an export job.
    fn start_export(
        &self,
        project: &Project,
        preset: &ExportPreset,
        output_path: &str,
        on_progress: ProgressCallback,
    ) -> Result<RenderJob, ExportError>;

    /// Cancel a running export.
    fn cancel_export(&self, job_id: Uuid) -> Result<(), ExportError>;

    /// Get the status of an export job.
    fn job_status(&self, job_id: Uuid) -> Option<RenderJobStatus>;
}

/// A stub export pipeline for Phase 0. Returns mock results.
pub struct StubExportPipeline;

impl ExportPipeline for StubExportPipeline {
    fn start_export(
        &self,
        project: &Project,
        preset: &ExportPreset,
        output_path: &str,
        _on_progress: ProgressCallback,
    ) -> Result<RenderJob, ExportError> {
        if project.sources.is_empty() {
            return Err(ExportError::NoSources);
        }

        Ok(RenderJob {
            id: Uuid::new_v4(),
            project_id: project.id,
            preset: preset.clone(),
            output_path: output_path.to_string(),
            status: RenderJobStatus::Queued,
            progress: 0.0,
            error: None,
        })
    }

    fn cancel_export(&self, _job_id: Uuid) -> Result<(), ExportError> {
        Ok(())
    }

    fn job_status(&self, _job_id: Uuid) -> Option<RenderJobStatus> {
        Some(RenderJobStatus::Queued)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stub_pipeline_no_sources() {
        let pipeline = StubExportPipeline;
        let project = Project::new("Test");
        let preset = ExportPreset::web();
        let result = pipeline.start_export(&project, &preset, "/tmp/out.mp4", Box::new(|_| {}));
        assert!(result.is_err());
    }
}
