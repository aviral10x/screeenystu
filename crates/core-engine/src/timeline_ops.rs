use project_model::project::TimeRange;
use project_model::timeline::{SpeedSegment, ZoomSegment};
use project_model::Project;
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum TimelineError {
    #[error("Invalid time range: start ({start}) >= end ({end})")]
    InvalidRange { start: u64, end: u64 },
    #[error("Segment not found: {0}")]
    SegmentNotFound(Uuid),
    #[error("Operation would create invalid state: {0}")]
    InvalidOperation(String),
}

/// Get the effective duration of the project in ms, respecting trim.
pub fn effective_duration(project: &Project) -> Option<u64> {
    // Find the longest source media duration
    let max_duration = project
        .sources
        .iter()
        .filter_map(|s| s.duration_ms)
        .max()?;

    if let Some(trim) = &project.timeline.trim {
        Some(trim.duration_ms().min(max_duration))
    } else {
        Some(max_duration)
    }
}

/// Set the trim range, validating the input.
pub fn set_trim(
    project: &mut Project,
    start_ms: u64,
    end_ms: u64,
) -> Result<Option<TimeRange>, TimelineError> {
    if start_ms >= end_ms {
        return Err(TimelineError::InvalidRange {
            start: start_ms,
            end: end_ms,
        });
    }

    let old_trim = project.timeline.trim;
    project.timeline.trim = Some(TimeRange::new(start_ms, end_ms));
    Ok(old_trim)
}

/// Clear the trim range.
pub fn clear_trim(project: &mut Project) -> Option<TimeRange> {
    project.timeline.trim.take()
}

/// Add a speed segment, checking for overlaps.
pub fn add_speed_segment(
    project: &mut Project,
    time_range: TimeRange,
    speed: f64,
    preserve_pitch: bool,
) -> Result<Uuid, TimelineError> {
    if time_range.start_ms >= time_range.end_ms {
        return Err(TimelineError::InvalidRange {
            start: time_range.start_ms,
            end: time_range.end_ms,
        });
    }

    if speed <= 0.0 || speed > 16.0 {
        return Err(TimelineError::InvalidOperation(format!(
            "Speed must be between 0.0 and 16.0, got {speed}"
        )));
    }

    // Check for overlapping speed segments
    for existing in &project.speed_segments {
        if existing.time_range.overlaps(&time_range) {
            return Err(TimelineError::InvalidOperation(format!(
                "Speed segment overlaps with existing segment {}",
                existing.id
            )));
        }
    }

    let id = Uuid::new_v4();
    project.speed_segments.push(SpeedSegment {
        id,
        time_range,
        speed,
        preserve_pitch,
        mute_audio: false,
        auto_detected: false,
    });

    Ok(id)
}

/// Remove a speed segment by ID.
pub fn remove_speed_segment(
    project: &mut Project,
    segment_id: Uuid,
) -> Result<SpeedSegment, TimelineError> {
    let idx = project
        .speed_segments
        .iter()
        .position(|s| s.id == segment_id)
        .ok_or(TimelineError::SegmentNotFound(segment_id))?;

    Ok(project.speed_segments.remove(idx))
}

/// Add a zoom segment.
pub fn add_zoom_segment(
    project: &mut Project,
    segment: ZoomSegment,
) -> Result<Uuid, TimelineError> {
    if segment.time_range.start_ms >= segment.time_range.end_ms {
        return Err(TimelineError::InvalidRange {
            start: segment.time_range.start_ms,
            end: segment.time_range.end_ms,
        });
    }

    let id = segment.id;
    project.zoom_segments.push(segment);
    Ok(id)
}

/// Remove a zoom segment by ID.
pub fn remove_zoom_segment(
    project: &mut Project,
    segment_id: Uuid,
) -> Result<ZoomSegment, TimelineError> {
    let idx = project
        .zoom_segments
        .iter()
        .position(|s| s.id == segment_id)
        .ok_or(TimelineError::SegmentNotFound(segment_id))?;

    Ok(project.zoom_segments.remove(idx))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_set_trim() {
        let mut project = Project::new("Test");
        set_trim(&mut project, 1000, 5000).unwrap();
        assert_eq!(project.timeline.trim.unwrap().start_ms, 1000);
        assert_eq!(project.timeline.trim.unwrap().end_ms, 5000);
    }

    #[test]
    fn test_invalid_trim() {
        let mut project = Project::new("Test");
        assert!(set_trim(&mut project, 5000, 1000).is_err());
    }

    #[test]
    fn test_speed_segment_overlap() {
        let mut project = Project::new("Test");
        add_speed_segment(&mut project, TimeRange::new(0, 5000), 2.0, true).unwrap();

        // Overlapping segment should fail
        let result = add_speed_segment(&mut project, TimeRange::new(3000, 8000), 1.5, true);
        assert!(result.is_err());

        // Non-overlapping should succeed
        add_speed_segment(&mut project, TimeRange::new(6000, 10000), 1.5, true).unwrap();
        assert_eq!(project.speed_segments.len(), 2);
    }
}
