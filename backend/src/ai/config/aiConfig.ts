/**
 * AI Configuration Management
 * Loads and validates AI provider settings from environment variables
 */

import { AIProvider, AIProviderConfig } from '../types';

export interface AIConfig {
  provider: AIProvider;
  embeddingModel: string;
  chatModel: string;
  apiKeys: {
    openai?: string;
    gemini?: string;
    openrouter?: string;
  };
  options: {
    timeout: number;
    maxRetries: number;
    batchSize: number;
    enableParallel: boolean;
  };
}

/**
 * Load AI configuration from environment variables
 */
export function loadAIConfig(): AIConfig {
  // Determine which provider to use
  const providerName = process.env.AI_PROVIDER || 'gemini';
  const provider = AIProvider[providerName.toUpperCase() as keyof typeof AIProvider];

  if (!provider) {
    throw new Error(
      `Invalid AI_PROVIDER: ${providerName}. Must be one of: openai, gemini, openrouter`
    );
  }

  // Load API keys
  const apiKeys = {
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };

  // Validate that the selected provider has an API key
  const providerKey = apiKeys[provider as keyof typeof apiKeys];
  if (!providerKey) {
    throw new Error(
      `API key not found for provider: ${provider}. Set ${provider.toUpperCase()}_API_KEY in .env`
    );
  }

  // Model selection with defaults
  const embeddingModel = process.env.EMBEDDING_MODEL || getDefaultEmbeddingModel(provider);
  const chatModel = process.env.CHAT_MODEL || getDefaultChatModel(provider);

  // Options with defaults
  const options = {
    timeout: parseInt(process.env.AI_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
    batchSize: parseInt(process.env.AI_BATCH_SIZE || '100', 10),
    enableParallel: process.env.AI_ENABLE_PARALLEL !== 'false', // Default true
  };

  return {
    provider,
    embeddingModel,
    chatModel,
    apiKeys,
    options,
  };
}

/**
 * Get provider-specific configuration
 */
export function getProviderConfig(provider: AIProvider): AIProviderConfig {
  const config = loadAIConfig();

  const apiKey = config.apiKeys[provider as keyof typeof config.apiKeys];
  if (!apiKey) {
    throw new Error(`API key not configured for provider: ${provider}`);
  }

  const baseURLs: Record<AIProvider, string | undefined> = {
    [AIProvider.OPENAI]: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    [AIProvider.GEMINI]: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1',
    [AIProvider.OPENROUTER]: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  };

  return {
    provider,
    apiKey,
    baseURL: baseURLs[provider],
    defaultModel: provider === config.provider ? config.embeddingModel : undefined,
    timeout: config.options.timeout,
    maxRetries: config.options.maxRetries,
  };
}

/**
 * Get default embedding model for provider
 */
function getDefaultEmbeddingModel(provider: AIProvider): string {
  const defaults: Record<AIProvider, string> = {
    [AIProvider.OPENAI]: 'text-embedding-3-small',
    [AIProvider.GEMINI]: 'embedding-001',
    [AIProvider.OPENROUTER]: 'text-embedding-3-small',
  };
  return defaults[provider];
}

/**
 * Get default chat model for provider
 */
function getDefaultChatModel(provider: AIProvider): string {
  const defaults: Record<AIProvider, string> = {
    [AIProvider.OPENAI]: 'gpt-4o-mini',
    [AIProvider.GEMINI]: 'gemini-pro',
    [AIProvider.OPENROUTER]: 'gpt-4o-mini',
  };
  return defaults[provider];
}

/**
 * Validate configuration on startup
 */
export function validateAIConfig(): void {
  try {
    const config = loadAIConfig();
    console.log('✓ AI Configuration loaded successfully');
    console.log(`  Provider: ${config.provider}`);
    console.log(`  Embedding Model: ${config.embeddingModel}`);
    console.log(`  Chat Model: ${config.chatModel}`);
    console.log(`  Batch Size: ${config.options.batchSize}`);
    console.log(`  Parallel Processing: ${config.options.enableParallel}`);
  } catch (error) {
    console.error('✗ AI Configuration error:', error);
    throw error;
  }
}

// Export singleton instance
let cachedConfig: AIConfig | null = null;

export function getAIConfig(): AIConfig {
  if (!cachedConfig) {
    cachedConfig = loadAIConfig();
  }
  return cachedConfig;
}
