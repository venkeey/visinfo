/**
 * Processing Orchestrator
 * Coordinates the entire poll processing pipeline
 */

import { Job } from 'bull';
import { PollProcessingJobData, JobProgress } from '../queue/pollQueue';
import { pollRepository } from '../repositories/pollRepository';
import { responseRepository } from '../repositories/responseRepository';
import { PollStatus } from '../models/types';
import { embeddingService } from '../ai/services';

export class ProcessingOrchestrator {
  /**
   * Process a poll through the complete pipeline
   */
  async processPoll(job: Job<PollProcessingJobData>): Promise<void> {
    const { pollId } = job.data;
    const startTime = Date.now();

    try {
      // Stage 1: Fetch and validate poll
      await this.updateProgress(job, 'Fetching poll data', 5);
      const poll = await pollRepository.findById(pollId);

      if (!poll) {
        throw new Error(`Poll ${pollId} not found`);
      }

      // Update poll status to PROCESSING
      await pollRepository.updateStatus(pollId, PollStatus.PROCESSING);
      await pollRepository.updateProcessingTimestamps(pollId, {
        processingStartedAt: new Date(),
      });

      // Stage 2: Fetch responses
      await this.updateProgress(job, 'Fetching responses', 10);
      const responses = await responseRepository.findByPollId(pollId);

      if (responses.length === 0) {
        throw new Error(`No responses found for poll ${pollId}`);
      }

      console.log(`Processing ${responses.length} responses for poll ${pollId}`);

      // Stage 3: Preprocess responses
      await this.updateProgress(job, 'Preprocessing responses', 15);
      const preprocessedTexts = this.preprocessResponses(responses.map((r) => r.text));

      // Stage 4: Generate embeddings
      await this.updateProgress(job, 'Generating embeddings', 20);
      const embeddings = await embeddingService.generateBatch(preprocessedTexts, {
        batchSize: 100,
        parallel: true,
      });

      // Stage 5: Save embeddings
      await this.updateProgress(job, 'Saving embeddings', 50);
      const embeddingUpdates = responses.map((response, index) => ({
        id: response.id,
        embedding: embeddings[index],
      }));

      await responseRepository.batchUpdateEmbeddings(embeddingUpdates);

      // Stage 6: Cluster responses with HAC
      await this.updateProgress(job, 'Clustering responses', 60);
      // TODO: Implement HAC clustering service
      // Import: import { cluster } from './clustering';
      // const clusteringResult = await cluster(embeddings, {
      //   metric: 'cosine',      // Critical for text embeddings!
      //   linkage: 'average',    // Best for semantic data
      //   maxDepth: 7            // 5-7 level deep hierarchy
      // });

      // Stage 7: Build hierarchy from dendrogram (includes AI labeling)
      await this.updateProgress(job, 'Building hierarchy and labeling', 75);
      // TODO: Implement hierarchy service
      // Import: import { buildHierarchy } from './hierarchyService';
      // const tree = await buildHierarchy(
      //   clusteringResult,  // ← Contains dendrogram
      //   responses,
      //   { maxDepth: 7, minClusterSize: 3 }
      // );
      // Note: AI labeling happens INSIDE buildHierarchy, not as separate step

      // Stage 8: Save results
      await this.updateProgress(job, 'Saving results', 90);
      // TODO: Save classification results to database
      // Import: import { classificationResultRepository } from '../repositories/classificationResultRepository';
      // await classificationResultRepository.save({
      //   pollId,
      //   tree,
      //   metadata: {
      //     totalResponses: responses.length,
      //     numClusters: clusteringResult.numClusters,
      //     processingTime: Date.now() - startTime,
      //     algorithm: 'HAC'
      //   }
      // });

      // Mark as completed
      await pollRepository.updateStatus(pollId, PollStatus.PROCESSED);
      await pollRepository.updateProcessingTimestamps(pollId, {
        processingCompletedAt: new Date(),
      });

      await this.updateProgress(job, 'Processing completed', 100);

      const processingTime = Date.now() - startTime;
      console.log(`✓ Poll ${pollId} processed successfully in ${processingTime}ms`);
    } catch (error: any) {
      console.error(`✗ Poll ${pollId} processing failed:`, error);

      // Mark as failed
      await pollRepository.updateStatus(pollId, PollStatus.FAILED);

      throw error;
    }
  }

  /**
   * Update job progress
   */
  private async updateProgress(
    job: Job<PollProcessingJobData>,
    stage: string,
    percentage: number
  ): Promise<void> {
    const progress: JobProgress = {
      stage,
      percentage,
    };

    await job.progress(progress);
  }

  /**
   * Preprocess responses (basic cleaning)
   */
  private preprocessResponses(texts: string[]): string[] {
    return texts.map((text) => {
      // Trim whitespace
      let cleaned = text.trim();

      // Remove extra whitespace
      cleaned = cleaned.replace(/\s+/g, ' ');

      // Remove special characters (optional)
      // cleaned = cleaned.replace(/[^\w\s.,!?-]/g, '');

      return cleaned;
    });
  }

  /**
   * Calculate estimated cost
   */
  private estimateCost(responseCount: number): number {
    // Embedding cost: $0.00002 per response
    const embeddingCost = (responseCount / 1000) * 0.02;

    // Labeling cost: Assume ~8 clusters, $0.0045 per cluster
    const labelingCost = 8 * 0.0045;

    return embeddingCost + labelingCost;
  }
}

// Export singleton instance
export const processingOrchestrator = new ProcessingOrchestrator();
