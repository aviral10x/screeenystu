use std::path::{Path, PathBuf};
use tokio::process::Command;
use tracing;

/// Generate a low-resolution proxy for smoother editing.
/// Creates a 720p proxy at ~2Mbps in the same directory as the source.
pub async fn generate_proxy(
    source_path: &Path,
    output_dir: Option<&Path>,
) -> Result<PathBuf, String> {
    let ffmpeg = which_ffmpeg()?;

    let stem = source_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("proxy");
    let ext = source_path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");

    let out_dir = output_dir
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| {
            source_path.parent().unwrap_or(Path::new(".")).to_path_buf()
        });

    let proxy_path = out_dir.join(format!("{}_proxy.{}", stem, ext));

    let output = Command::new(&ffmpeg)
        .args([
            "-i",
            source_path.to_str().ok_or("Invalid source path")?,
            "-vf",
            "scale=-2:720",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "28",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            "-y",
            proxy_path.to_str().ok_or("Invalid proxy path")?,
        ])
        .output()
        .await
        .map_err(|e| format!("FFmpeg proxy generation failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg proxy error: {}", stderr));
    }

    tracing::info!("Generated proxy: {:?}", proxy_path);
    Ok(proxy_path)
}

/// Check if a proxy exists for a source file.
pub fn proxy_exists(source_path: &Path) -> Option<PathBuf> {
    let stem = source_path.file_stem()?.to_str()?;
    let ext = source_path.extension()?.to_str()?;
    let proxy = source_path
        .parent()?
        .join(format!("{}_proxy.{}", stem, ext));
    if proxy.exists() {
        Some(proxy)
    } else {
        None
    }
}

fn which_ffmpeg() -> Result<String, String> {
    std::process::Command::new("which")
        .arg("ffmpeg")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "ffmpeg not found in PATH".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proxy_path_generation() {
        let source = Path::new("/recordings/demo.mp4");
        let stem = source.file_stem().unwrap().to_str().unwrap();
        let ext = source.extension().unwrap().to_str().unwrap();
        let proxy = source.parent().unwrap().join(format!("{}_proxy.{}", stem, ext));
        assert_eq!(proxy, PathBuf::from("/recordings/demo_proxy.mp4"));
    }

    #[test]
    fn test_proxy_exists_returns_none() {
        let source = Path::new("/nonexistent/file.mp4");
        assert!(proxy_exists(source).is_none());
    }
}
