# Multi-Provider AI Architecture

## Overview

VisInfo uses a **multi-provider AI architecture** with automatic fallback to ensure high availability and resilience. The system tries providers in order of priority until one succeeds.

## Provider Priority Order

1. **Primary: OpenRouter** (Default)
2. **Backup: Google Gemini**
3. **Tertiary: OpenAI** (Optional)
4. **Offline Fallback: Local Transformers** (Optional)

---

## Provider Details

### 1. OpenRouter (Primary)

**Why OpenRouter?**
- ✅ Access to multiple models (GPT, Claude, Llama, etc.)
- ✅ Competitive pricing
- ✅ Single API for many providers
- ✅ Good rate limits
- ✅ Transparent pricing dashboard

**Configuration:**
```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_EMBEDDING_MODEL=text-embedding-ada-002
```

**Get API Key:** https://openrouter.ai/keys

**Supported Models:**
- `text-embedding-ada-002` (OpenAI via OpenRouter)
- Other embedding models as available

---

### 2. Google Gemini (Backup)

**Why Gemini?**
- ✅ Free tier available
- ✅ Fast inference
- ✅ Good embedding quality
- ✅ Google's latest AI

**Configuration:**
```env
GEMINI_API_KEY=AIza...
GEMINI_EMBEDDING_MODEL=embedding-001
```

**Get API Key:** https://ai.google.dev/

**Supported Models:**
- `embedding-001` - Latest Gemini embedding model
- `text-embedding-004` - Alternative

---

### 3. OpenAI (Tertiary - Optional)

**Why OpenAI?**
- ✅ Industry standard
- ✅ High quality embeddings
- ✅ Well documented

**Configuration:**
```env
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
ENABLE_OPENAI=true
```

**Get API Key:** https://platform.openai.com/api-keys

**Supported Models:**
- `text-embedding-ada-002` - Most common, 1536 dimensions
- `text-embedding-3-small` - Newer, cheaper
- `text-embedding-3-large` - Highest quality

---

### 4. Local Transformers (Offline Fallback - Optional)

**Why Local?**
- ✅ Completely free
- ✅ Works offline
- ✅ Data privacy (no external API calls)
- ✅ No rate limits

**Configuration:**
```env
ENABLE_LOCAL_EMBEDDINGS=true
LOCAL_EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
```

**Supported Models:**
- `Xenova/all-MiniLM-L6-v2` - 384 dimensions, fast
- `Xenova/all-mpnet-base-v2` - 768 dimensions, more accurate
- `Xenova/bge-small-en-v1.5` - 384 dimensions, good balance

**Note:** First run downloads model (~50-100MB), then cached locally.

---

## How Fallback Works

```
Request → OpenRouter
            ↓ (fails)
          Gemini
            ↓ (fails)
          OpenAI (if enabled)
            ↓ (fails)
          Local (if enabled)
            ↓ (fails)
          ERROR
```

**Retry Logic:**
- Each provider gets 1 attempt
- 1 second delay between provider switches
- Logs which provider succeeded/failed
- Transparent to the application

**Example Log:**
```
Attempting embedding with openrouter...
✗ openrouter failed: API rate limit exceeded
Falling back to gemini...
✓ Success with gemini
```

---

## Recommended Setup

### For Development:
```env
# Just use Gemini (free)
GEMINI_API_KEY=your_key
```

### For Production (High Availability):
```env
# Primary: OpenRouter
OPENROUTER_API_KEY=your_key

# Backup: Gemini
GEMINI_API_KEY=your_key

# Optional: Local fallback for offline
ENABLE_LOCAL_EMBEDDINGS=true
```

### For Cost Optimization:
```env
# Primary: Gemini (free tier)
GEMINI_API_KEY=your_key

# Backup: Local (free, no limits)
ENABLE_LOCAL_EMBEDDINGS=true
```

---

## Cost Comparison

| Provider | Model | Cost per 1M tokens | Free Tier |
|----------|-------|-------------------|-----------|
| OpenRouter | text-embedding-ada-002 | ~$0.10 | No |
| Gemini | embedding-001 | Free | Yes (limited) |
| OpenAI | text-embedding-ada-002 | $0.10 | $5 credit |
| Local | all-MiniLM-L6-v2 | $0.00 | Unlimited |

**Estimated costs for 10,000 poll responses:**
- Gemini: **Free**
- Local: **Free**
- OpenRouter/OpenAI: **~$0.50-$1.00**

---

## API Key Setup Instructions

### OpenRouter
1. Go to https://openrouter.ai/
2. Sign up with GitHub or email
3. Go to https://openrouter.ai/keys
4. Create new API key
5. Copy to `.env` as `OPENROUTER_API_KEY`

### Google Gemini
1. Go to https://ai.google.dev/
2. Sign in with Google account
3. Click "Get API Key"
4. Create API key
5. Copy to `.env` as `GEMINI_API_KEY`

### OpenAI (Optional)
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Go to https://platform.openai.com/api-keys
4. Create new secret key
5. Copy to `.env` as `OPENAI_API_KEY`

---

## Testing Providers

To test which provider is working:

```typescript
// Test embedding generation
const text = "Hello world";
const embedding = await SemanticSimilarityService.generateEmbedding(text);
console.log(`Embedding dimension: ${embedding.length}`);
```

Check logs to see which provider succeeded.

---

## Troubleshooting

### All providers failing?
1. Check API keys are correct
2. Check internet connection (for cloud providers)
3. Enable local embeddings as ultimate fallback
4. Check rate limits on provider dashboards

### Slow embeddings?
1. Use faster models (e.g., text-embedding-3-small)
2. Enable local embeddings for offline speed
3. Implement caching (save embeddings to DB)

### Inconsistent results?
- Different models produce different embedding dimensions
- Stick to one model in production
- Don't mix embeddings from different models in same poll

---

## Performance Notes

**Embedding Generation Speed:**
- OpenRouter/OpenAI: ~100-500ms per request
- Gemini: ~50-200ms per request
- Local: ~50-1000ms (depends on hardware, CPU-based)

**For batch processing:**
- Process in parallel (max 10-20 concurrent)
- Use batch endpoints if available
- Cache embeddings in database

---

## Migration Path

**Phase 1 (MVP):** Use Gemini (free, easy setup)
**Phase 2:** Add OpenRouter as primary for better availability
**Phase 3:** Add local fallback for offline capability
**Phase 4:** Optimize costs, add caching

You can change providers anytime by updating environment variables!
