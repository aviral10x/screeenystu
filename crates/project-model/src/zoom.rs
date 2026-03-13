use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::project::TimeRange;
use crate::timeline::NormalizedRect;

/// Configuration for the auto-zoom analysis engine.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoomAnalysisConfig {
    /// Minimum duration for a zoom segment (ms)
    pub min_segment_duration_ms: u64,
    /// Maximum zoom scale
    pub max_scale: f64,
    /// Minimum confidence score to include a suggestion
    pub min_confidence: f64,
    /// How aggressively to merge nearby focus events (ms)
    pub merge_threshold_ms: u64,
    /// Padding around the focus area (normalized, 0.0 - 0.5)
    pub focus_padding: f64,
    /// Whether to respect export aspect ratio when computing zoom rects
    pub respect_aspect_ratio: bool,
    /// Maximum cursor travel speed (px/s) before classifying as "rapid travel"
    pub rapid_travel_threshold: f64,
    /// Minimum idle time (ms) before considering a new focus region
    pub idle_threshold_ms: u64,
}

impl Default for ZoomAnalysisConfig {
    fn default() -> Self {
        Self {
            min_segment_duration_ms: 1500,
            max_scale: 3.0,
            min_confidence: 0.3,
            merge_threshold_ms: 800,
            focus_padding: 0.1,
            respect_aspect_ratio: true,
            rapid_travel_threshold: 5000.0,
            idle_threshold_ms: 500,
        }
    }
}

/// A candidate focus region produced by the zoom analysis engine.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoomCandidate {
    pub id: Uuid,
    pub time_range: TimeRange,
    pub focus_rect: NormalizedRect,
    pub suggested_scale: f64,
    pub confidence: f64,
    pub reason: ZoomReason,
}

/// Why the zoom engine identified this region.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ZoomReason {
    /// User clicked in a specific area
    ClickActivity,
    /// Cursor hovered/focused in a tight area
    CursorFocus,
    /// Active typing suggests editor/terminal focus
    TypingActivity,
    /// Scroll activity in a region
    ScrollFocus,
    /// App window changed suggesting new context
    AppSwitch,
    /// Manual user override
    Manual,
}
