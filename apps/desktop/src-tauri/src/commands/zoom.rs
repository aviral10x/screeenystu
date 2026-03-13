use crate::state::AppState;
use core_engine::zoom_analysis::ZoomAnalyzer;
use project_model::timeline::ZoomSegment;
use project_model::zoom::ZoomAnalysisConfig;
use tauri::State;
use uuid::Uuid;

/// Run the auto-zoom analyzer on the loaded project's interaction stream.
#[tauri::command]
pub fn analyze_zoom(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_ref().ok_or("No project loaded")?;

    let stream = project
        .interaction_stream
        .as_ref()
        .ok_or("No interaction metadata available")?;

    // Get source dimensions from the first screen recording
    let (width, height) = project
        .sources
        .iter()
        .find(|s| matches!(s.media_type, project_model::MediaType::ScreenRecording))
        .and_then(|s| match (s.width, s.height) {
            (Some(w), Some(h)) => Some((w as f64, h as f64)),
            _ => None,
        })
        .unwrap_or((1920.0, 1080.0));

    let config = ZoomAnalysisConfig::default();
    let analyzer = ZoomAnalyzer::new(config, width, height);
    let candidates = analyzer.analyze(stream);
    let segments = analyzer.candidates_to_segments(&candidates);

    serde_json::to_string(&segments).map_err(|e| e.to_string())
}

/// Apply zoom suggestions (from analyze_zoom) to the project.
#[tauri::command]
pub fn apply_zoom_suggestions(
    segments_json: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let segments: Vec<ZoomSegment> =
        serde_json::from_str(&segments_json).map_err(|e| e.to_string())?;

    let mut project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_mut().ok_or("No project loaded")?;

    // Clear existing auto-generated segments
    project.zoom_segments.retain(|s| !s.auto_generated);

    // Add new segments
    for segment in segments {
        project.zoom_segments.push(segment);
    }

    // Sort by start time
    project.zoom_segments.sort_by_key(|s| s.time_range.start_ms);

    tracing::info!("Applied {} zoom segments", project.zoom_segments.len());
    Ok(())
}

/// Add a single zoom segment manually.
#[tauri::command]
pub fn add_zoom_segment(
    segment_json: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let segment: ZoomSegment =
        serde_json::from_str(&segment_json).map_err(|e| e.to_string())?;

    let mut project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_mut().ok_or("No project loaded")?;

    let id = segment.id;
    core_engine::timeline_ops::add_zoom_segment(project, segment)
        .map_err(|e| e.to_string())?;

    Ok(id.to_string())
}

/// Remove a zoom segment by ID.
#[tauri::command]
pub fn remove_zoom_segment(
    segment_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let id: Uuid = segment_id.parse().map_err(|e: uuid::Error| e.to_string())?;

    let mut project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_mut().ok_or("No project loaded")?;

    core_engine::timeline_ops::remove_zoom_segment(project, id)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Update a zoom segment (replace by ID).
#[tauri::command]
pub fn update_zoom_segment(
    segment_json: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let updated: ZoomSegment =
        serde_json::from_str(&segment_json).map_err(|e| e.to_string())?;

    let mut project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_mut().ok_or("No project loaded")?;

    if let Some(seg) = project.zoom_segments.iter_mut().find(|s| s.id == updated.id) {
        *seg = updated;
        Ok(())
    } else {
        Err(format!("Zoom segment {} not found", updated.id))
    }
}

/// Get all zoom segments for the current project.
#[tauri::command]
pub fn get_zoom_segments(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_ref().ok_or("No project loaded")?;

    serde_json::to_string(&project.zoom_segments).map_err(|e| e.to_string())
}
