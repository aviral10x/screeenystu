use project_model::export::{ExportPreset, Resolution, ResolutionPreset, QualityLevel};
use project_model::timeline::ZoomSegment;
use project_model::project::TimeRange;

/// Builds FFmpeg filter graph strings from project data.
pub struct FilterGraphBuilder {
    source_width: u32,
    source_height: u32,
    output_width: u32,
    output_height: u32,
    output_fps: u32,
}

impl FilterGraphBuilder {
    pub fn new(
        source_width: u32,
        source_height: u32,
        preset: &ExportPreset,
    ) -> Self {
        let (ow, oh) = match &preset.resolution {
            Resolution::Preset(p) => p.dimensions(),
            Resolution::Custom { width, height } => (*width, *height),
        };

        Self {
            source_width,
            source_height,
            output_width: ow,
            output_height: oh,
            output_fps: preset.fps,
        }
    }

    /// Build the video filter graph string for FFmpeg.
    /// Handles: zoom keyframes, speed changes, scaling.
    pub fn build_video_filter(
        &self,
        zoom_segments: &[ZoomSegment],
        trim: Option<&TimeRange>,
    ) -> String {
        let mut filters = Vec::new();

        // 1. Trim if needed
        if let Some(trim) = trim {
            let start_sec = trim.start_ms as f64 / 1000.0;
            let end_sec = trim.end_ms as f64 / 1000.0;
            filters.push(format!(
                "trim=start={}:end={},setpts=PTS-STARTPTS",
                start_sec, end_sec
            ));
        }

        // 2. Zoom segments → zoompan filter
        if !zoom_segments.is_empty() {
            let zoompan = self.build_zoompan_filter(zoom_segments);
            filters.push(zoompan);
        }

        // 3. Scale to output resolution
        filters.push(format!(
            "scale={}:{}:flags=lanczos",
            self.output_width, self.output_height
        ));

        // 4. Set output FPS
        filters.push(format!("fps={}", self.output_fps));

        filters.join(",")
    }

    /// Build audio filter string (trim, speed adjustments).
    pub fn build_audio_filter(
        &self,
        trim: Option<&TimeRange>,
    ) -> String {
        let mut filters = Vec::new();

        if let Some(trim) = trim {
            let start_sec = trim.start_ms as f64 / 1000.0;
            let end_sec = trim.end_ms as f64 / 1000.0;
            filters.push(format!(
                "atrim=start={}:end={},asetpts=PTS-STARTPTS",
                start_sec, end_sec
            ));
        }

        if filters.is_empty() {
            "anull".to_string()
        } else {
            filters.join(",")
        }
    }

    fn build_zoompan_filter(&self, segments: &[ZoomSegment]) -> String {
        // Use the crop+scale approach for zoom:
        // For each frame, calculate the crop rectangle based on active zoom segment.
        // FFmpeg `zoompan` filter handles this with expressions.

        if segments.is_empty() {
            return format!("null");
        }

        // Build zoompan expression from segments
        // This creates smooth zoom in/out using the zoompan filter
        let fps = self.output_fps as f64;
        let sw = self.source_width as f64;
        let sh = self.source_height as f64;

        let mut zoom_expr_parts = Vec::new();
        let mut x_expr_parts = Vec::new();
        let mut y_expr_parts = Vec::new();

        for seg in segments {
            let start_frame = (seg.time_range.start_ms as f64 / 1000.0 * fps) as u64;
            let end_frame = (seg.time_range.end_ms as f64 / 1000.0 * fps) as u64;
            let trans_in_frames = (seg.transition_in_ms as f64 / 1000.0 * fps) as u64;
            let trans_out_frames = (seg.transition_out_ms as f64 / 1000.0 * fps) as u64;

            let zoom_start = start_frame;
            let zoom_full = start_frame + trans_in_frames;
            let zoom_out_start = end_frame.saturating_sub(trans_out_frames);
            let zoom_end = end_frame;

            let scale = seg.scale;

            // Zoom expression: ramp up from 1 to scale, hold, ramp down
            zoom_expr_parts.push(format!(
                "if(between(on,{zoom_start},{zoom_full}),\
                1+({scale}-1)*(on-{zoom_start})/{trans_in},\
                if(between(on,{zoom_full},{zoom_out_start}),\
                {scale},\
                if(between(on,{zoom_out_start},{zoom_end}),\
                {scale}-({scale}-1)*(on-{zoom_out_start})/{trans_out},\
                0)))",
                zoom_start = zoom_start,
                zoom_full = zoom_full,
                zoom_out_start = zoom_out_start,
                zoom_end = zoom_end,
                scale = scale,
                trans_in = trans_in_frames.max(1),
                trans_out = trans_out_frames.max(1),
            ));

            // X position expression
            let cx = seg.target_rect.x + seg.target_rect.width / 2.0;
            let target_x = (cx * sw) as u64;
            x_expr_parts.push(format!(
                "if(between(on,{},{}),{},0)",
                zoom_start, zoom_end, target_x
            ));

            // Y position expression
            let cy = seg.target_rect.y + seg.target_rect.height / 2.0;
            let target_y = (cy * sh) as u64;
            y_expr_parts.push(format!(
                "if(between(on,{},{}),{},0)",
                zoom_start, zoom_end, target_y
            ));
        }

        let zoom_expr = if zoom_expr_parts.is_empty() {
            "1".to_string()
        } else {
            zoom_expr_parts.iter()
                .map(|p| p.as_str())
                .collect::<Vec<_>>()
                .join("+")
        };

        let x_expr = if x_expr_parts.is_empty() {
            "iw/2".to_string()
        } else {
            x_expr_parts.join("+")
        };

        let y_expr = if y_expr_parts.is_empty() {
            "ih/2".to_string()
        } else {
            y_expr_parts.join("+")
        };

        format!(
            "zoompan=z='{zoom}':x='{x}-(iw/zoom/2)':y='{y}-(ih/zoom/2)':d=1:s={w}x{h}:fps={fps}",
            zoom = zoom_expr,
            x = x_expr,
            y = y_expr,
            w = self.source_width,
            h = self.source_height,
            fps = self.output_fps,
        )
    }

    /// Get FFmpeg output arguments for the given preset.
    pub fn output_args(preset: &ExportPreset) -> Vec<String> {
        let mut args = Vec::new();

        match preset.format {
            project_model::export::ExportFormat::Mp4 => {
                args.extend_from_slice(&[
                    "-c:v".into(), "libx264".into(),
                    "-preset".into(), "medium".into(),
                    "-pix_fmt".into(), "yuv420p".into(),
                    "-c:a".into(), "aac".into(),
                    "-b:a".into(), format!("{}k", preset.compression.audio_bitrate_kbps.unwrap_or(192)),
                ]);
                if let Some(crf) = preset.compression.crf {
                    args.extend_from_slice(&["-crf".into(), crf.to_string()]);
                } else if let Some(br) = preset.compression.video_bitrate_kbps {
                    args.extend_from_slice(&["-b:v".into(), format!("{}k", br)]);
                }
            }
            project_model::export::ExportFormat::WebM => {
                args.extend_from_slice(&[
                    "-c:v".into(), "libvpx-vp9".into(),
                    "-c:a".into(), "libopus".into(),
                    "-b:a".into(), format!("{}k", preset.compression.audio_bitrate_kbps.unwrap_or(128)),
                ]);
                if let Some(crf) = preset.compression.crf {
                    args.extend_from_slice(&["-crf".into(), crf.to_string(), "-b:v".into(), "0".into()]);
                }
            }
            project_model::export::ExportFormat::Gif => {
                let colors = preset.compression.max_colors.unwrap_or(256);
                args.extend_from_slice(&[
                    "-vf".into(),
                    format!("split[s0][s1];[s0]palettegen=max_colors={}[p];[s1][p]paletteuse=dither=bayer", colors),
                    "-loop".into(), "0".into(),
                ]);
            }
        }

        args.push("-movflags".into());
        args.push("+faststart".into());
        args.push("-y".into());

        args
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use project_model::timeline::{EasingCurve, NormalizedRect};
    use uuid::Uuid;

    #[test]
    fn test_basic_filter_no_zoom() {
        let preset = ExportPreset::web();
        let builder = FilterGraphBuilder::new(1920, 1080, &preset);
        let filter = builder.build_video_filter(&[], None);
        assert!(filter.contains("scale=1920:1080"));
        assert!(filter.contains("fps=30"));
    }

    #[test]
    fn test_filter_with_trim() {
        let preset = ExportPreset::web();
        let builder = FilterGraphBuilder::new(1920, 1080, &preset);
        let trim = TimeRange::new(1000, 5000);
        let filter = builder.build_video_filter(&[], Some(&trim));
        assert!(filter.contains("trim=start=1"));
        assert!(filter.contains("setpts=PTS-STARTPTS"));
    }

    #[test]
    fn test_filter_with_zoom() {
        let preset = ExportPreset::web();
        let builder = FilterGraphBuilder::new(1920, 1080, &preset);
        let segments = vec![ZoomSegment {
            id: Uuid::new_v4(),
            time_range: TimeRange::new(1000, 5000),
            target_rect: NormalizedRect { x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
            scale: 2.0,
            ease_in: EasingCurve::EaseInOut,
            ease_out: EasingCurve::EaseOut,
            transition_in_ms: 400,
            transition_out_ms: 400,
            auto_generated: true,
            confidence: Some(0.8),
        }];
        let filter = builder.build_video_filter(&segments, None);
        assert!(filter.contains("zoompan"));
    }
}
