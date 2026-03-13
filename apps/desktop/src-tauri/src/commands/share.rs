use tauri::State;
use crate::state::AppState;

/// Upload a file to the share API and return the share URL.
/// This command handles the presign → upload → complete → create share flow.
#[tauri::command]
pub async fn upload_and_share(
    file_path: String,
    api_base: Option<String>,
) -> Result<String, String> {
    let api = api_base.unwrap_or_else(|| "http://localhost:3001".to_string());
    let filename = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("recording.mp4")
        .to_string();

    let file_content = tokio::fs::read(&file_path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;
    let file_size = file_content.len() as i64;

    let client = reqwest::Client::new();

    // Step 1: Get presigned URL
    let presign_resp = client
        .post(format!("{}/api/uploads/presign", api))
        .json(&serde_json::json!({
            "filename": filename,
            "content_type": "video/mp4",
            "file_size_bytes": file_size,
        }))
        .send()
        .await
        .map_err(|e| format!("Presign request failed: {}", e))?;

    let presign: serde_json::Value = presign_resp
        .json()
        .await
        .map_err(|e| format!("Presign parse failed: {}", e))?;

    let upload_url = presign["upload_url"]
        .as_str()
        .ok_or("Missing upload_url")?;
    let storage_key = presign["storage_key"]
        .as_str()
        .ok_or("Missing storage_key")?;

    // Step 2: Upload to S3
    client
        .put(upload_url)
        .header("Content-Type", "video/mp4")
        .body(file_content)
        .send()
        .await
        .map_err(|e| format!("S3 upload failed: {}", e))?;

    // Step 3: Mark complete
    let complete_resp = client
        .post(format!("{}/api/uploads/complete", api))
        .json(&serde_json::json!({
            "storage_key": storage_key,
            "filename": filename,
            "file_size_bytes": file_size,
            "mime_type": "video/mp4",
        }))
        .send()
        .await
        .map_err(|e| format!("Complete request failed: {}", e))?;

    let complete: serde_json::Value = complete_resp
        .json()
        .await
        .map_err(|e| format!("Complete parse failed: {}", e))?;

    let asset_id = complete["asset"]["id"]
        .as_str()
        .ok_or("Missing asset id")?;

    // Step 4: Create share link
    let share_resp = client
        .post(format!("{}/api/shares", api))
        .json(&serde_json::json!({
            "asset_id": asset_id,
        }))
        .send()
        .await
        .map_err(|e| format!("Share request failed: {}", e))?;

    let share: serde_json::Value = share_resp
        .json()
        .await
        .map_err(|e| format!("Share parse failed: {}", e))?;

    let share_url = share["share_url"]
        .as_str()
        .ok_or("Missing share_url")?
        .to_string();

    tracing::info!("Shared: {} -> {}", file_path, share_url);

    Ok(serde_json::json!({
        "share_url": share_url,
        "asset_id": asset_id,
        "slug": share["slug"],
    })
    .to_string())
}
