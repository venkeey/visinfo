/**
 * AI-related TypeScript types and interfaces
 */

// ============================================
// Embedding Types
// ============================================

export type EmbeddingVector = number[];

export interface EmbeddingRequest {
  text: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: EmbeddingVector[];
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface BatchEmbeddingOptions {
  batchSize?: number;
  parallel?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

// ============================================
// AI Provider Types
// ============================================

export enum AIProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  OPENROUTER = 'openrouter',
}

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface AIProviderClient {
  generateEmbedding(text: string): Promise<EmbeddingVector>;
  generateEmbeddings(texts: string[]): Promise<EmbeddingVector[]>;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  getProviderName(): string;
}

// ============================================
// Chat/Completion Types
// ============================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Cluster Labeling Types
// ============================================

export interface ClusterLabel {
  label: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  themes: string[];
  summary: string;
  confidence?: number;
}

export interface LabelingRequest {
  samples: string[];
  context?: string;
  maxSamples?: number;
}

// ============================================
// Error Types
// ============================================

export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class RateLimitError extends AIProviderError {
  constructor(provider: AIProvider, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}

// ============================================
// Model Configuration Types
// ============================================

export interface ModelConfig {
  name: string;
  provider: AIProvider;
  dimensions?: number;  // For embedding models
  maxTokens?: number;
  costPer1kTokens?: number;
}

export const EMBEDDING_MODELS: Record<string, ModelConfig> = {
  'text-embedding-3-small': {
    name: 'text-embedding-3-small',
    provider: AIProvider.OPENAI,
    dimensions: 1536,
    maxTokens: 8191,
    costPer1kTokens: 0.00002,
  },
  'text-embedding-3-large': {
    name: 'text-embedding-3-large',
    provider: AIProvider.OPENAI,
    dimensions: 3072,
    maxTokens: 8191,
    costPer1kTokens: 0.00013,
  },
  'embedding-001': {
    name: 'embedding-001',
    provider: AIProvider.GEMINI,
    dimensions: 768,
    maxTokens: 2048,
    costPer1kTokens: 0.00001,
  },
};

export const CHAT_MODELS: Record<string, ModelConfig> = {
  'gpt-4o': {
    name: 'gpt-4o',
    provider: AIProvider.OPENAI,
    maxTokens: 128000,
    costPer1kTokens: 0.005,
  },
  'gpt-4o-mini': {
    name: 'gpt-4o-mini',
    provider: AIProvider.OPENAI,
    maxTokens: 128000,
    costPer1kTokens: 0.00015,
  },
  'gemini-1.5-flash': {
    name: 'gemini-1.5-flash',
    provider: AIProvider.GEMINI,
    maxTokens: 1000000,
    costPer1kTokens: 0.000075,
  },
};
