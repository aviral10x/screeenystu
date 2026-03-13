use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::project::TimeRange;

/// A caption/subtitle segment.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptionSegment {
    pub id: Uuid,
    pub time_range: TimeRange,
    pub text: String,
    pub style: CaptionStyle,
    /// Confidence from transcription engine (0.0 - 1.0)
    pub confidence: Option<f64>,
    /// Language code (e.g., "en", "es", "ja")
    pub language: Option<String>,
    /// Word-level timing for animated captions
    pub word_timings: Vec<WordTiming>,
}

/// Timing for individual words within a caption.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordTiming {
    pub word: String,
    pub start_ms: u64,
    pub end_ms: u64,
    pub confidence: f64,
}

/// Visual style for captions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptionStyle {
    pub preset: CaptionPreset,
    pub font_family: String,
    pub font_size: f64,
    pub font_weight: u16,
    pub text_color: String,
    pub background_color: Option<String>,
    pub background_opacity: f64,
    pub position: CaptionPosition,
    pub max_words_per_line: u32,
    pub outline_color: Option<String>,
    pub outline_width: f64,
}

impl Default for CaptionStyle {
    fn default() -> Self {
        Self {
            preset: CaptionPreset::Modern,
            font_family: "Inter".into(),
            font_size: 32.0,
            font_weight: 600,
            text_color: "#ffffff".into(),
            background_color: Some("rgba(0,0,0,0.6)".into()),
            background_opacity: 0.6,
            position: CaptionPosition::Bottom,
            max_words_per_line: 8,
            outline_color: None,
            outline_width: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CaptionPreset {
    Modern,
    Classic,
    Minimal,
    Bold,
    Outline,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CaptionPosition {
    Top,
    Center,
    Bottom,
    Custom { x: f64, y: f64 },
}

/// Transcription settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionSettings {
    pub engine: TranscriptionEngine,
    pub model_profile: ModelProfile,
    pub language: Option<String>,
    pub custom_vocabulary: Vec<String>,
    pub prompt: Option<String>,
}

impl Default for TranscriptionSettings {
    fn default() -> Self {
        Self {
            engine: TranscriptionEngine::WhisperLocal,
            model_profile: ModelProfile::Balanced,
            language: None,
            custom_vocabulary: Vec::new(),
            prompt: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TranscriptionEngine {
    WhisperLocal,
    AppleSpeech,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModelProfile {
    Fast,
    Balanced,
    Accurate,
}
