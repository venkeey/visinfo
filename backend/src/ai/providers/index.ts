/**
 * AI Provider Factory
 * Creates and manages AI provider instances
 */

import { AIProvider, AIProviderClient, AIProviderConfig } from '../types';
import { getProviderConfig } from '../config/aiConfig';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import { OpenRouterProvider } from './openrouter';

/**
 * Create an AI provider instance
 */
export function createProvider(provider: AIProvider): AIProviderClient {
  const config = getProviderConfig(provider);

  switch (provider) {
    case AIProvider.OPENAI:
      return new OpenAIProvider(config);

    case AIProvider.GEMINI:
      return new GeminiProvider(config);

    case AIProvider.OPENROUTER:
      return new OpenRouterProvider(config);

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Create provider from custom config
 */
export function createProviderWithConfig(config: AIProviderConfig): AIProviderClient {
  switch (config.provider) {
    case AIProvider.OPENAI:
      return new OpenAIProvider(config);

    case AIProvider.GEMINI:
      return new GeminiProvider(config);

    case AIProvider.OPENROUTER:
      return new OpenRouterProvider(config);

    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

/**
 * Get default provider instance (singleton)
 */
let defaultProviderInstance: AIProviderClient | null = null;

export function getDefaultProvider(): AIProviderClient {
  if (!defaultProviderInstance) {
    const { provider } = require('../config/aiConfig').getAIConfig();
    defaultProviderInstance = createProvider(provider);
  }
  return defaultProviderInstance;
}

/**
 * Reset provider instances (useful for testing)
 */
export function resetProviders(): void {
  defaultProviderInstance = null;
}

// Export provider classes
export { OpenAIProvider } from './openai';
export { GeminiProvider } from './gemini';
export { OpenRouterProvider } from './openrouter';
export { BaseAIProvider } from './base';
