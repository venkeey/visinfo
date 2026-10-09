# AI Provider Architecture Flow

## 🏗️ Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ClassificationService                        │
│                  generateAILabel(texts)                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 1. Call labelingService
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                      LabelingService                             │
│              labelCluster({ samples, context })                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 2. Get provider instance
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Provider Factory                              │
│                  getDefaultProvider()                            │
│                                                                  │
│  Reads .env:                                                     │
│  AI_PROVIDER=gemini ──→ Returns GeminiProvider instance          │
│  AI_PROVIDER=openai ──→ Returns OpenAIProvider instance          │
│  AI_PROVIDER=openrouter ──→ Returns OpenRouterProvider instance │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 3. Call chat method
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BaseAIProvider                              │
│             abstract chat(messages, options)                     │
│                                                                  │
│  Provides common functionality:                                  │
│  ✅ Retry logic with exponential backoff                         │
│  ✅ Input validation                                             │
│  ✅ Error handling                                               │
│  ✅ Request timeout management                                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ↓             ↓             ↓
┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
│  OpenAI     │ │   Gemini    │ │   OpenRouter    │
│  Provider   │ │   Provider  │ │   Provider      │
│             │ │             │ │                 │
│ Implements  │ │ Implements  │ │ Implements      │
│ chat()      │ │ chat()      │ │ chat()          │
└──────┬──────┘ └──────┬──────┘ └────────┬────────┘
       │               │                  │
       │ 4. Make API call                 │
       ↓               ↓                  ↓
┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
│ OpenAI API  │ │ Gemini API  │ │ OpenRouter API  │
│ api.openai  │ │ generative  │ │ openrouter.ai   │
│ .com/v1     │ │ language    │ │ /api/v1         │
└──────┬──────┘ └──────┬──────┘ └────────┬────────┘
       │               │                  │
       │ 5. Return JSON response          │
       │               │                  │
       └───────────────┴──────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Response Processing                           │
│                                                                  │
│  {                                                               │
│    "label": "Performance Issues",                               │
│    "sentiment": "negative",                                     │
│    "themes": ["slow", "loading", "performance"],                │
│    "summary": "Users report slow performance",                  │
│    "confidence": 0.92                                           │
│  }                                                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 6. Extract label
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│               ClassificationService Result                       │
│                                                                  │
│              cluster.label = "Performance Issues"                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure & Responsibilities

### **1. Base Provider (`base.ts`)**

**Location:** `backend/src/ai/providers/base.ts`

**Responsibility:** Common functionality for ALL providers

```typescript
export abstract class BaseAIProvider implements AIProviderClient {
  // Must be implemented by each provider
  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  abstract generateEmbedding(text: string): Promise<EmbeddingVector>;
  abstract generateEmbeddings(texts: string[]): Promise<EmbeddingVector[]>;

  // Shared helper methods (used by all providers)
  protected retryWithBackoff<T>(fn: () => Promise<T>): Promise<T>
  protected validateText(text: string): void
  protected validateTexts(texts: string[]): void
  protected sleep(ms: number): Promise<void>
  protected chunkArray<T>(array: T[], chunkSize: number): T[][]
}
```

**What it does:**
- ✅ Defines the contract all providers must follow
- ✅ Provides retry logic (3 attempts with exponential backoff)
- ✅ Validates inputs before sending to API
- ✅ Handles errors consistently
- ✅ Implements utility functions

---

### **2. Provider Implementations**

#### **OpenAI Provider** (`providers/openai.ts`)

```typescript
export class OpenAIProvider extends BaseAIProvider {
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    return this.retryWithBackoff(async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options?.model || 'gpt-4o-mini',
          messages,
          temperature: options?.temperature || 0.7,
          response_format: options?.responseFormat === 'json'
            ? { type: 'json_object' }
            : undefined
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    });
  }
}
```

**What it does:**
- ✅ Extends BaseAIProvider (gets retry logic automatically)
- ✅ Implements OpenAI-specific API call format
- ✅ Handles OpenAI JSON mode
- ✅ Manages authentication

#### **Gemini Provider** (`providers/gemini.ts`)

```typescript
export class GeminiProvider extends BaseAIProvider {
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    return this.retryWithBackoff(async () => {
      const genAI = new GoogleGenerativeAI(this.config.apiKey);
      const model = genAI.getGenerativeModel({
        model: options?.model || 'gemini-1.5-flash',
        generationConfig: {
          temperature: options?.temperature || 0.7,
          responseMimeType: options?.responseFormat === 'json'
            ? 'application/json'
            : 'text/plain'
        }
      });

      const prompt = this.convertMessagesToGeminiFormat(messages);
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  }
}
```

**What it does:**
- ✅ Extends BaseAIProvider (gets retry logic automatically)
- ✅ Converts messages to Gemini format
- ✅ Implements Gemini-specific API
- ✅ Handles Gemini JSON mode

#### **OpenRouter Provider** (`providers/openrouter.ts`)

```typescript
export class OpenRouterProvider extends BaseAIProvider {
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    return this.retryWithBackoff(async () => {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL,
          'X-Title': 'VisInfo'
        },
        body: JSON.stringify({
          model: options?.model || 'gpt-4o-mini',
          messages,
          temperature: options?.temperature || 0.7
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    });
  }
}
```

**What it does:**
- ✅ Extends BaseAIProvider (gets retry logic automatically)
- ✅ Implements OpenRouter-specific headers
- ✅ Supports any OpenRouter model
- ✅ Compatible with OpenAI format

---

### **3. Provider Factory** (`providers/index.ts`)

```typescript
export function getDefaultProvider(): AIProviderClient {
  if (!defaultProviderInstance) {
    const config = getAIConfig();  // Reads from .env

    // Create the right provider based on config
    switch (config.provider) {
      case AIProvider.OPENAI:
        defaultProviderInstance = new OpenAIProvider(config);
        break;
      case AIProvider.GEMINI:
        defaultProviderInstance = new GeminiProvider(config);
        break;
      case AIProvider.OPENROUTER:
        defaultProviderInstance = new OpenRouterProvider(config);
        break;
    }
  }

  return defaultProviderInstance;  // Singleton instance
}
```

**What it does:**
- ✅ Reads `AI_PROVIDER` from .env
- ✅ Creates appropriate provider instance
- ✅ Caches instance (singleton pattern)
- ✅ Returns provider that extends BaseAIProvider

---

### **4. Labeling Service** (`services/labelingService.ts`)

```typescript
export class LabelingService {
  async labelCluster(request: LabelingRequest): Promise<ClusterLabel> {
    const { samples, context, maxSamples = 15 } = request;

    // Build prompt
    const prompt = this.buildLabelingPrompt(samples, context);

    // Get provider (automatically selected based on .env)
    const provider = getDefaultProvider();

    // Call provider.chat() - goes through BaseAIProvider
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are an expert at analyzing user feedback...' },
      { role: 'user', content: prompt }
    ];

    const responseText = await provider.chat(messages, {
      temperature: 0.3,
      responseFormat: 'json'
    });

    // Parse and return
    return JSON.parse(responseText);
  }
}
```

**What it does:**
- ✅ Builds prompts for label generation
- ✅ Calls `getDefaultProvider()` to get configured provider
- ✅ Invokes `provider.chat()` which goes through BaseAIProvider
- ✅ Parses JSON response
- ✅ Returns structured ClusterLabel

---

### **5. Classification Service** (`services/ai/ClassificationService.ts`)

```typescript
export class ClassificationService {
  private async generateAILabel(texts: string[]): Promise<string | null> {
    // Uses LabelingService (which uses BaseAIProvider)
    const result = await labelingService.labelCluster({
      samples: texts.slice(0, 15),
      context: 'Poll response feedback',
      maxSamples: 15
    });

    return result.label;  // Extract just the label
  }
}
```

**What it does:**
- ✅ Calls LabelingService for AI labels
- ✅ Extracts label from full response
- ✅ Falls back to TF-IDF if AI fails
- ✅ NO direct provider access (goes through service)

---

## 🔄 Request Example: Tracing a Label Generation

### **Step-by-Step Trace**

```typescript
// 1. User triggers classification
await ClassificationService.classifyPollResponses('poll-123');

// 2. Classification needs label for cluster
await generateAILabel([
  "App is slow",
  "Slow performance",
  "Performance bad"
]);

// 3. Calls LabelingService
await labelingService.labelCluster({
  samples: ["App is slow", "Slow performance", "Performance bad"],
  context: "Poll response feedback",
  maxSamples: 15
});

// 4. LabelingService gets provider
const provider = getDefaultProvider();
// → Reads AI_PROVIDER=gemini from .env
// → Returns new GeminiProvider(config)

// 5. Calls provider.chat()
await provider.chat([
  {
    role: 'system',
    content: 'You are an expert at analyzing user feedback...'
  },
  {
    role: 'user',
    content: 'Analyze the following 3 similar user responses...'
  }
], {
  temperature: 0.3,
  responseFormat: 'json'
});

// 6. GeminiProvider.chat() calls this.retryWithBackoff()
// (inherited from BaseAIProvider)
return this.retryWithBackoff(async () => {
  // 7. Makes actual API call
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json'
    }
  });

  // 8. Send to Gemini API
  const result = await model.generateContent(prompt);

  // 9. Return response
  return result.response.text();
  // Returns: '{"label":"Performance Issues",...}'
});

// 10. LabelingService parses JSON
const parsed = JSON.parse(responseText);
// {
//   label: "Performance Issues",
//   sentiment: "negative",
//   themes: ["slow", "performance"],
//   summary: "Users report performance issues",
//   confidence: 0.89
// }

// 11. Returns to ClassificationService
return parsed;

// 12. ClassificationService extracts label
const label = result.label;  // "Performance Issues"

// 13. Applies to cluster
cluster.label = "Performance Issues";  ✅
```

---

## 🎯 Key Architecture Benefits

### **1. Separation of Concerns**

```
BaseAIProvider → Handles common functionality (retry, validation, errors)
Specific Providers → Handle API-specific implementations
LabelingService → Handles business logic (prompts, parsing)
ClassificationService → Handles clustering workflow
```

### **2. Easy Provider Switching**

```bash
# No code changes needed!

# Development: Use free Gemini
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key

# Production: Use OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=your_key

# Experimentation: Use OpenRouter
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key
```

### **3. Consistent Error Handling**

All providers inherit retry logic from BaseAIProvider:
```typescript
// Attempt 1 fails → Wait 1s → Retry
// Attempt 2 fails → Wait 2s → Retry
// Attempt 3 fails → Throw error
// ClassificationService catches → Falls back to TF-IDF
```

### **4. Testability**

```typescript
// Mock at any level
jest.mock('../../ai/services/labelingService');
jest.mock('../../ai/providers');
jest.mock('../../ai/providers/base');
```

---

## 🔍 Debugging Tips

### **See Which Provider is Active**

```typescript
import { getAIConfig } from './ai/config/aiConfig';

const config = getAIConfig();
console.log('Active provider:', config.provider);
console.log('Chat model:', config.chatModel);
```

### **Trace the Full Flow**

Add logging at each level:

```typescript
// In ClassificationService
console.log('[ClassificationService] Generating AI label');

// In LabelingService
console.log('[LabelingService] Calling provider.chat()');

// In BaseAIProvider
console.log('[BaseAIProvider] Attempt 1/3');

// In GeminiProvider
console.log('[GeminiProvider] Making Gemini API call');
```

### **Test Provider Directly**

```typescript
import { getDefaultProvider } from './ai/providers';

const provider = getDefaultProvider();
const response = await provider.chat([
  { role: 'user', content: 'Say hello' }
]);

console.log('Response:', response);
```

---

## ✅ Summary

**The Base Provider Architecture:**

1. ✅ **BaseAIProvider** - Abstract class with common functionality
2. ✅ **Specific Providers** - Implement provider-specific API calls
3. ✅ **Provider Factory** - Selects provider based on .env
4. ✅ **Services** - Use providers through factory (no direct access)
5. ✅ **Classification** - Uses services (no direct provider access)

**All AI calls flow through BaseAIProvider**, ensuring:
- Consistent retry logic
- Unified error handling
- Input validation
- Provider abstraction

**Current Flow:**
```
ClassificationService
  → LabelingService
    → getDefaultProvider()
      → BaseAIProvider
        → GeminiProvider | OpenAIProvider | OpenRouterProvider
          → AI API
```

🎉 **Architecture is production-ready!**
