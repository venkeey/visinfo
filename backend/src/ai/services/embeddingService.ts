/**
 * Embedding Service
 * High-level service for generating text embeddings
 */

import { EmbeddingVector, BatchEmbeddingOptions } from '../types';
import { getDefaultProvider } from '../providers';
import { getAIConfig } from '../config/aiConfig';

export class EmbeddingService {
  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingVector> {
    const provider = getDefaultProvider();
    return provider.generateEmbedding(text);
  }

  /**
   * Generate embeddings for multiple texts with batching
   */
  async generateBatch(
    texts: string[],
    options: BatchEmbeddingOptions = {}
  ): Promise<EmbeddingVector[]> {
    const config = getAIConfig();
    const provider = getDefaultProvider();

    const {
      batchSize = config.options.batchSize,
      parallel = config.options.enableParallel,
      retryOnError = true,
      maxRetries = config.options.maxRetries,
    } = options;

    // Validate input
    if (texts.length === 0) {
      return [];
    }

    // If texts fit in one batch, process directly
    if (texts.length <= batchSize) {
      return provider.generateEmbeddings(texts);
    }

    // Split into batches
    const batches = this.chunkArray(texts, batchSize);
    console.log(`Processing ${texts.length} texts in ${batches.length} batches`);

    if (parallel) {
      // Process all batches in parallel
      return this.processBatchesParallel(batches, provider, retryOnError, maxRetries);
    } else {
      // Process batches sequentially
      return this.processBatchesSequential(batches, provider, retryOnError, maxRetries);
    }
  }

  /**
   * Process batches in parallel
   */
  private async processBatchesParallel(
    batches: string[][],
    provider: any,
    retryOnError: boolean,
    maxRetries: number
  ): Promise<EmbeddingVector[]> {
    const promises = batches.map((batch, index) =>
      this.processSingleBatch(batch, index, provider, retryOnError, maxRetries)
    );

    const results = await Promise.all(promises);
    return results.flat();
  }

  /**
   * Process batches sequentially
   */
  private async processBatchesSequential(
    batches: string[][],
    provider: any,
    retryOnError: boolean,
    maxRetries: number
  ): Promise<EmbeddingVector[]> {
    const results: EmbeddingVector[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batchResults = await this.processSingleBatch(
        batches[i],
        i,
        provider,
        retryOnError,
        maxRetries
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Process a single batch with retry logic
   */
  private async processSingleBatch(
    batch: string[],
    batchIndex: number,
    provider: any,
    retryOnError: boolean,
    maxRetries: number
  ): Promise<EmbeddingVector[]> {
    const attemptBatch = async (attempt: number): Promise<EmbeddingVector[]> => {
      try {
        console.log(`Processing batch ${batchIndex + 1} (${batch.length} texts)...`);
        const embeddings = await provider.generateEmbeddings(batch);
        console.log(`✓ Batch ${batchIndex + 1} completed`);
        return embeddings;
      } catch (error: any) {
        console.error(`✗ Batch ${batchIndex + 1} failed:`, error.message);

        if (retryOnError && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Retrying batch ${batchIndex + 1} in ${delay}ms...`);
          await this.sleep(delay);
          return attemptBatch(attempt + 1);
        }

        throw error;
      }
    };

    return attemptBatch(0);
  }

  /**
   * Estimate cost for embedding generation
   */
  estimateCost(textCount: number, model: string = 'text-embedding-3-small'): number {
    const costs: Record<string, number> = {
      'text-embedding-3-small': 0.00002,
      'text-embedding-3-large': 0.00013,
      'embedding-001': 0.00001,
    };

    const costPer1k = costs[model] || 0.00002;
    return (textCount / 1000) * costPer1k;
  }

  /**
   * Calculate similarity between two vectors (cosine similarity)
   */
  cosineSimilarity(vec1: EmbeddingVector, vec2: EmbeddingVector): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  /**
   * Find most similar text to a query
   */
  async findMostSimilar(
    query: string,
    texts: string[],
    topK: number = 5
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    // Generate embeddings
    const queryEmbedding = await this.generateEmbedding(query);
    const textEmbeddings = await this.generateBatch(texts);

    // Calculate similarities
    const similarities = textEmbeddings.map((embedding, index) => ({
      text: texts[index],
      similarity: this.cosineSimilarity(queryEmbedding, embedding),
      index,
    }));

    // Sort by similarity (descending) and take top K
    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  /**
   * Helper: Chunk array
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Helper: Sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
