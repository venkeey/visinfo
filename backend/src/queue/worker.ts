/**
 * Queue Worker
 * Processes jobs from the poll processing queue
 */

import { Job } from 'bull';
import { pollQueue, PollProcessingJobData } from './pollQueue';
import { processingOrchestrator } from '../services/processingOrchestrator';

/**
 * Start processing jobs from the queue
 */
export function startWorker(): void {
  console.log('Starting poll processing worker...');

  // Process jobs with concurrency of 2
  pollQueue.process(2, async (job: Job<PollProcessingJobData>) => {
    console.log(`Worker processing job ${job.id} for poll ${job.data.pollId}`);

    try {
      await processingOrchestrator.processPoll(job);
      return { success: true, pollId: job.data.pollId };
    } catch (error: any) {
      console.error(`Worker failed to process job ${job.id}:`, error);
      throw error; // Bull will handle retry logic
    }
  });

  console.log('✓ Worker started and listening for jobs');
}

/**
 * Stop the worker
 */
export async function stopWorker(): Promise<void> {
  await pollQueue.close();
  console.log('Worker stopped');
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down worker gracefully...');
  await stopWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down worker gracefully...');
  await stopWorker();
  process.exit(0);
});
