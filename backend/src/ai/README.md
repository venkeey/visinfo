# AI Module Documentation

This module provides a unified interface for AI-powered features including text embeddings and cluster labeling across multiple AI providers.

## 📁 Folder Structure

```
backend/src/ai/
├── config/
│   └── aiConfig.ts          # Configuration management
├── providers/
│   ├── base.ts              # Base provider interface
│   ├── openai.ts            # OpenAI implementation
│   ├── gemini.ts            # Google Gemini implementation
│   ├── openrouter.ts        # OpenRouter implementation
│   └── index.ts             # Provider factory
├── services/
│   ├── embeddingService.ts  # Embedding generation service
│   ├── labelingService.ts   # Cluster labeling service
│   └── index.ts             # Services export
├── types/
│   └── index.ts             # TypeScript types and interfaces
├── utils/
│   ├── rateLimiter.ts       # Rate limiting utility
│   ├── retry.ts             # Retry logic utility
│   └── index.ts             # Utils export
├── index.ts                 # Main module export
└── README.md                # This file
```

---

## 🚀 Quick Start

### 1. Installation

```bash
cd backend
npm install
```

### 2. Configuration

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini
```

### 3. Usage Example

```typescript
import { embeddingService, labelingService } from './ai';

// Generate embeddings
const texts = ["I love it", "Amazing", "Not good"];
const embeddings = await embeddingService.generateBatch(texts);
// Returns: [[0.234, -0.567, ...], [0.221, -0.543, ...], ...]

// Label a cluster
const label = await labelingService.labelCluster({
  samples: ["I love it", "Amazing", "Best ever"],
});
// Returns: {
//   label: "Feature Enthusiasts",
//   sentiment: "positive",
//   themes: ["satisfaction", "excitement"],
//   summary: "Users are highly satisfied..."
// }
```

---

## 📚 Components

### Providers

AI providers handle direct communication with AI APIs.

#### Supported Providers

| Provider | Embeddings | Chat | Cost |
|----------|-----------|------|------|
| **OpenAI** | ✓ | ✓ | $$ |
| **Gemini** | ✓ | ✓ | $ |
| **OpenRouter** | ✓ | ✓ | $$ |

#### Provider Interface

All providers implement the `AIProviderClient` interface:

```typescript
interface AIProviderClient {
  generateEmbedding(text: string): Promise<EmbeddingVector>;
  generateEmbeddings(texts: string[]): Promise<EmbeddingVector[]>;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  getProviderName(): string;
  healthCheck(): Promise<boolean>;
}
```

#### Creating a Provider

```typescript
import { createProvider, AIProvider } from './ai';

const provider = createProvider(AIProvider.OPENAI);
const embedding = await provider.generateEmbedding("Hello world");
```

---

### Services

#### Embedding Service

Generates semantic embeddings (numerical vectors) from text.

**Features:**
- Single text embedding
- Batch processing with configurable batch size
- Parallel or sequential processing
- Automatic retries on failure
- Cosine similarity calculation
- Semantic search

**Example:**

```typescript
import { embeddingService } from './ai/services';

// Single embedding
const vector = await embeddingService.generateEmbedding("I love this app");
// Returns: [0.234, -0.567, 0.123, ..., 0.891] (1536 numbers)

// Batch embeddings (recommended for multiple texts)
const responses = ["I love it", "Amazing", "Too slow", ...]; // 500 responses
const embeddings = await embeddingService.generateBatch(responses, {
  batchSize: 100,    // Process 100 at a time
  parallel: true,    // Run batches simultaneously
  retryOnError: true // Retry failed batches
});
// Returns: 500 embedding vectors

// Find similar texts
const similar = await embeddingService.findMostSimilar(
  "I love the features",
  responses,
  5 // Top 5 most similar
);
// Returns: [
//   { text: "I love it", similarity: 0.92, index: 0 },
//   { text: "Amazing features", similarity: 0.87, index: 1 },
//   ...
// ]

// Calculate similarity
const sim = embeddingService.cosineSimilarity(embedding1, embedding2);
// Returns: 0.89 (range: -1 to 1)

// Estimate cost
const cost = embeddingService.estimateCost(500, 'text-embedding-3-small');
// Returns: 0.01 (dollars)
```

---

#### Labeling Service

Uses AI to analyze and label text clusters.

**Features:**
- Cluster labeling with sentiment analysis
- Theme extraction
- Overall summary generation
- Key quote extraction
- Improvement suggestions

**Example:**

```typescript
import { labelingService } from './ai/services';

// Label a single cluster
const label = await labelingService.labelCluster({
  samples: ["I love it", "Amazing", "Best ever"],
  context: "User feedback on new feature", // Optional
  maxSamples: 15 // Limit samples to avoid token limits
});
// Returns: {
//   label: "Feature Enthusiasts",
//   sentiment: "positive",
//   themes: ["satisfaction", "excitement", "praise"],
//   summary: "Users are highly satisfied with the new feature",
//   confidence: 0.92
// }

// Label multiple clusters in parallel
const clusters = [
  { samples: ["I love it", ...] },
  { samples: ["Too slow", ...] },
  { samples: ["It's okay", ...] }
];
const labels = await labelingService.labelClusters(clusters);
// Returns: array of ClusterLabel objects

// Generate overall summary
const summary = await labelingService.generateOverallSummary(labels);
// Returns: "3 key insights: 1. 70% positive sentiment..."

// Extract key quotes
const quotes = await labelingService.extractKeyQuotes(
  ["I love it", "Amazing", ...],
  3 // Number of quotes
);
// Returns: [
//   { quote: "I love it", reason: "Expresses strong positive sentiment" },
//   ...
// ]

// Get improvement suggestions
const negativeLabels = labels.filter(l => l.sentiment === 'negative');
const improvements = await labelingService.suggestImprovements(negativeLabels);
// Returns: [
//   "Optimize loading times to reduce wait periods",
//   "Fix crash on Android 11 devices",
//   ...
// ]
```

---

### Configuration

Configuration is managed through environment variables.

**Required Variables:**

```env
AI_PROVIDER=openai              # Which provider to use
OPENAI_API_KEY=sk-...           # API key for chosen provider
```

**Optional Variables:**

```env
EMBEDDING_MODEL=text-embedding-3-small  # Default model
CHAT_MODEL=gpt-4o-mini                  # Chat model
AI_BATCH_SIZE=100                       # Batch size
AI_ENABLE_PARALLEL=true                 # Parallel processing
AI_TIMEOUT=30000                        # Timeout (ms)
AI_MAX_RETRIES=3                        # Max retries
```

**Loading Configuration:**

```typescript
import { getAIConfig, validateAIConfig } from './ai/config/aiConfig';

// Validate on startup
validateAIConfig();
// Logs: ✓ AI Configuration loaded successfully
//       Provider: openai
//       Embedding Model: text-embedding-3-small
//       ...

// Get configuration
const config = getAIConfig();
console.log(config.provider); // 'openai'
console.log(config.embeddingModel); // 'text-embedding-3-small'
```

---

### Types

All TypeScript types and interfaces are defined in `types/index.ts`.

**Key Types:**

```typescript
// Embedding vector (array of numbers)
type EmbeddingVector = number[];

// AI providers enum
enum AIProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  OPENROUTER = 'openrouter',
}

// Chat message
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Cluster label
interface ClusterLabel {
  label: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  themes: string[];
  summary: string;
  confidence?: number;
}
```

---

### Utilities

#### Rate Limiter

Manages API rate limits to avoid hitting provider limits.

```typescript
import { RateLimiter } from './ai/utils';

const limiter = new RateLimiter({
  requestsPerMinute: 500
});

// Wait for available slot
await limiter.waitForSlot();
// Make API call
await provider.generateEmbedding("text");
```

#### Retry Logic

Automatic retry with exponential backoff.

```typescript
import { retryWithBackoff } from './ai/utils';

const result = await retryWithBackoff(
  () => provider.generateEmbedding("text"),
  {
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`Retry ${attempt}: ${error.message}`);
    }
  }
);
```

---

## 🔧 Advanced Usage

### Custom Provider Configuration

```typescript
import { createProviderWithConfig, AIProvider } from './ai';

const customProvider = createProviderWithConfig({
  provider: AIProvider.OPENAI,
  apiKey: 'custom-key',
  baseURL: 'https://custom-endpoint.com',
  defaultModel: 'custom-model',
  timeout: 60000,
  maxRetries: 5
});
```

### Error Handling

```typescript
import {
  embeddingService,
  AIProviderError,
  RateLimitError
} from './ai';

try {
  const embedding = await embeddingService.generateEmbedding("text");
} catch (error) {
  if (error instanceof RateLimitError) {
    console.error('Rate limit hit!', error.retryAfter);
    // Wait and retry
  } else if (error instanceof AIProviderError) {
    console.error('Provider error:', error.provider, error.statusCode);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Switching Providers

```typescript
// Method 1: Change environment variable and restart
process.env.AI_PROVIDER = 'gemini';

// Method 2: Create specific provider
import { createProvider, AIProvider } from './ai';
const geminiProvider = createProvider(AIProvider.GEMINI);
```

---

## 💰 Cost Optimization

### Batch Processing

**Don't do this (expensive in time):**
```typescript
// 500 API calls
for (const text of texts) {
  await embeddingService.generateEmbedding(text);
}
```

**Do this instead (5 API calls):**
```typescript
// Process in batches of 100
const embeddings = await embeddingService.generateBatch(texts, {
  batchSize: 100,
  parallel: true
});
```

### Model Selection

| Use Case | Recommended Model | Cost per 1k tokens |
|----------|------------------|-------------------|
| Embeddings | text-embedding-3-small | $0.00002 |
| Cluster labeling | gpt-4o-mini | $0.00015 |
| Deep analysis | gpt-4o | $0.005 |
| Budget option | gemini-1.5-flash | $0.000075 |

### Sample Costs

**500 poll responses:**
```
Embeddings:   500 × $0.00002 = $0.01
Labeling (8 clusters): 8 × $0.0045 = $0.036
Total: ~$0.05 per poll
```

**10,000 poll responses:**
```
Embeddings:   10,000 × $0.00002 = $0.20
Labeling (15 clusters): 15 × $0.0045 = $0.068
Total: ~$0.27 per poll
```

---

## 🧪 Testing

```typescript
import { embeddingService, getDefaultProvider } from './ai';

// Health check
const provider = getDefaultProvider();
const isHealthy = await provider.healthCheck();
console.log('Provider healthy:', isHealthy);

// Test embedding
const testVector = await embeddingService.generateEmbedding("test");
console.log('Vector dimensions:', testVector.length);

// Test labeling
const testLabel = await labelingService.labelCluster({
  samples: ["Great!", "Amazing!", "Love it!"]
});
console.log('Label:', testLabel);
```

---

## 📊 Performance

| Operation | Items | Time | API Calls |
|-----------|-------|------|-----------|
| Single embedding | 1 | ~200ms | 1 |
| Batch embeddings (sequential) | 500 | ~10s | 5 |
| Batch embeddings (parallel) | 500 | ~2s | 5 |
| Cluster labeling | 1 | ~1-2s | 1 |
| Multiple cluster labeling | 8 | ~2-3s | 8 |

---

## 🐛 Troubleshooting

### "API key not found" error

**Solution:** Ensure `.env` file exists and contains the correct API key:
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

### Rate limit errors

**Solution:** Reduce batch size or enable sequential processing:
```typescript
await embeddingService.generateBatch(texts, {
  batchSize: 50,    // Smaller batches
  parallel: false   // Sequential processing
});
```

### Timeout errors

**Solution:** Increase timeout in `.env`:
```env
AI_TIMEOUT=60000  # 60 seconds
```

---

## 📖 Related Documentation

- [Architecture Beginner Guide](../../../docs/ARCHITECTURE_BEGINNER_GUIDE.md)
- [Embedding Integration Strategy](../../../docs/EMBEDDING_INTEGRATION_STRATEGY.md)
- [Hierarchical Classification](../../../docs/HIERARCHICAL_CLASSIFICATION.md)

---

## 🤝 Contributing

When adding new providers:

1. Create provider file in `providers/`
2. Extend `BaseAIProvider` class
3. Implement all required methods
4. Add to provider factory in `providers/index.ts`
5. Update types if needed
6. Add tests
7. Update this documentation

---

**Last Updated:** 2025-01-17
