use crate::state::AppState;
use project_model::{Project, SourceMedia, MediaType, InteractionStream};
use std::path::PathBuf;
use tauri::State;
use uuid::Uuid;

/// Create a project from a completed recording session.
/// Takes the output directory from the capture helper and creates
/// a proper .screencraft project bundle.
#[tauri::command]
pub fn create_project_from_recording(
    name: String,
    capture_dir: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let capture_path = PathBuf::from(&capture_dir);

    if !capture_path.exists() {
        return Err(format!("Capture directory does not exist: {}", capture_dir));
    }

    let mut project = Project::new(name);

    // Scan for media files in the capture directory
    let entries = std::fs::read_dir(&capture_path).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let file_size = entry.metadata().map(|m| m.len()).unwrap_or(0);

        let media_type = match filename.as_str() {
            "screen.mov" => Some(MediaType::ScreenRecording),
            "mic.m4a" => Some(MediaType::MicrophoneAudio),
            "system.m4a" => Some(MediaType::SystemAudio),
            "camera.mov" => Some(MediaType::CameraRecording),
            _ => None,
        };

        if let Some(mt) = media_type {
            let source = SourceMedia {
                id: Uuid::new_v4(),
                media_type: mt,
                relative_path: format!("assets/{}", filename),
                filename: filename.clone(),
                duration_ms: None, // Will be probed later
                width: None,
                height: None,
                fps: None,
                sample_rate: None,
                file_size_bytes: file_size,
                added_at: chrono::Utc::now(),
                codec: None,
                has_proxy: false,
                proxy_path: None,
            };
            project.sources.push(source);
        }
    }

    // Load interaction metadata if present
    let metadata_path = capture_path.join("metadata.json");
    if metadata_path.exists() {
        if let Ok(json) = std::fs::read_to_string(&metadata_path) {
            match serde_json::from_str::<InteractionStream>(&json) {
                Ok(stream) => {
                    project.interaction_stream = Some(stream);
                    tracing::info!("Loaded interaction metadata");
                }
                Err(e) => {
                    tracing::warn!("Failed to parse interaction metadata: {}", e);
                }
            }
        }
    }

    let project_json = project.to_json().map_err(|e| e.to_string())?;
    let id = project.id.to_string();

    // Store in app state
    let mut project_lock = state.project.lock().map_err(|e| e.to_string())?;
    *project_lock = Some(project);

    let mut stack = state.command_stack.lock().map_err(|e| e.to_string())?;
    stack.clear();

    tracing::info!("Created project from recording: {}", id);
    Ok(project_json)
}

/// Save a project as a .screencraft bundle.
#[tauri::command]
pub fn save_project_bundle(
    _project_id: String,
    bundle_path: String,
    capture_dir: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let project = state.project.lock().map_err(|e| e.to_string())?;
    let project = project.as_ref().ok_or("No project loaded")?;

    let bundle = PathBuf::from(&bundle_path);

    // Create bundle directories
    let dirs = ["assets", "cache", "cache/thumbnails", "cache/waveforms", "cache/proxies", "exports"];
    for dir in &dirs {
        std::fs::create_dir_all(bundle.join(dir)).map_err(|e| e.to_string())?;
    }

    // Copy assets from capture directory if provided
    if let Some(capture) = capture_dir {
        let capture_path = PathBuf::from(&capture);
        let assets_dir = bundle.join("assets");

        for ext in &["mov", "m4a", "mp4"] {
            if let Ok(entries) = std::fs::read_dir(&capture_path) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) == Some(ext) {
                        let dest = assets_dir.join(path.file_name().unwrap());
                        if !dest.exists() {
                            std::fs::copy(&path, &dest).map_err(|e| e.to_string())?;
                        }
                    }
                }
            }
        }
    }

    // Write project.json
    let json = project.to_json().map_err(|e| e.to_string())?;
    std::fs::write(bundle.join("project.json"), json).map_err(|e| e.to_string())?;

    tracing::info!("Saved project bundle to: {}", bundle_path);
    Ok(())
}
