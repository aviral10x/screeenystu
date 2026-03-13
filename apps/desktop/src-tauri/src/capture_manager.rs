use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::thread;
use tauri::{AppHandle, Emitter, Manager};

/// Manages the lifecycle of the Swift capture helper process.
pub struct CaptureManager {
    child: Option<Child>,
    output_dir: Option<PathBuf>,
    helper_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureEvent {
    pub event: String,
    #[serde(default)]
    pub timestamp: Option<u64>,
    #[serde(default)]
    pub output_dir: Option<String>,
    #[serde(default)]
    pub elapsed_ms: Option<u64>,
    #[serde(default)]
    pub duration_ms: Option<u64>,
    #[serde(default)]
    pub state: Option<String>,
    #[serde(default)]
    pub files: Option<serde_json::Value>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub timestamp_ms: Option<u64>,
    #[serde(default)]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingConfig {
    pub target: serde_json::Value,
    #[serde(default = "default_true")]
    pub mic_enabled: bool,
    #[serde(default)]
    pub camera_enabled: bool,
    #[serde(default = "default_true")]
    pub system_audio_enabled: bool,
    #[serde(default = "default_fps")]
    pub fps: u32,
    pub output_dir: Option<String>,
}

fn default_true() -> bool {
    true
}
fn default_fps() -> u32 {
    60
}

impl CaptureManager {
    pub fn new(app_handle: &AppHandle) -> Self {
        // Look for the helper binary in the app's resource directory, or fallback
        let helper_path = Self::find_helper_path(app_handle);
        Self {
            child: None,
            output_dir: None,
            helper_path,
        }
    }

    fn find_helper_path(app_handle: &AppHandle) -> PathBuf {
        // In dev mode, try the Swift build directory
        let dev_paths = [
            // Built via `swift build` in native/swift-capture
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../../../native/swift-capture/.build/debug/screencraft-capture"),
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../../../native/swift-capture/.build/release/screencraft-capture"),
        ];

        for path in &dev_paths {
            if path.exists() {
                return path.canonicalize().unwrap_or_else(|_| path.clone());
            }
        }

        // In production, it should be bundled with the app
        if let Ok(resource_dir) = app_handle.path().resource_dir() {
            let bundled = resource_dir.join("screencraft-capture");
            if bundled.exists() {
                return bundled;
            }
        }

        // Fallback: assume it's in PATH
        PathBuf::from("screencraft-capture")
    }

    pub fn is_recording(&self) -> bool {
        self.child.is_some()
    }

    /// Start the capture helper process.
    pub fn start(
        &mut self,
        config: RecordingConfig,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        if self.child.is_some() {
            return Err("Recording already in progress".into());
        }

        let config_json = serde_json::to_string(&config).map_err(|e| e.to_string())?;

        tracing::info!("Starting capture helper: {:?}", self.helper_path);
        tracing::info!("Config: {}", config_json);

        let mut child = Command::new(&self.helper_path)
            .args(["start", "--config", &config_json])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn capture helper: {}", e))?;

        // Read stdout in a background thread to parse JSON events
        if let Some(stdout) = child.stdout.take() {
            let handle = app_handle.clone();
            thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    match line {
                        Ok(text) => {
                            if text.trim().is_empty() {
                                continue;
                            }
                            match serde_json::from_str::<CaptureEvent>(&text) {
                                Ok(event) => {
                                    tracing::info!("Capture event: {:?}", event);
                                    let event_name =
                                        format!("recording-{}", event.event);
                                    let _ = handle.emit(&event_name, &event);
                                    let _ = handle.emit("recording-event", &event);
                                }
                                Err(e) => {
                                    tracing::warn!(
                                        "Failed to parse capture output: {} — line: {}",
                                        e,
                                        text
                                    );
                                }
                            }
                        }
                        Err(e) => {
                            tracing::error!("Failed to read capture output: {}", e);
                            break;
                        }
                    }
                }
                tracing::info!("Capture helper stdout stream ended");
            });
        }

        // Read stderr for diagnostics
        if let Some(stderr) = child.stderr.take() {
            thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(text) = line {
                        tracing::warn!("[capture-helper stderr] {}", text);
                    }
                }
            });
        }

        self.output_dir = config.output_dir.map(PathBuf::from);
        self.child = Some(child);
        Ok(())
    }

    /// Send a command to the running capture helper via stdin.
    fn send_command(&mut self, cmd: &str) -> Result<(), String> {
        if let Some(ref mut child) = self.child {
            if let Some(ref mut stdin) = child.stdin {
                writeln!(stdin, "{}", cmd).map_err(|e| e.to_string())?;
                stdin.flush().map_err(|e| e.to_string())?;
                return Ok(());
            }
        }
        Err("No active recording".into())
    }

    pub fn pause(&mut self) -> Result<(), String> {
        self.send_command("pause")
    }

    pub fn resume(&mut self) -> Result<(), String> {
        self.send_command("resume")
    }

    pub fn stop(&mut self) -> Result<(), String> {
        self.send_command("stop")?;
        // Wait for the child to exit
        if let Some(mut child) = self.child.take() {
            let _ = child.wait();
        }
        Ok(())
    }

    pub fn add_flag(&mut self, label: Option<String>) -> Result<(), String> {
        let cmd = match label {
            Some(l) => format!("flag {}", l),
            None => "flag".to_string(),
        };
        self.send_command(&cmd)
    }

    /// List sources by running the helper with a list-* command.
    pub fn list_sources(helper_path: &Path, source_type: &str) -> Result<String, String> {
        let output = Command::new(helper_path)
            .arg(format!("list-{}", source_type))
            .output()
            .map_err(|e| format!("Failed to run capture helper: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Capture helper failed: {}", stderr));
        }

        String::from_utf8(output.stdout).map_err(|e| e.to_string())
    }

    pub fn output_dir(&self) -> Option<&Path> {
        self.output_dir.as_deref()
    }
}
