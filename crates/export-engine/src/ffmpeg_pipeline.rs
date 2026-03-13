use crate::filter_graph::FilterGraphBuilder;
use crate::pipeline::{ExportError, ExportPipeline, ProgressCallback};
use project_model::export::{ExportPreset, RenderJob, RenderJobStatus};
use project_model::Project;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use uuid::Uuid;

/// FFmpeg-based export pipeline.
pub struct FFmpegPipeline {
    ffmpeg_path: PathBuf,
    jobs: Arc<Mutex<HashMap<Uuid, JobHandle>>>,
}

struct JobHandle {
    child: Option<Child>,
    status: RenderJobStatus,
    progress: f64,
}

impl FFmpegPipeline {
    pub fn new() -> Self {
        let ffmpeg_path = which_ffmpeg().unwrap_or_else(|| PathBuf::from("ffmpeg"));
        Self {
            ffmpeg_path,
            jobs: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl ExportPipeline for FFmpegPipeline {
    fn start_export(
        &self,
        project: &Project,
        preset: &ExportPreset,
        output_path: &str,
        on_progress: ProgressCallback,
    ) -> Result<RenderJob, ExportError> {
        if project.sources.is_empty() {
            return Err(ExportError::NoSources);
        }

        // Find screen recording source
        let screen_source = project
            .sources
            .iter()
            .find(|s| matches!(s.media_type, project_model::MediaType::ScreenRecording))
            .ok_or(ExportError::NoSources)?;

        let input_path = &screen_source.relative_path;

        // Build filter graphs
        let source_w = screen_source.width.unwrap_or(1920);
        let source_h = screen_source.height.unwrap_or(1080);
        let builder = FilterGraphBuilder::new(source_w, source_h, preset);

        let video_filter = builder.build_video_filter(
            &project.zoom_segments,
            project.timeline.trim.as_ref(),
        );
        let audio_filter = builder.build_audio_filter(project.timeline.trim.as_ref());

        // Build FFmpeg command
        let mut cmd = Command::new(&self.ffmpeg_path);
        cmd.arg("-i").arg(input_path);

        // Add mic audio if available
        let mic_source = project
            .sources
            .iter()
            .find(|s| matches!(s.media_type, project_model::MediaType::MicrophoneAudio));
        if let Some(mic) = mic_source {
            cmd.arg("-i").arg(&mic.relative_path);
        }

        cmd.arg("-filter_complex")
            .arg(format!("[0:v]{vf}[vout];[0:a]{af}[aout]",
                vf = video_filter,
                af = audio_filter,
            ))
            .arg("-map").arg("[vout]")
            .arg("-map").arg("[aout]");

        // Add output format args
        let output_args = FilterGraphBuilder::output_args(preset);
        for arg in &output_args {
            cmd.arg(arg);
        }

        // Progress reporting
        cmd.arg("-progress").arg("pipe:1");
        cmd.arg(output_path);

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let job_id = Uuid::new_v4();
        let duration_ms = project
            .sources
            .iter()
            .filter_map(|s| s.duration_ms)
            .max()
            .unwrap_or(0);

        let mut child = cmd.spawn().map_err(|e| ExportError::RenderFailed(e.to_string()))?;

        // Parse progress
        let jobs = self.jobs.clone();
        if let Some(stdout) = child.stdout.take() {
            let callback = on_progress;
            let jid = job_id;
            let jobs_ref = jobs.clone();

            thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines().flatten() {
                    if line.starts_with("out_time_us=") {
                        if let Ok(us) = line["out_time_us=".len()..].parse::<u64>() {
                            let progress_ms = us / 1000;
                            let pct = if duration_ms > 0 {
                                (progress_ms as f64 / duration_ms as f64).min(1.0)
                            } else {
                                0.0
                            };
                            callback(pct);
                            if let Ok(mut j) = jobs_ref.lock() {
                                if let Some(handle) = j.get_mut(&jid) {
                                    handle.progress = pct;
                                }
                            }
                        }
                    } else if line.starts_with("progress=end") {
                        callback(1.0);
                        if let Ok(mut j) = jobs_ref.lock() {
                            if let Some(handle) = j.get_mut(&jid) {
                                handle.status = RenderJobStatus::Completed;
                                handle.progress = 1.0;
                            }
                        }
                    }
                }
            });
        }

        // Store job handle
        {
            let mut j = jobs.lock().map_err(|e| ExportError::RenderFailed(e.to_string()))?;
            j.insert(job_id, JobHandle {
                child: Some(child),
                status: RenderJobStatus::InProgress,
                progress: 0.0,
            });
        }

        Ok(RenderJob {
            id: job_id,
            project_id: project.id,
            preset: preset.clone(),
            output_path: output_path.to_string(),
            status: RenderJobStatus::InProgress,
            progress: 0.0,
            error: None,
        })
    }

    fn cancel_export(&self, job_id: Uuid) -> Result<(), ExportError> {
        let mut jobs = self.jobs.lock().map_err(|e| ExportError::RenderFailed(e.to_string()))?;
        if let Some(handle) = jobs.get_mut(&job_id) {
            if let Some(ref mut child) = handle.child {
                let _ = child.kill();
            }
            handle.status = RenderJobStatus::Cancelled;
            Ok(())
        } else {
            Err(ExportError::RenderFailed("Job not found".into()))
        }
    }

    fn job_status(&self, job_id: Uuid) -> Option<RenderJobStatus> {
        self.jobs.lock().ok()?.get(&job_id).map(|h| h.status.clone())
    }
}

fn which_ffmpeg() -> Option<PathBuf> {
    let output = Command::new("which").arg("ffmpeg").output().ok()?;
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            return Some(PathBuf::from(path));
        }
    }
    None
}
