use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::caption::CaptionSegment;
use crate::export::ExportPreset;
use crate::interaction::InteractionStream;
use crate::media::SourceMedia;
use crate::timeline::{
    CameraLayoutSegment, MaskSegment, SpeedSegment, TimelineState, ZoomSegment,
};
use crate::version::SCHEMA_VERSION;

/// Top-level project model for a ScreenCraft project.
/// This is the root of the serialized project file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    /// Schema version for migration support
    pub schema_version: u32,

    /// Unique project identifier
    pub id: Uuid,

    /// Human-readable project name
    pub name: String,

    /// Creation timestamp
    pub created_at: DateTime<Utc>,

    /// Last modification timestamp
    pub updated_at: DateTime<Utc>,

    /// The capture session that produced the raw assets
    pub capture_session: Option<CaptureSession>,

    /// Source media files associated with this project
    pub sources: Vec<SourceMedia>,

    /// Timeline editing state
    pub timeline: TimelineState,

    /// Interaction metadata stream from recording
    pub interaction_stream: Option<InteractionStream>,

    /// Zoom segments (auto-generated or manually created)
    pub zoom_segments: Vec<ZoomSegment>,

    /// Speed adjustment segments
    pub speed_segments: Vec<SpeedSegment>,

    /// Caption/subtitle segments
    pub caption_segments: Vec<CaptionSegment>,

    /// Mask/highlight segments
    pub mask_segments: Vec<MaskSegment>,

    /// Camera layout segments
    pub camera_layout_segments: Vec<CameraLayoutSegment>,

    /// Canvas/layout settings
    pub canvas: CanvasSettings,

    /// Cursor appearance settings
    pub cursor_settings: CursorSettings,

    /// Export presets saved with this project
    pub export_presets: Vec<ExportPreset>,

    /// Preset reference (if project was created from a preset)
    pub preset_id: Option<String>,
}

impl Project {
    /// Create a new empty project.
    pub fn new(name: impl Into<String>) -> Self {
        let now = Utc::now();
        Self {
            schema_version: SCHEMA_VERSION,
            id: Uuid::new_v4(),
            name: name.into(),
            created_at: now,
            updated_at: now,
            capture_session: None,
            sources: Vec::new(),
            timeline: TimelineState::default(),
            interaction_stream: None,
            zoom_segments: Vec::new(),
            speed_segments: Vec::new(),
            caption_segments: Vec::new(),
            mask_segments: Vec::new(),
            camera_layout_segments: Vec::new(),
            canvas: CanvasSettings::default(),
            cursor_settings: CursorSettings::default(),
            export_presets: Vec::new(),
            preset_id: None,
        }
    }

    /// Serialize project to JSON string.
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Deserialize project from JSON string.
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }

    /// Touch the updated_at timestamp.
    pub fn touch(&mut self) {
        self.updated_at = Utc::now();
    }
}

/// Represents a completed capture session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureSession {
    pub id: Uuid,
    pub started_at: DateTime<Utc>,
    pub ended_at: DateTime<Utc>,
    pub duration_ms: u64,
    pub recording_target: RecordingTarget,
    pub flags: Vec<RecordingFlag>,
    pub pause_regions: Vec<TimeRange>,
}

/// What was being recorded.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RecordingTarget {
    FullDisplay { display_id: u32 },
    Window { window_id: u32, app_name: String },
    Area { x: f64, y: f64, width: f64, height: f64, display_id: u32 },
}

/// A flag/marker placed during recording.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingFlag {
    pub timestamp_ms: u64,
    pub label: Option<String>,
}

/// A time range in milliseconds.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct TimeRange {
    pub start_ms: u64,
    pub end_ms: u64,
}

impl TimeRange {
    pub fn new(start_ms: u64, end_ms: u64) -> Self {
        Self { start_ms, end_ms }
    }

    pub fn duration_ms(&self) -> u64 {
        self.end_ms.saturating_sub(self.start_ms)
    }

    pub fn contains(&self, time_ms: u64) -> bool {
        time_ms >= self.start_ms && time_ms <= self.end_ms
    }

    pub fn overlaps(&self, other: &TimeRange) -> bool {
        self.start_ms < other.end_ms && other.start_ms < self.end_ms
    }
}

/// Canvas/layout settings controlling the output frame.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasSettings {
    pub aspect_ratio: AspectRatio,
    pub background: Background,
    pub padding: f64,
    pub corner_radius: f64,
    pub shadow: ShadowSettings,
    pub inset: f64,
}

impl Default for CanvasSettings {
    fn default() -> Self {
        Self {
            aspect_ratio: AspectRatio::Landscape16x9,
            background: Background::default(),
            padding: 48.0,
            corner_radius: 12.0,
            shadow: ShadowSettings::default(),
            inset: 0.0,
        }
    }
}

/// Aspect ratio preset.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AspectRatio {
    Landscape16x9,
    Landscape16x10,
    Portrait9x16,
    Square1x1,
    Custom { width: u32, height: u32 },
}

impl AspectRatio {
    pub fn dimensions(&self, base_width: u32) -> (u32, u32) {
        match self {
            AspectRatio::Landscape16x9 => (base_width, base_width * 9 / 16),
            AspectRatio::Landscape16x10 => (base_width, base_width * 10 / 16),
            AspectRatio::Portrait9x16 => (base_width, base_width * 16 / 9),
            AspectRatio::Square1x1 => (base_width, base_width),
            AspectRatio::Custom { width, height } => {
                let h = (base_width as f64 * *height as f64 / *width as f64) as u32;
                (base_width, h)
            }
        }
    }
}

/// Background style for the canvas.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Background {
    SolidColor { color: String },
    LinearGradient { from: String, to: String, angle: f64 },
    RadialGradient { from: String, to: String },
    Image { path: String },
    Transparent,
}

impl Default for Background {
    fn default() -> Self {
        Background::LinearGradient {
            from: "#6366f1".into(),
            to: "#8b5cf6".into(),
            angle: 135.0,
        }
    }
}

/// Shadow settings for the recording frame.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShadowSettings {
    pub enabled: bool,
    pub color: String,
    pub blur: f64,
    pub offset_x: f64,
    pub offset_y: f64,
    pub spread: f64,
}

impl Default for ShadowSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            color: "rgba(0,0,0,0.3)".into(),
            blur: 40.0,
            offset_x: 0.0,
            offset_y: 20.0,
            spread: 0.0,
        }
    }
}

/// Cursor appearance and behavior settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorSettings {
    pub visible: bool,
    pub smoothing_enabled: bool,
    pub smoothing_amount: f64,
    pub size_multiplier: f64,
    pub use_custom_cursor: bool,
    pub hide_when_static: bool,
    pub hide_static_delay_ms: u64,
    pub click_emphasis: ClickEmphasis,
}

impl Default for CursorSettings {
    fn default() -> Self {
        Self {
            visible: true,
            smoothing_enabled: true,
            smoothing_amount: 0.5,
            size_multiplier: 1.5,
            use_custom_cursor: false,
            hide_when_static: false,
            hide_static_delay_ms: 3000,
            click_emphasis: ClickEmphasis::default(),
        }
    }
}

/// Click emphasis effect.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClickEmphasis {
    pub enabled: bool,
    pub style: ClickEmphasisStyle,
    pub color: String,
    pub size: f64,
    pub duration_ms: u64,
    pub sound_enabled: bool,
}

impl Default for ClickEmphasis {
    fn default() -> Self {
        Self {
            enabled: true,
            style: ClickEmphasisStyle::Pulse,
            color: "rgba(99,102,241,0.5)".into(),
            size: 40.0,
            duration_ms: 300,
            sound_enabled: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClickEmphasisStyle {
    Pulse,
    Ring,
    Ripple,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_project_roundtrip() {
        let project = Project::new("Test Project");
        let json = project.to_json().unwrap();
        let loaded = Project::from_json(&json).unwrap();
        assert_eq!(loaded.name, "Test Project");
        assert_eq!(loaded.schema_version, SCHEMA_VERSION);
    }

    #[test]
    fn test_time_range() {
        let range = TimeRange::new(100, 500);
        assert_eq!(range.duration_ms(), 400);
        assert!(range.contains(200));
        assert!(!range.contains(600));

        let other = TimeRange::new(400, 800);
        assert!(range.overlaps(&other));

        let non_overlapping = TimeRange::new(600, 900);
        assert!(!range.overlaps(&non_overlapping));
    }
}
