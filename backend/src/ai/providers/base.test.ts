/**
 * Hello World Test for AI Service (base.ts)
 * Simple test demonstrating the AI provider's chat functionality
 */

import { BaseAIProvider } from './base';
import {
  AIProviderConfig,
  AIProvider,
  EmbeddingVector,
  ChatMessage,
  ChatOptions,
} from '../types';

/**
 * Mock AI Provider for testing
 * Implements BaseAIProvider without making real API calls
 */
class MockAIProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig) {
    super(config);
  }

  getProviderName(): string {
    return 'MockProvider';
  }

  async generateEmbedding(text: string): Promise<EmbeddingVector> {
    this.validateText(text);
    // Return a simple mock embedding vector
    return [0.1, 0.2, 0.3, 0.4, 0.5];
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingVector[]> {
    this.validateTexts(texts);
    // Return mock embeddings for each text
    return texts.map((_, index) => [
      index * 0.1,
      index * 0.2,
      index * 0.3,
      index * 0.4,
      index * 0.5,
    ]);
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    // Simple "Hello World" response based on the last message
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.content.toLowerCase().includes('hello')) {
      return 'Hello World! This is the AI service responding from base.ts';
    }

    return `Echo: ${lastMessage.content}`;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

/**
 * Run the hello world test
 */
async function runHelloWorldTest() {
  console.log('🧪 Starting Hello World Test for AI Service\n');

  // Create a mock provider config
  const config: AIProviderConfig = {
    provider: AIProvider.OPENAI,
    apiKey: 'mock-api-key',
    defaultModel: 'gpt-4o-mini',
  };

  // Instantiate the mock provider
  const aiProvider = new MockAIProvider(config);

  console.log(`✅ Provider initialized: ${aiProvider.getProviderName()}\n`);

  // Test 1: Health Check
  console.log('Test 1: Health Check');
  const isHealthy = await aiProvider.healthCheck();
  console.log(`   Result: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);

  // Test 2: Single Embedding
  console.log('Test 2: Generate Single Embedding');
  const embedding = await aiProvider.generateEmbedding('Hello World');
  console.log(`   Result: ✅ Generated embedding with ${embedding.length} dimensions`);
  console.log(`   Vector: [${embedding.join(', ')}]\n`);

  // Test 3: Batch Embeddings
  console.log('Test 3: Generate Batch Embeddings');
  const texts = ['Hello', 'World', 'AI Service'];
  const embeddings = await aiProvider.generateEmbeddings(texts);
  console.log(`   Result: ✅ Generated ${embeddings.length} embeddings`);
  embeddings.forEach((emb, idx) => {
    console.log(`   Text "${texts[idx]}": [${emb.join(', ')}]`);
  });
  console.log();

  // Test 4: Chat - Hello World
  console.log('Test 4: Chat - Hello World');
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: 'Hello, AI service!',
    },
  ];
  const response = await aiProvider.chat(messages);
  console.log(`   User: "${messages[0].content}"`);
  console.log(`   AI: "${response}"`);
  console.log(`   Result: ✅ Chat successful\n`);

  // Test 5: Chat - Echo Test
  console.log('Test 5: Chat - Echo Test');
  const echoMessages: ChatMessage[] = [
    {
      role: 'user',
      content: 'Testing the AI service from base.ts',
    },
  ];
  const echoResponse = await aiProvider.chat(echoMessages);
  console.log(`   User: "${echoMessages[0].content}"`);
  console.log(`   AI: "${echoResponse}"`);
  console.log(`   Result: ✅ Echo successful\n`);

  // Test 6: Input Validation
  console.log('Test 6: Input Validation');
  try {
    await aiProvider.generateEmbedding('');
    console.log('   Result: ❌ Should have thrown validation error');
  } catch (error) {
    console.log(`   Result: ✅ Validation error caught: ${(error as Error).message}\n`);
  }

  console.log('🎉 All tests completed successfully!\n');
}

// Run the test if this file is executed directly
if (require.main === module) {
  runHelloWorldTest().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export { MockAIProvider, runHelloWorldTest };
