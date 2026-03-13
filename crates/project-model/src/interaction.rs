use serde::{Deserialize, Serialize};

use crate::project::TimeRange;

/// The full interaction metadata stream collected during recording.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractionStream {
    pub cursor_points: Vec<CursorPoint>,
    pub click_events: Vec<ClickEvent>,
    pub keyboard_events: Vec<KeyboardEvent>,
    pub scroll_events: Vec<ScrollEvent>,
    pub typing_segments: Vec<TypingSegment>,
    pub active_app_changes: Vec<ActiveAppChange>,
}

impl InteractionStream {
    pub fn empty() -> Self {
        Self {
            cursor_points: Vec::new(),
            click_events: Vec::new(),
            keyboard_events: Vec::new(),
            scroll_events: Vec::new(),
            typing_segments: Vec::new(),
            active_app_changes: Vec::new(),
        }
    }
}

/// A cursor position sample.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct CursorPoint {
    /// Timestamp in milliseconds from recording start
    pub timestamp_ms: u64,
    /// X position in screen coordinates
    pub x: f64,
    /// Y position in screen coordinates
    pub y: f64,
    /// Whether the cursor is currently visible
    pub visible: bool,
}

/// A mouse click event.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClickEvent {
    pub timestamp_ms: u64,
    pub x: f64,
    pub y: f64,
    pub button: MouseButton,
    pub click_type: ClickType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClickType {
    Single,
    Double,
    Triple,
}

/// A keyboard event (modifier key combos, shortcuts).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardEvent {
    pub timestamp_ms: u64,
    pub key: String,
    pub modifiers: Vec<KeyModifier>,
    pub event_type: KeyEventType,
    /// Whether this is considered a "shortcut" vs regular typing
    pub is_shortcut: bool,
    /// Human-readable label for display (e.g., "⌘+C")
    pub display_label: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum KeyModifier {
    Command,
    Shift,
    Option,
    Control,
    Function,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KeyEventType {
    KeyDown,
    KeyUp,
}

/// A scroll event.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrollEvent {
    pub timestamp_ms: u64,
    pub x: f64,
    pub y: f64,
    pub delta_x: f64,
    pub delta_y: f64,
}

/// A detected dense text-entry region.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypingSegment {
    pub time_range: TimeRange,
    /// Average keystrokes per second in this segment
    pub keystrokes_per_second: f64,
    /// Confidence that this is actual typing (0.0 - 1.0)
    pub confidence: f64,
    /// Suggested speed multiplier to apply
    pub suggested_speed: f64,
}

/// A change in active application.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveAppChange {
    pub timestamp_ms: u64,
    pub app_name: String,
    pub window_title: Option<String>,
    pub bundle_id: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_interaction_stream_roundtrip() {
        let stream = InteractionStream {
            cursor_points: vec![
                CursorPoint { timestamp_ms: 0, x: 100.0, y: 200.0, visible: true },
                CursorPoint { timestamp_ms: 16, x: 105.0, y: 202.0, visible: true },
            ],
            click_events: vec![ClickEvent {
                timestamp_ms: 500,
                x: 300.0,
                y: 400.0,
                button: MouseButton::Left,
                click_type: ClickType::Single,
            }],
            keyboard_events: vec![KeyboardEvent {
                timestamp_ms: 1000,
                key: "c".into(),
                modifiers: vec![KeyModifier::Command],
                event_type: KeyEventType::KeyDown,
                is_shortcut: true,
                display_label: Some("⌘C".into()),
            }],
            scroll_events: Vec::new(),
            typing_segments: Vec::new(),
            active_app_changes: Vec::new(),
        };

        let json = serde_json::to_string(&stream).unwrap();
        let loaded: InteractionStream = serde_json::from_str(&json).unwrap();
        assert_eq!(loaded.cursor_points.len(), 2);
        assert_eq!(loaded.click_events.len(), 1);
        assert_eq!(loaded.keyboard_events[0].modifiers[0], KeyModifier::Command);
    }
}
