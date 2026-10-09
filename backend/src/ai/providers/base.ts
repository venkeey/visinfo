/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */

import {
  AIProviderClient,
  AIProviderConfig,
  EmbeddingVector,
  ChatMessage,
  ChatOptions,
} from '../types';

export abstract class BaseAIProvider implements AIProviderClient {
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  /**
   * Generate embedding for a single text
   */
  abstract generateEmbedding(text: string): Promise<EmbeddingVector>;

  /**
   * Generate embeddings for multiple texts (batch)
   */
  abstract generateEmbeddings(texts: string[]): Promise<EmbeddingVector[]>;

  /**
   * Chat completion
   */
  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;

  /**
   * Get provider name
   */
  abstract getProviderName(): string;

  /**
   * Health check
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Helper: Validate text input
   */
  protected validateText(text: string): void {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }
    if (text.trim().length === 0) {
      throw new Error('Text cannot be empty or only whitespace');
    }
  }

  /**
   * Helper: Validate texts array
   */
  protected validateTexts(texts: string[]): void {
    if (!Array.isArray(texts)) {
      throw new Error('Texts must be an array');
    }
    if (texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }
    texts.forEach((text, index) => {
      try {
        this.validateText(text);
      } catch (error) {
        throw new Error(`Invalid text at index ${index}: ${error}`);
      }
    });
  }

  /**
   * Helper: Retry logic with exponential backoff
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(
          `Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Helper: Determine if error should not be retried
   */
  protected shouldNotRetry(error: any): boolean {
    // Don't retry on authentication errors (401)
    if (error.statusCode === 401 || error.status === 401) {
      return true;
    }
    // Don't retry on validation errors (400)
    if (error.statusCode === 400 || error.status === 400) {
      return true;
    }
    return false;
  }

  /**
   * Helper: Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Helper: Chunk array into batches
   */
  protected chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
