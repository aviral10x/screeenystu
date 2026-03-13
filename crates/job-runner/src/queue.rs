use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum JobError {
    #[error("Job not found: {0}")]
    NotFound(Uuid),
    #[error("Job already running: {0}")]
    AlreadyRunning(Uuid),
    #[error("Job execution failed: {0}")]
    ExecutionFailed(String),
    #[error("Queue is full")]
    QueueFull,
}

/// Priority level for jobs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum JobPriority {
    Low = 0,
    Normal = 1,
    High = 2,
    Critical = 3,
}

/// Status of a job.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum JobStatus {
    Queued,
    Running,
    Completed,
    Failed { error: String },
    Cancelled,
}

/// Metadata for a queued job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobEntry {
    pub id: Uuid,
    pub job_type: String,
    pub priority: JobPriority,
    pub status: JobStatus,
    pub progress: f64,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub payload: String,
}

/// A simple in-memory job queue.
/// In production, this would be backed by SQLite or similar.
pub struct JobQueue {
    jobs: VecDeque<JobEntry>,
    max_size: usize,
    max_concurrent: usize,
}

impl JobQueue {
    pub fn new(max_size: usize, max_concurrent: usize) -> Self {
        Self {
            jobs: VecDeque::new(),
            max_size,
            max_concurrent,
        }
    }

    /// Enqueue a new job.
    pub fn enqueue(
        &mut self,
        job_type: impl Into<String>,
        priority: JobPriority,
        payload: impl Into<String>,
    ) -> Result<Uuid, JobError> {
        if self.jobs.len() >= self.max_size {
            return Err(JobError::QueueFull);
        }

        let id = Uuid::new_v4();
        let entry = JobEntry {
            id,
            job_type: job_type.into(),
            priority,
            status: JobStatus::Queued,
            progress: 0.0,
            created_at: Utc::now(),
            started_at: None,
            completed_at: None,
            payload: payload.into(),
        };

        // Insert based on priority (higher priority first)
        let pos = self
            .jobs
            .iter()
            .position(|j| j.priority < priority && j.status == JobStatus::Queued)
            .unwrap_or(self.jobs.len());

        self.jobs.insert(pos, entry);
        Ok(id)
    }

    /// Get the next job ready to run.
    pub fn next_job(&mut self) -> Option<&mut JobEntry> {
        let running_count = self
            .jobs
            .iter()
            .filter(|j| j.status == JobStatus::Running)
            .count();

        if running_count >= self.max_concurrent {
            return None;
        }

        self.jobs
            .iter_mut()
            .find(|j| j.status == JobStatus::Queued)
    }

    /// Mark a job as started.
    pub fn mark_started(&mut self, job_id: Uuid) -> Result<(), JobError> {
        let job = self
            .jobs
            .iter_mut()
            .find(|j| j.id == job_id)
            .ok_or(JobError::NotFound(job_id))?;

        job.status = JobStatus::Running;
        job.started_at = Some(Utc::now());
        Ok(())
    }

    /// Update job progress.
    pub fn update_progress(&mut self, job_id: Uuid, progress: f64) -> Result<(), JobError> {
        let job = self
            .jobs
            .iter_mut()
            .find(|j| j.id == job_id)
            .ok_or(JobError::NotFound(job_id))?;

        job.progress = progress.clamp(0.0, 1.0);
        Ok(())
    }

    /// Mark a job as completed.
    pub fn mark_completed(&mut self, job_id: Uuid) -> Result<(), JobError> {
        let job = self
            .jobs
            .iter_mut()
            .find(|j| j.id == job_id)
            .ok_or(JobError::NotFound(job_id))?;

        job.status = JobStatus::Completed;
        job.progress = 1.0;
        job.completed_at = Some(Utc::now());
        Ok(())
    }

    /// Mark a job as failed.
    pub fn mark_failed(&mut self, job_id: Uuid, error: impl Into<String>) -> Result<(), JobError> {
        let job = self
            .jobs
            .iter_mut()
            .find(|j| j.id == job_id)
            .ok_or(JobError::NotFound(job_id))?;

        job.status = JobStatus::Failed {
            error: error.into(),
        };
        job.completed_at = Some(Utc::now());
        Ok(())
    }

    /// Cancel a job.
    pub fn cancel(&mut self, job_id: Uuid) -> Result<(), JobError> {
        let job = self
            .jobs
            .iter_mut()
            .find(|j| j.id == job_id)
            .ok_or(JobError::NotFound(job_id))?;

        job.status = JobStatus::Cancelled;
        job.completed_at = Some(Utc::now());
        Ok(())
    }

    /// Get a job by ID.
    pub fn get(&self, job_id: Uuid) -> Option<&JobEntry> {
        self.jobs.iter().find(|j| j.id == job_id)
    }

    /// List all jobs.
    pub fn list(&self) -> &VecDeque<JobEntry> {
        &self.jobs
    }

    /// Remove completed/failed/cancelled jobs older than the given age.
    pub fn cleanup(&mut self, max_age: chrono::Duration) {
        let cutoff = Utc::now() - max_age;
        self.jobs.retain(|j| {
            matches!(j.status, JobStatus::Queued | JobStatus::Running)
                || j.completed_at.map_or(true, |t| t > cutoff)
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_job_queue_basic() {
        let mut queue = JobQueue::new(100, 2);

        let id = queue.enqueue("export", JobPriority::Normal, "{}").unwrap();
        assert!(queue.get(id).is_some());
        assert_eq!(queue.get(id).unwrap().status, JobStatus::Queued);

        queue.mark_started(id).unwrap();
        assert!(matches!(queue.get(id).unwrap().status, JobStatus::Running));

        queue.update_progress(id, 0.5).unwrap();
        assert!((queue.get(id).unwrap().progress - 0.5).abs() < f64::EPSILON);

        queue.mark_completed(id).unwrap();
        assert_eq!(queue.get(id).unwrap().status, JobStatus::Completed);
    }

    #[test]
    fn test_priority_ordering() {
        let mut queue = JobQueue::new(100, 1);

        let low = queue.enqueue("low", JobPriority::Low, "{}").unwrap();
        let high = queue.enqueue("high", JobPriority::High, "{}").unwrap();

        // High priority should come first
        let next = queue.next_job().unwrap();
        assert_eq!(next.id, high);
    }

    #[test]
    fn test_max_concurrent() {
        let mut queue = JobQueue::new(100, 1);

        let id1 = queue.enqueue("job1", JobPriority::Normal, "{}").unwrap();
        let _id2 = queue.enqueue("job2", JobPriority::Normal, "{}").unwrap();

        queue.mark_started(id1).unwrap();

        // Should not return next job since max concurrent (1) is reached
        assert!(queue.next_job().is_none());
    }
}
