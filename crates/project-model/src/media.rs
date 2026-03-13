use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A source media file in the project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceMedia {
    pub id: Uuid,
    pub media_type: MediaType,
    /// Relative path within the project bundle
    pub relative_path: String,
    /// Original file name
    pub filename: String,
    /// Duration in milliseconds (for audio/video)
    pub duration_ms: Option<u64>,
    /// Width in pixels (for video/images)
    pub width: Option<u32>,
    /// Height in pixels (for video/images)
    pub height: Option<u32>,
    /// Frame rate (for video)
    pub fps: Option<f64>,
    /// Sample rate (for audio)
    pub sample_rate: Option<u32>,
    /// File size in bytes
    pub file_size_bytes: u64,
    /// When this source was added
    pub added_at: DateTime<Utc>,
    /// Codec information
    pub codec: Option<String>,
    /// Whether a proxy has been generated
    pub has_proxy: bool,
    /// Relative path to proxy media if generated
    pub proxy_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MediaType {
    ScreenRecording,
    CameraRecording,
    MicrophoneAudio,
    SystemAudio,
    BackgroundMusic,
    ImportedVideo,
    ImportedAudio,
    ImportedImage,
}

/// Audio track configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioTrackConfig {
    pub source_id: Uuid,
    pub volume: f64,
    pub muted: bool,
    pub duck_under_voice: bool,
    pub duck_amount: f64,
}

impl Default for AudioTrackConfig {
    fn default() -> Self {
        Self {
            source_id: Uuid::nil(),
            volume: 1.0,
            muted: false,
            duck_under_voice: false,
            duck_amount: 0.5,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_media_type_serialization() {
        let mt = MediaType::ScreenRecording;
        let json = serde_json::to_string(&mt).unwrap();
        assert_eq!(json, "\"ScreenRecording\"");
    }
}
