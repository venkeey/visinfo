/**
 * OpenRouter Provider Implementation
 * OpenRouter provides access to multiple AI models through a unified API
 * Uses OpenAI-compatible API format
 */

import {
  AIProvider,
  AIProviderConfig,
  EmbeddingVector,
  ChatMessage,
  ChatOptions,
  AIProviderError,
  RateLimitError,
} from '../types';
import { BaseAIProvider } from './base';

export class OpenRouterProvider extends BaseAIProvider {
  private baseURL: string;
  private apiKey: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
    this.apiKey = config.apiKey;
  }

  getProviderName(): string {
    return 'OpenRouter';
  }

  /**
   * Generate embedding for a single text
   * Note: OpenRouter routes to underlying providers (e.g., OpenAI)
   */
  async generateEmbedding(text: string): Promise<EmbeddingVector> {
    this.validateText(text);
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * Uses OpenAI-compatible API format
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingVector[]> {
    this.validateTexts(texts);

    return this.retryWithBackoff(async () => {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'VisInfo',
        },
        body: JSON.stringify({
          model: this.config.defaultModel || 'openai/text-embedding-3-small',
          input: texts,
        }),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    }, this.config.maxRetries);
  }

  /**
   * Chat completion
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    return this.retryWithBackoff(async () => {
      const requestBody: any = {
        model: options?.model || 'openai/gpt-4o-mini',
        messages: messages,
        temperature: options?.temperature ?? 0.3,
      };

      if (options?.maxTokens) {
        requestBody.max_tokens = options.maxTokens;
      }

      if (options?.responseFormat === 'json') {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'VisInfo',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    }, this.config.maxRetries);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<never> {
    const status = response.status;
    let errorMessage = `OpenRouter API error: ${status}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      errorMessage = `${errorMessage} - ${response.statusText}`;
    }

    // Rate limit error
    if (status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new RateLimitError(
        AIProvider.OPENROUTER,
        retryAfter ? parseInt(retryAfter) * 1000 : undefined
      );
    }

    // Other errors
    throw new AIProviderError(errorMessage, AIProvider.OPENROUTER, status);
  }
}
