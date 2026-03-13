use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::project::TimeRange;

/// Timeline editing state.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineState {
    /// Trim range applied to the source recording
    pub trim: Option<TimeRange>,

    /// Current playhead position in ms
    pub playhead_ms: u64,

    /// Zoom level for the timeline UI (1.0 = default)
    pub ui_zoom: f64,

    /// Whether the timeline is playing
    pub is_playing: bool,
}

impl Default for TimelineState {
    fn default() -> Self {
        Self {
            trim: None,
            playhead_ms: 0,
            ui_zoom: 1.0,
            is_playing: false,
        }
    }
}

/// A zoom segment on the timeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoomSegment {
    pub id: Uuid,
    pub time_range: TimeRange,
    /// The target rectangle in source coordinates (normalized 0..1)
    pub target_rect: NormalizedRect,
    /// Scale multiplier when zoomed in
    pub scale: f64,
    /// Easing curve for zoom in
    pub ease_in: EasingCurve,
    /// Easing curve for zoom out
    pub ease_out: EasingCurve,
    /// Duration of the zoom-in transition in ms
    pub transition_in_ms: u64,
    /// Duration of the zoom-out transition in ms
    pub transition_out_ms: u64,
    /// Whether this was auto-generated
    pub auto_generated: bool,
    /// Confidence score if auto-generated (0.0 - 1.0)
    pub confidence: Option<f64>,
}

/// A normalized rectangle (all values 0.0 - 1.0 relative to source dimensions).
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct NormalizedRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl NormalizedRect {
    pub fn full() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0,
        }
    }

    pub fn center(&self) -> (f64, f64) {
        (self.x + self.width / 2.0, self.y + self.height / 2.0)
    }
}

/// Easing curve for animations.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EasingCurve {
    Linear,
    EaseIn,
    EaseOut,
    EaseInOut,
    CubicBezier(f64, f64, f64, f64),
}

/// A speed adjustment segment.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeedSegment {
    pub id: Uuid,
    pub time_range: TimeRange,
    /// Speed multiplier (0.25 = quarter speed, 2.0 = double speed, etc.)
    pub speed: f64,
    /// Whether to preserve audio pitch
    pub preserve_pitch: bool,
    /// Whether audio is muted during this segment
    pub mute_audio: bool,
    /// Whether this was auto-detected (e.g., typing segment)
    pub auto_detected: bool,
}

/// A mask/highlight segment on the timeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaskSegment {
    pub id: Uuid,
    pub time_range: TimeRange,
    pub mask_type: MaskType,
    /// Rectangle in normalized coordinates
    pub rect: NormalizedRect,
    /// Opacity of the dimmed region outside the mask (0.0 - 1.0)
    pub dim_opacity: f64,
    /// Corner radius for RoundedRectangle
    pub corner_radius: f64,
    /// Optional feather/blur amount on mask edges
    pub feather: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MaskType {
    Rectangle,
    RoundedRectangle,
    Spotlight,
}

/// A camera layout segment controlling webcam presentation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraLayoutSegment {
    pub id: Uuid,
    pub time_range: TimeRange,
    pub layout: CameraLayout,
    /// Transition duration to this layout in ms
    pub transition_ms: u64,
    pub transition_easing: EasingCurve,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum CameraLayout {
    /// Small overlay in a corner
    Overlay {
        position: OverlayPosition,
        size: f64,
        corner_radius: f64,
        border_width: f64,
        border_color: String,
    },
    /// Full screen camera
    Fullscreen,
    /// Camera hidden
    Hidden,
    /// Side-by-side with screen
    SideBySide {
        camera_fraction: f64,
        camera_side: Side,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OverlayPosition {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Custom { x: f64, y: f64 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Side {
    Left,
    Right,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalized_rect() {
        let rect = NormalizedRect::full();
        let (cx, cy) = rect.center();
        assert!((cx - 0.5).abs() < f64::EPSILON);
        assert!((cy - 0.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_zoom_segment_serialization() {
        let segment = ZoomSegment {
            id: Uuid::new_v4(),
            time_range: crate::project::TimeRange::new(0, 5000),
            target_rect: NormalizedRect {
                x: 0.2,
                y: 0.2,
                width: 0.6,
                height: 0.6,
            },
            scale: 2.0,
            ease_in: EasingCurve::EaseInOut,
            ease_out: EasingCurve::EaseOut,
            transition_in_ms: 400,
            transition_out_ms: 400,
            auto_generated: true,
            confidence: Some(0.85),
        };

        let json = serde_json::to_string(&segment).unwrap();
        let deserialized: ZoomSegment = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.scale, 2.0);
    }
}
