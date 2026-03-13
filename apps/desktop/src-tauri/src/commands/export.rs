use crate::state::AppState;
use export_engine::ffmpeg_pipeline::FFmpegPipeline;
use export_engine::pipeline::{ExportPipeline, ProgressCallback};
use project_model::export::ExportPreset;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

/// Start an export job.
#[tauri::command]
pub fn start_export(
    preset_name: String,
    output_path: String,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_ref().ok_or("No project loaded")?;

    let preset = match preset_name.as_str() {
        "web" => ExportPreset::web(),
        "presentation" => ExportPreset::presentation(),
        "high_quality" => ExportPreset::high_quality(),
        "gif" => ExportPreset::gif_short(),
        "social" => ExportPreset::social_portrait(),
        _ => ExportPreset::web(),
    };

    let pipeline = FFmpegPipeline::new();

    let handle = app_handle.clone();
    let on_progress: ProgressCallback = Box::new(move |progress: f64| {
        let _ = handle.emit("export-progress", serde_json::json!({
            "progress": progress,
            "percent": (progress * 100.0) as u32,
        }));
    });

    let job = pipeline
        .start_export(project, &preset, &output_path, on_progress)
        .map_err(|e| e.to_string())?;

    let job_json = serde_json::to_string(&job).map_err(|e| e.to_string())?;

    tracing::info!("Export started: {} → {}", job.id, output_path);
    Ok(job_json)
}

/// Cancel a running export job.
#[tauri::command]
pub fn cancel_export(
    job_id: String,
) -> Result<(), String> {
    let id: Uuid = job_id.parse().map_err(|e: uuid::Error| e.to_string())?;
    let pipeline = FFmpegPipeline::new();
    pipeline.cancel_export(id).map_err(|e| e.to_string())
}
