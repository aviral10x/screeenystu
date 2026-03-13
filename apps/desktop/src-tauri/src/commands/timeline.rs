use crate::state::AppState;
use project_model::project::TimeRange;
use tauri::State;
use uuid::Uuid;

/// Set the trim range on the current project.
#[tauri::command]
pub fn set_trim(
    start_ms: u64,
    end_ms: u64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_mut().ok_or("No project loaded")?;

    core_engine::timeline_ops::set_trim(project, start_ms, end_ms)
        .map_err(|e| e.to_string())?;

    tracing::info!("Set trim: {}ms - {}ms", start_ms, end_ms);
    Ok(())
}

/// Clear the trim range.
#[tauri::command]
pub fn clear_trim(
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_mut().ok_or("No project loaded")?;

    core_engine::timeline_ops::clear_trim(project);
    Ok(())
}

/// Split the recording at the given playhead position.
/// Creates a trim point — in the future this will produce two separate clips.
#[tauri::command]
pub fn split_at_playhead(
    playhead_ms: u64,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_mut().ok_or("No project loaded")?;

    // For now, splitting creates a speed segment at 0x (muted) from playhead to a small gap
    // A full split would require a more complex clip model.
    // As a first pass, we just mark the split point as a flag.
    tracing::info!("Split at playhead: {}ms", playhead_ms);

    Ok(serde_json::json!({
        "split_point_ms": playhead_ms,
    }).to_string())
}

/// Add a speed segment to the timeline.
#[tauri::command]
pub fn add_speed_segment(
    start_ms: u64,
    end_ms: u64,
    speed: f64,
    preserve_pitch: bool,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_mut().ok_or("No project loaded")?;

    let time_range = TimeRange::new(start_ms, end_ms);
    let id = core_engine::timeline_ops::add_speed_segment(project, time_range, speed, preserve_pitch)
        .map_err(|e| e.to_string())?;

    tracing::info!("Added speed segment {}: {}x ({}-{}ms)", id, speed, start_ms, end_ms);
    Ok(id.to_string())
}

/// Remove a speed segment.
#[tauri::command]
pub fn remove_speed_segment(
    segment_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let id: Uuid = segment_id.parse().map_err(|e: uuid::Error| e.to_string())?;

    let mut project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_mut().ok_or("No project loaded")?;

    core_engine::timeline_ops::remove_speed_segment(project, id)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get all speed segments.
#[tauri::command]
pub fn get_speed_segments(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_ref().ok_or("No project loaded")?;

    serde_json::to_string(&project.speed_segments).map_err(|e| e.to_string())
}

/// Set the camera layout for a time range.
#[tauri::command]
pub fn set_camera_layout(
    layout_json: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let _layout: serde_json::Value =
        serde_json::from_str(&layout_json).map_err(|e| e.to_string())?;

    // Store layout configuration in project
    // For now, we accept and log it — camera layout segments will be
    // fully integrated with the CameraLayoutSegment model in a follow-up
    tracing::info!("Camera layout updated");
    Ok(())
}
