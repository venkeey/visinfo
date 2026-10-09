/**
 * AI Providers Integration Test
 * Tests actual AI providers (OpenAI, Gemini, OpenRouter) with real API calls
 *
 * Usage:
 *   1. Create a .env file with your API keys (see .env.example)
 *   2. Run: npx ts-node src/ai/test-ai-providers.ts
 *
 * This will test whichever providers have API keys configured.
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';
import { OpenRouterProvider } from './providers/openrouter';
import { AIProvider, AIProviderConfig, ChatMessage } from './types';

// Load environment variables (.env.local takes precedence over .env)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  console.log('Loading environment from .env.local');
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  console.log('Loading environment from .env');
  dotenv.config({ path: envPath });
} else {
  console.log('No .env or .env.local file found');
}

interface TestResult {
  provider: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
  const duration = result.duration ? ` (${result.duration}ms)` : '';
  console.log(`${icon} ${result.provider} - ${result.test}${duration}`);
  if (result.message) {
    console.log(`   ${result.message}`);
  }
  results.push(result);
}

async function testProvider(
  providerName: string,
  ProviderClass: any,
  config: AIProviderConfig
) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${providerName}`);
  console.log('='.repeat(60));

  try {
    const provider = new ProviderClass(config);

    // Test 1: Health Check
    try {
      const start = Date.now();
      const isHealthy = await provider.healthCheck();
      const duration = Date.now() - start;

      if (isHealthy) {
        logResult({
          provider: providerName,
          test: 'Health Check',
          status: 'PASS',
          message: 'Provider is healthy and reachable',
          duration,
        });
      } else {
        logResult({
          provider: providerName,
          test: 'Health Check',
          status: 'FAIL',
          message: 'Provider health check returned false',
          duration,
        });
      }
    } catch (error) {
      logResult({
        provider: providerName,
        test: 'Health Check',
        status: 'FAIL',
        message: `Error: ${(error as Error).message}`,
      });
    }

    // Test 2: Single Embedding
    try {
      const start = Date.now();
      const embedding = await provider.generateEmbedding('Hello World');
      const duration = Date.now() - start;

      if (Array.isArray(embedding) && embedding.length > 0) {
        logResult({
          provider: providerName,
          test: 'Single Embedding',
          status: 'PASS',
          message: `Generated ${embedding.length}D vector`,
          duration,
        });
        console.log(`   Sample: [${embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]`);
      } else {
        logResult({
          provider: providerName,
          test: 'Single Embedding',
          status: 'FAIL',
          message: 'Invalid embedding returned',
          duration,
        });
      }
    } catch (error) {
      logResult({
        provider: providerName,
        test: 'Single Embedding',
        status: 'FAIL',
        message: `Error: ${(error as Error).message}`,
      });
    }

    // Test 3: Batch Embeddings
    try {
      const texts = ['Hello', 'World', 'AI Service', 'Testing'];
      const start = Date.now();
      const embeddings = await provider.generateEmbeddings(texts);
      const duration = Date.now() - start;

      if (Array.isArray(embeddings) && embeddings.length === texts.length) {
        logResult({
          provider: providerName,
          test: 'Batch Embeddings',
          status: 'PASS',
          message: `Generated ${embeddings.length} embeddings`,
          duration,
        });
      } else {
        logResult({
          provider: providerName,
          test: 'Batch Embeddings',
          status: 'FAIL',
          message: `Expected ${texts.length} embeddings, got ${embeddings?.length || 0}`,
          duration,
        });
      }
    } catch (error) {
      logResult({
        provider: providerName,
        test: 'Batch Embeddings',
        status: 'FAIL',
        message: `Error: ${(error as Error).message}`,
      });
    }

    // Test 4: Chat Completion
    try {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Say "Hello World" and nothing else.',
        },
      ];
      const start = Date.now();
      const response = await provider.chat(messages);
      const duration = Date.now() - start;

      if (typeof response === 'string' && response.length > 0) {
        logResult({
          provider: providerName,
          test: 'Chat Completion',
          status: 'PASS',
          message: `Response: "${response}"`,
          duration,
        });
      } else {
        logResult({
          provider: providerName,
          test: 'Chat Completion',
          status: 'FAIL',
          message: 'Invalid response returned',
          duration,
        });
      }
    } catch (error) {
      logResult({
        provider: providerName,
        test: 'Chat Completion',
        status: 'FAIL',
        message: `Error: ${(error as Error).message}`,
      });
    }

    // Test 5: Input Validation
    try {
      await provider.generateEmbedding('');
      logResult({
        provider: providerName,
        test: 'Input Validation',
        status: 'FAIL',
        message: 'Should have thrown error for empty string',
      });
    } catch (error) {
      logResult({
        provider: providerName,
        test: 'Input Validation',
        status: 'PASS',
        message: 'Correctly validated input',
      });
    }

  } catch (error) {
    logResult({
      provider: providerName,
      test: 'Provider Initialization',
      status: 'FAIL',
      message: `Error: ${(error as Error).message}`,
    });
  }
}

async function runTests() {
  console.log('\n🧪 AI Providers Integration Test');
  console.log('Testing real AI services with actual API calls\n');

  // Check which providers are configured
  const providers: Array<{
    name: string;
    class: any;
    config: AIProviderConfig;
  }> = [];

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    providers.push({
      name: 'OpenAI',
      class: OpenAIProvider,
      config: {
        provider: AIProvider.OPENAI,
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL,
        defaultModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        maxRetries: 2,
      },
    });
  } else {
    console.log('⏭️  Skipping OpenAI (no API key in .env)');
  }

  // Gemini
  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: 'Gemini',
      class: GeminiProvider,
      config: {
        provider: AIProvider.GEMINI,
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: process.env.GEMINI_BASE_URL,
        defaultModel: process.env.GEMINI_EMBEDDING_MODEL || 'embedding-001',
        maxRetries: 2,
      },
    });
  } else {
    console.log('⏭️  Skipping Gemini (no API key in .env)');
  }

  // OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      name: 'OpenRouter',
      class: OpenRouterProvider,
      config: {
        provider: AIProvider.OPENROUTER,
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: process.env.OPENROUTER_BASE_URL,
        defaultModel: process.env.OPENROUTER_EMBEDDING_MODEL || 'text-embedding-ada-002',
        maxRetries: 2,
      },
    });
  } else {
    console.log('⏭️  Skipping OpenRouter (no API key in .env)');
  }

  if (providers.length === 0) {
    console.log('\n❌ No API keys found in .env file');
    console.log('Please create a .env file with at least one API key:');
    console.log('  - OPENAI_API_KEY');
    console.log('  - GEMINI_API_KEY');
    console.log('  - OPENROUTER_API_KEY');
    console.log('\nSee .env.example for details.');
    process.exit(1);
  }

  // Run tests for each configured provider
  for (const p of providers) {
    await testProvider(p.name, p.class, p.config);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);

  const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
  console.log(`\nSuccess Rate: ${successRate}%`);

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
  }
}

// Run tests
if (require.main === module) {
  runTests().catch((error) => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
}

export { runTests };
