use project_model::interaction::{ClickEvent, CursorPoint, InteractionStream};
use project_model::project::TimeRange;
use project_model::timeline::{EasingCurve, NormalizedRect, ZoomSegment};
use project_model::zoom::{ZoomAnalysisConfig, ZoomCandidate, ZoomReason};
use uuid::Uuid;

/// The zoom analysis engine analyzes interaction metadata
/// and produces editable zoom suggestions.
pub struct ZoomAnalyzer {
    config: ZoomAnalysisConfig,
    /// Source dimensions for normalizing coordinates
    source_width: f64,
    source_height: f64,
}

impl ZoomAnalyzer {
    pub fn new(config: ZoomAnalysisConfig, source_width: f64, source_height: f64) -> Self {
        Self {
            config,
            source_width,
            source_height,
        }
    }

    /// Analyze an interaction stream and produce zoom candidates.
    pub fn analyze(&self, stream: &InteractionStream) -> Vec<ZoomCandidate> {
        let mut candidates = Vec::new();

        // Phase 1: Identify focus regions from clicks
        candidates.extend(self.analyze_clicks(&stream.click_events));

        // Phase 2: Identify cursor focus regions (slow movement areas)
        candidates.extend(self.analyze_cursor_focus(&stream.cursor_points));

        // Phase 3: Merge nearby candidates
        candidates = self.merge_nearby(candidates);

        // Phase 4: Filter by confidence
        candidates.retain(|c| c.confidence >= self.config.min_confidence);

        // Phase 5: Sort by time
        candidates.sort_by_key(|c| c.time_range.start_ms);

        candidates
    }

    /// Convert candidates to editable zoom segments.
    pub fn candidates_to_segments(&self, candidates: &[ZoomCandidate]) -> Vec<ZoomSegment> {
        candidates
            .iter()
            .map(|c| ZoomSegment {
                id: Uuid::new_v4(),
                time_range: c.time_range,
                target_rect: c.focus_rect,
                scale: c.suggested_scale,
                ease_in: EasingCurve::EaseInOut,
                ease_out: EasingCurve::EaseOut,
                transition_in_ms: 400,
                transition_out_ms: 400,
                auto_generated: true,
                confidence: Some(c.confidence),
            })
            .collect()
    }

    fn analyze_clicks(&self, clicks: &[ClickEvent]) -> Vec<ZoomCandidate> {
        if clicks.is_empty() {
            return Vec::new();
        }

        let mut candidates = Vec::new();
        let mut cluster_start = 0;

        for i in 1..=clicks.len() {
            let should_flush = if i == clicks.len() {
                true
            } else {
                clicks[i].timestamp_ms - clicks[i - 1].timestamp_ms > self.config.merge_threshold_ms
            };

            if should_flush && cluster_start < i {
                let cluster = &clicks[cluster_start..i];
                if let Some(candidate) = self.click_cluster_to_candidate(cluster) {
                    candidates.push(candidate);
                }
                cluster_start = i;
            }
        }

        candidates
    }

    fn click_cluster_to_candidate(&self, clicks: &[ClickEvent]) -> Option<ZoomCandidate> {
        if clicks.is_empty() {
            return None;
        }

        let min_x = clicks.iter().map(|c| c.x).fold(f64::INFINITY, f64::min);
        let max_x = clicks.iter().map(|c| c.x).fold(f64::NEG_INFINITY, f64::max);
        let min_y = clicks.iter().map(|c| c.y).fold(f64::INFINITY, f64::min);
        let max_y = clicks.iter().map(|c| c.y).fold(f64::NEG_INFINITY, f64::max);

        let start_ms = clicks.first()?.timestamp_ms;
        let end_ms = clicks.last()?.timestamp_ms;
        let duration = end_ms.saturating_sub(start_ms).max(self.config.min_segment_duration_ms);

        let padding = self.config.focus_padding;
        let rect = NormalizedRect {
            x: (min_x / self.source_width - padding).max(0.0),
            y: (min_y / self.source_height - padding).max(0.0),
            width: ((max_x - min_x) / self.source_width + padding * 2.0).min(1.0),
            height: ((max_y - min_y) / self.source_height + padding * 2.0).min(1.0),
        };

        let suggested_scale = (1.0 / rect.width.max(rect.height)).min(self.config.max_scale);
        let confidence = (clicks.len() as f64 / 5.0).min(1.0) * 0.8;

        Some(ZoomCandidate {
            id: Uuid::new_v4(),
            time_range: TimeRange::new(
                start_ms.saturating_sub(500),
                start_ms + duration + 500,
            ),
            focus_rect: rect,
            suggested_scale,
            confidence,
            reason: ZoomReason::ClickActivity,
        })
    }

    fn analyze_cursor_focus(&self, points: &[CursorPoint]) -> Vec<ZoomCandidate> {
        if points.len() < 10 {
            return Vec::new();
        }

        let mut candidates = Vec::new();
        let window_size = 30; // Analyze in windows of ~30 samples

        let mut i = 0;
        while i + window_size <= points.len() {
            let window = &points[i..i + window_size];

            let avg_x: f64 = window.iter().map(|p| p.x).sum::<f64>() / window.len() as f64;
            let avg_y: f64 = window.iter().map(|p| p.y).sum::<f64>() / window.len() as f64;

            // Calculate variance (how spread out the cursor was)
            let variance_x: f64 = window.iter().map(|p| (p.x - avg_x).powi(2)).sum::<f64>()
                / window.len() as f64;
            let variance_y: f64 = window.iter().map(|p| (p.y - avg_y).powi(2)).sum::<f64>()
                / window.len() as f64;

            let spread = (variance_x + variance_y).sqrt();

            // Low spread = cursor is focused in one area
            if spread < 100.0 {
                let start_ms = window.first().map(|p| p.timestamp_ms).unwrap_or(0);
                let end_ms = window.last().map(|p| p.timestamp_ms).unwrap_or(0);

                if end_ms - start_ms >= self.config.min_segment_duration_ms {
                    let nx = (avg_x / self.source_width).clamp(0.0, 1.0);
                    let ny = (avg_y / self.source_height).clamp(0.0, 1.0);
                    let padding = self.config.focus_padding;

                    candidates.push(ZoomCandidate {
                        id: Uuid::new_v4(),
                        time_range: TimeRange::new(start_ms, end_ms),
                        focus_rect: NormalizedRect {
                            x: (nx - padding * 2.0).max(0.0),
                            y: (ny - padding * 2.0).max(0.0),
                            width: (padding * 4.0).min(1.0),
                            height: (padding * 4.0).min(1.0),
                        },
                        suggested_scale: 2.0,
                        confidence: (1.0 - spread / 100.0).max(0.0) * 0.6,
                        reason: ZoomReason::CursorFocus,
                    });
                }
            }

            i += window_size / 2; // 50% overlap
        }

        candidates
    }

    fn merge_nearby(&self, mut candidates: Vec<ZoomCandidate>) -> Vec<ZoomCandidate> {
        if candidates.len() <= 1 {
            return candidates;
        }

        candidates.sort_by_key(|c| c.time_range.start_ms);
        let mut merged = vec![candidates.remove(0)];

        for candidate in candidates {
            let last = merged.last_mut().unwrap();

            // If close in time, merge them
            if candidate.time_range.start_ms
                <= last.time_range.end_ms + self.config.merge_threshold_ms
            {
                last.time_range = TimeRange::new(
                    last.time_range.start_ms,
                    candidate.time_range.end_ms.max(last.time_range.end_ms),
                );
                last.confidence = (last.confidence + candidate.confidence) / 2.0;
                // Keep the larger focus rect
                if candidate.focus_rect.width * candidate.focus_rect.height
                    > last.focus_rect.width * last.focus_rect.height
                {
                    last.focus_rect = candidate.focus_rect;
                }
            } else {
                merged.push(candidate);
            }
        }

        merged
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use project_model::interaction::*;

    #[test]
    fn test_empty_stream() {
        let analyzer = ZoomAnalyzer::new(ZoomAnalysisConfig::default(), 1920.0, 1080.0);
        let stream = InteractionStream::empty();
        let candidates = analyzer.analyze(&stream);
        assert!(candidates.is_empty());
    }

    #[test]
    fn test_click_analysis() {
        let analyzer = ZoomAnalyzer::new(ZoomAnalysisConfig::default(), 1920.0, 1080.0);

        let stream = InteractionStream {
            cursor_points: Vec::new(),
            click_events: vec![
                ClickEvent {
                    timestamp_ms: 1000,
                    x: 500.0,
                    y: 300.0,
                    button: MouseButton::Left,
                    click_type: ClickType::Single,
                },
                ClickEvent {
                    timestamp_ms: 1200,
                    x: 520.0,
                    y: 310.0,
                    button: MouseButton::Left,
                    click_type: ClickType::Single,
                },
                ClickEvent {
                    timestamp_ms: 1500,
                    x: 510.0,
                    y: 305.0,
                    button: MouseButton::Left,
                    click_type: ClickType::Single,
                },
            ],
            keyboard_events: Vec::new(),
            scroll_events: Vec::new(),
            typing_segments: Vec::new(),
            active_app_changes: Vec::new(),
        };

        let candidates = analyzer.analyze(&stream);
        assert!(!candidates.is_empty());
        assert!(candidates[0].confidence > 0.0);
    }
}
