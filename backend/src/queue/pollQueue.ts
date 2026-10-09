/**
 * Poll Processing Queue
 * Manages background jobs for poll processing
 */

import Queue, { Job } from 'bull';
import { defaultQueueOptions } from './config';

export interface PollProcessingJobData {
  pollId: string;
  priority?: number;
}

export interface JobProgress {
  stage: string;
  percentage: number;
  message?: string;
}

// Create poll processing queue
export const pollQueue = new Queue<PollProcessingJobData>('poll-processing', defaultQueueOptions);

// Queue event handlers
pollQueue.on('error', (error) => {
  console.error('Poll queue error:', error);
});

pollQueue.on('waiting', (jobId) => {
  console.log(`Job ${jobId} is waiting`);
});

pollQueue.on('active', (job) => {
  console.log(`Job ${job.id} started processing poll ${job.data.pollId}`);
});

pollQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed for poll ${job.data.pollId}`);
});

pollQueue.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed for poll ${job?.data.pollId}:`, err);
});

pollQueue.on('progress', (job, progress: JobProgress) => {
  console.log(`Job ${job.id} progress: ${progress.stage} (${progress.percentage}%)`);
});

/**
 * Add a poll processing job to the queue
 */
export async function addPollProcessingJob(
  pollId: string,
  options: { delay?: number; priority?: number } = {}
): Promise<Job<PollProcessingJobData>> {
  const job = await pollQueue.add(
    { pollId, priority: options.priority },
    {
      delay: options.delay,
      priority: options.priority || 0,
      jobId: `poll-${pollId}`, // Prevents duplicate jobs
    }
  );

  console.log(`Added poll processing job ${job.id} for poll ${pollId}`);
  return job;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<{
  state: string;
  progress: JobProgress | number;
  data: PollProcessingJobData;
} | null> {
  const job = await pollQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress();

  return {
    state,
    progress,
    data: job.data,
  };
}

/**
 * Get all jobs for a poll
 */
export async function getPollJobs(pollId: string): Promise<Job<PollProcessingJobData>[]> {
  const jobs = await pollQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
  return jobs.filter((job) => job.data.pollId === pollId);
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await pollQueue.getJob(jobId);

  if (!job) {
    return false;
  }

  await job.remove();
  console.log(`Cancelled job ${jobId}`);
  return true;
}

/**
 * Clean old jobs
 */
export async function cleanQueue(): Promise<void> {
  await pollQueue.clean(7 * 24 * 60 * 60 * 1000); // Clean jobs older than 7 days
  console.log('Cleaned old jobs from queue');
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    pollQueue.getWaitingCount(),
    pollQueue.getActiveCount(),
    pollQueue.getCompletedCount(),
    pollQueue.getFailedCount(),
    pollQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Pause queue processing
 */
export async function pauseQueue(): Promise<void> {
  await pollQueue.pause();
  console.log('Queue paused');
}

/**
 * Resume queue processing
 */
export async function resumeQueue(): Promise<void> {
  await pollQueue.resume();
  console.log('Queue resumed');
}

/**
 * Close queue
 */
export async function closeQueue(): Promise<void> {
  await pollQueue.close();
  console.log('Queue closed');
}
