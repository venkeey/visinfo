# AI Providers Testing Guide

This directory contains tests for the AI service providers in `base.ts` and the concrete implementations (OpenAI, Gemini, OpenRouter).

## Test Files

1. **`base.test.ts`** - Mock provider test (no API calls required)
   - Tests the BaseAIProvider functionality
   - Uses a MockAIProvider that doesn't make real API calls
   - Safe to run without API keys

2. **`test-ai-providers.ts`** - Real provider integration test
   - Tests actual AI providers with real API calls
   - Requires API keys in `.env` file
   - Tests OpenAI, Gemini, and OpenRouter

## Prerequisites

1. **Node.js** (v18 or higher)
2. **TypeScript** and dependencies installed
3. **API Keys** (for integration tests)

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Install dotenv (if not already installed)

```bash
npm install dotenv
npm install --save-dev @types/node
```

### 3. Create .env File

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add at least one API key:

```env
# Add at least one of these:
OPENAI_API_KEY=sk-your-openai-key-here
GEMINI_API_KEY=your-gemini-key-here
OPENROUTER_API_KEY=sk-or-your-openrouter-key-here
```

**Where to get API keys:**
- OpenAI: https://platform.openai.com/api-keys
- Gemini: https://ai.google.dev/
- OpenRouter: https://openrouter.ai/keys

## Running Tests

### Test 1: Mock Provider (No API Keys Required)

This test uses a mock provider and doesn't make any real API calls:

```bash
cd backend
npx ts-node src/ai/providers/base.test.ts
```

**Expected Output:**
```
🧪 Starting Hello World Test for AI Service

✅ Provider initialized: MockProvider

Test 1: Health Check
   Result: ✅ Healthy

Test 2: Generate Single Embedding
   Result: ✅ Generated embedding with 5 dimensions
   Vector: [0.1, 0.2, 0.3, 0.4, 0.5]

Test 3: Generate Batch Embeddings
   Result: ✅ Generated 3 embeddings
   ...

🎉 All tests completed successfully!
```

### Test 2: Real AI Providers (Requires API Keys)

This test makes actual API calls to the configured providers:

```bash
cd backend
npx ts-node src/ai/test-ai-providers.ts
```

**Expected Output:**
```
🧪 AI Providers Integration Test
Testing real AI services with actual API calls

============================================================
Testing OpenAI
============================================================
✅ OpenAI - Health Check (234ms)
   Provider is healthy and reachable
✅ OpenAI - Single Embedding (456ms)
   Generated 1536D vector
   Sample: [0.0123, -0.0456, 0.0789, -0.0234, 0.0567...]
✅ OpenAI - Batch Embeddings (678ms)
   Generated 4 embeddings
✅ OpenAI - Chat Completion (890ms)
   Response: "Hello World"
✅ OpenAI - Input Validation
   Correctly validated input

============================================================
Test Summary
============================================================

Total Tests: 15
✅ Passed: 15
❌ Failed: 0
⏭️  Skipped: 0

Success Rate: 100.0%

🎉 All tests passed!
```

## Test Details

### What Each Test Does

1. **Health Check** - Verifies the provider API is reachable
2. **Single Embedding** - Generates an embedding for "Hello World"
3. **Batch Embeddings** - Generates embeddings for multiple texts
4. **Chat Completion** - Tests the chat API with a simple message
5. **Input Validation** - Ensures proper error handling for invalid inputs

### Providers Tested

The integration test will automatically test any provider that has an API key configured:

- **OpenAI** - Tests if `OPENAI_API_KEY` is set
- **Gemini** - Tests if `GEMINI_API_KEY` is set
- **OpenRouter** - Tests if `OPENROUTER_API_KEY` is set

If no API keys are found, the test will display instructions and exit.

## Troubleshooting

### "No API keys found in .env file"

Create a `.env` file in the `backend` directory and add at least one API key.

### "API key not found for provider"

Make sure your API key environment variable is correctly named and has a valid value.

### "Rate limit exceeded"

You've hit the API rate limit. Wait a moment and try again, or reduce the number of tests.

### "Network error" or "Timeout"

Check your internet connection and ensure the API endpoints are accessible.

### TypeScript errors

Make sure dependencies are installed:
```bash
npm install
```

## Adding More Tests

To add more tests, edit `test-ai-providers.ts` and add new test cases in the `testProvider` function.

Example:
```typescript
// Test 6: Custom Test
try {
  const start = Date.now();
  // Your test code here
  const result = await provider.someMethod();
  const duration = Date.now() - start;

  logResult({
    provider: providerName,
    test: 'Custom Test',
    status: 'PASS',
    message: 'Test passed!',
    duration,
  });
} catch (error) {
  logResult({
    provider: providerName,
    test: 'Custom Test',
    status: 'FAIL',
    message: `Error: ${(error as Error).message}`,
  });
}
```

## CI/CD Integration

To run these tests in CI/CD:

1. Add API keys as secrets/environment variables
2. Run: `npm run test:ai` (after adding the script to package.json)
3. Tests will fail if any provider test fails

Add to `package.json`:
```json
{
  "scripts": {
    "test:ai:mock": "ts-node src/ai/providers/base.test.ts",
    "test:ai:integration": "ts-node src/ai/test-ai-providers.ts"
  }
}
```

## Cost Considerations

These tests make real API calls which may incur costs:

- **OpenAI**: ~$0.0001 per test run (embeddings + chat)
- **Gemini**: Usually free tier covers testing
- **OpenRouter**: Varies by model, typically ~$0.0001 per test run

The full integration test suite costs less than $0.001 per run.
