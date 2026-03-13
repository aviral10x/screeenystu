/// Tauri command: Generate a low-res proxy for editing performance.
#[tauri::command]
pub async fn generate_proxy(source_path: String) -> Result<String, String> {
    let source = std::path::Path::new(&source_path);
    if !source.exists() {
        return Err(format!("Source file not found: {}", source_path));
    }

    let proxy_path = export_engine::proxy::generate_proxy(source, None).await?;

    Ok(proxy_path.to_string_lossy().to_string())
}

/// Tauri command: Check if a proxy already exists.
#[tauri::command]
pub fn check_proxy(source_path: String) -> Option<String> {
    let source = std::path::Path::new(&source_path);
    export_engine::proxy::proxy_exists(source).map(|p| p.to_string_lossy().to_string())
}
