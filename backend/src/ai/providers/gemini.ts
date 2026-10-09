/**
 * Google Gemini Provider Implementation
 * Handles embeddings and chat completions via Google Gemini API
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

export class GeminiProvider extends BaseAIProvider {
  private baseURL: string;
  private apiKey: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
    this.apiKey = config.apiKey;
  }

  getProviderName(): string {
    return 'Google Gemini';
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingVector> {
    this.validateText(text);

    return this.retryWithBackoff(async () => {
      const model = this.config.defaultModel || 'text-embedding-004';
      const url = `${this.baseURL}/models/${model}:embedContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: {
            parts: [{ text }],
          },
        }),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = await response.json();
      return data.embedding.values;
    }, this.config.maxRetries);
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingVector[]> {
    this.validateTexts(texts);

    return this.retryWithBackoff(async () => {
      const model = this.config.defaultModel || 'text-embedding-004';
      const url = `${this.baseURL}/models/${model}:batchEmbedContents?key=${this.apiKey}`;

      const requests = texts.map((text) => ({
        model: `models/${model}`,
        content: {
          parts: [{ text }],
        },
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = await response.json();
      return data.embeddings.map((item: any) => item.values);
    }, this.config.maxRetries);
  }

  /**
   * Chat completion
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    return this.retryWithBackoff(async () => {
      const modelName = options?.model || process.env.CHAT_MODEL || 'gemini-2.0-flash';
      const url = `${this.baseURL}/models/${modelName}:generateContent?key=${this.apiKey}`;

      // Convert messages to Gemini format
      const contents = this.convertMessagesToGeminiFormat(messages);

      const requestBody: any = {
        contents,
        generationConfig: {
          temperature: options?.temperature ?? 0.3,
        },
      };

      if (options?.maxTokens) {
        requestBody.generationConfig.maxOutputTokens = options.maxTokens;
      }

      if (options?.responseFormat === 'json') {
        // requestBody.generationConfig.response_mime_type = 'application/json';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    }, this.config.maxRetries);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseURL}/models?key=${this.apiKey}`;
      const response = await fetch(url, { method: 'GET' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert ChatMessage[] to Gemini format
   */
  private convertMessagesToGeminiFormat(messages: ChatMessage[]): any[] {
    const contents: any[] = [];
    let systemInstruction = '';

    for (const message of messages) {
      if (message.role === 'system') {
        // Gemini handles system messages separately
        systemInstruction += message.content + '\n';
      } else {
        contents.push({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        });
      }
    }

    // Prepend system instruction to first user message if exists
    if (systemInstruction && contents.length > 0 && contents[0].role === 'user') {
      contents[0].parts[0].text = systemInstruction + contents[0].parts[0].text;
    }

    return contents;
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<never> {
    const status = response.status;
    let errorMessage = `Gemini API error: ${status}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      errorMessage = `${errorMessage} - ${response.statusText}`;
    }

    // Rate limit error
    if (status === 429) {
      throw new RateLimitError(AIProvider.GEMINI);
    }

    // Other errors
    throw new AIProviderError(errorMessage, AIProvider.GEMINI, status);
  }
}
