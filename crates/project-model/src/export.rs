use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Export format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    Mp4,
    Gif,
    WebM,
}

/// Export quality preset.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportPreset {
    pub id: Uuid,
    pub name: String,
    pub format: ExportFormat,
    pub resolution: Resolution,
    pub fps: u32,
    pub quality: QualityLevel,
    pub compression: CompressionSettings,
}

impl ExportPreset {
    pub fn web() -> Self {
        Self {
            id: Uuid::new_v4(),
            name: "Web".into(),
            format: ExportFormat::Mp4,
            resolution: Resolution::Preset(ResolutionPreset::P1080),
            fps: 30,
            quality: QualityLevel::Medium,
            compression: CompressionSettings::default(),
        }
    }

    pub fn social_portrait() -> Self {
        Self {
            id: Uuid::new_v4(),
            name: "Social Portrait".into(),
            format: ExportFormat::Mp4,
            resolution: Resolution::Preset(ResolutionPreset::P1080),
            fps: 30,
            quality: QualityLevel::Medium,
            compression: CompressionSettings::default(),
        }
    }

    pub fn presentation() -> Self {
        Self {
            id: Uuid::new_v4(),
            name: "Presentation".into(),
            format: ExportFormat::Mp4,
            resolution: Resolution::Preset(ResolutionPreset::P1440),
            fps: 30,
            quality: QualityLevel::High,
            compression: CompressionSettings {
                video_bitrate_kbps: Some(8000),
                ..Default::default()
            },
        }
    }

    pub fn high_quality() -> Self {
        Self {
            id: Uuid::new_v4(),
            name: "High Quality".into(),
            format: ExportFormat::Mp4,
            resolution: Resolution::Preset(ResolutionPreset::P4K),
            fps: 60,
            quality: QualityLevel::Ultra,
            compression: CompressionSettings {
                video_bitrate_kbps: Some(20000),
                ..Default::default()
            },
        }
    }

    pub fn gif_short() -> Self {
        Self {
            id: Uuid::new_v4(),
            name: "GIF Short Clip".into(),
            format: ExportFormat::Gif,
            resolution: Resolution::Preset(ResolutionPreset::P720),
            fps: 15,
            quality: QualityLevel::Medium,
            compression: CompressionSettings {
                max_colors: Some(256),
                ..Default::default()
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Resolution {
    Preset(ResolutionPreset),
    Custom { width: u32, height: u32 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResolutionPreset {
    P720,
    P1080,
    P1440,
    P4K,
}

impl ResolutionPreset {
    pub fn dimensions(&self) -> (u32, u32) {
        match self {
            ResolutionPreset::P720 => (1280, 720),
            ResolutionPreset::P1080 => (1920, 1080),
            ResolutionPreset::P1440 => (2560, 1440),
            ResolutionPreset::P4K => (3840, 2160),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QualityLevel {
    Low,
    Medium,
    High,
    Ultra,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionSettings {
    pub video_bitrate_kbps: Option<u32>,
    pub audio_bitrate_kbps: Option<u32>,
    pub max_colors: Option<u32>,
    pub crf: Option<u32>,
    pub two_pass: bool,
}

impl Default for CompressionSettings {
    fn default() -> Self {
        Self {
            video_bitrate_kbps: Some(5000),
            audio_bitrate_kbps: Some(192),
            max_colors: None,
            crf: Some(23),
            two_pass: false,
        }
    }
}

/// A render/export job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderJob {
    pub id: Uuid,
    pub project_id: Uuid,
    pub preset: ExportPreset,
    pub output_path: String,
    pub status: RenderJobStatus,
    pub progress: f64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RenderJobStatus {
    Queued,
    InProgress,
    Completed,
    Failed,
    Cancelled,
}

/// A shared asset for the backend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SharedAsset {
    pub id: Uuid,
    pub project_id: Uuid,
    pub storage_key: String,
    pub share_url: Option<String>,
    pub is_public: bool,
    pub view_count: u64,
}

/// A comment on a shared video.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentThread {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub comments: Vec<Comment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    pub id: Uuid,
    pub author_name: String,
    pub text: String,
    pub timestamp_ms: Option<u64>,
    pub created_at: String,
}
