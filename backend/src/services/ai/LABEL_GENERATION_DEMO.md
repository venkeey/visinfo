# Label Generation Strategies Demo

This document demonstrates how the hybrid label generation works in ClassificationService.

## 🎯 Hybrid Approach Flow

```
1. Try AI Generation (if available & cluster has 3+ responses)
   ↓ (if fails or unavailable)
2. Try TF-IDF Keyword Extraction (if 2+ keywords found)
   ↓ (if fails)
3. Fallback to Shortest Text
```

---

## Example 1: Performance Issues Cluster

### Input Responses:
```typescript
texts = [
  "App is way too slow when loading",
  "Terrible performance issues",
  "The application performance is really bad",
  "Slow loading times",
  "Takes forever to load pages",
  "Performance needs major improvement"
];
```

### Strategy 1: AI Generation ✅

**Prompt sent to LLM:**
```
You are analyzing user feedback responses that have been grouped together by similarity.

Generate a short, descriptive category name (2-4 words) that summarizes these responses:

1. "App is way too slow when loading"
2. "Terrible performance issues"
3. "The application performance is really bad"
4. "Slow loading times"
5. "Takes forever to load pages"
6. "Performance needs major improvement"

Requirements:
- Must be 2-4 words only
- Should capture the main theme/topic
- Use title case (e.g., "Performance Issues", "Feature Requests")
- Do NOT include quotes, prefixes like "Category:", or explanations

Category name:
```

**AI Response:**
```
Performance Issues
```

**Result:** ✅ `"Performance Issues"`

---

### Strategy 2: TF-IDF Keywords (Fallback if AI fails)

**Word Frequency Analysis:**
```
Word Counts:
- performance: 3 occurrences
- slow: 2 occurrences
- loading: 2 occurrences
- app/application: 2 occurrences
- bad: 1 occurrence
- issues: 1 occurrence
...
(stop words like 'is', 'the', 'way', 'too' are filtered out)
```

**TF-IDF Scores:**
```
1. "performance" → TF-IDF: 0.89 (high frequency, appears in 50% of texts)
2. "slow" → TF-IDF: 0.62 (medium frequency, appears in 33% of texts)
3. "loading" → TF-IDF: 0.62 (medium frequency, appears in 33% of texts)
4. "issues" → TF-IDF: 0.45 (low frequency, unique word)
```

**Top 3 Keywords:** `["performance", "slow", "loading"]`

**Result:** ✅ `"Performance Slow Loading"`

---

## Example 2: Feature Request Cluster

### Input Responses:
```typescript
texts = [
  "Please add dark mode",
  "Dark theme would be great",
  "Night mode feature needed",
  "Dark theme please"
];
```

### Strategy 1: AI Generation ✅

**AI Response:**
```
Dark Mode Request
```

**Result:** ✅ `"Dark Mode Request"`

---

### Strategy 2: TF-IDF Keywords (Fallback)

**Word Analysis:**
```
- dark: 3 occurrences → TF-IDF: 0.82
- mode/theme: 4 occurrences → TF-IDF: 0.95
- please: 2 occurrences → TF-IDF: 0.15 (common word, lower score)
```

**Top Keywords:** `["theme", "dark", "mode"]`

**Result:** ✅ `"Theme Dark Mode"`

---

## Example 3: Small Cluster (< 3 responses)

### Input Responses:
```typescript
texts = [
  "Fix the login bug",
  "Login is broken"
];
```

### Strategy 1: AI Generation ❌ SKIPPED
**Reason:** Only 2 responses (need 3+ for AI)

### Strategy 2: TF-IDF Keywords ✅

**Word Analysis:**
```
- login: 2 occurrences → TF-IDF: 0.69
- bug/broken/fix: 1 occurrence each → TF-IDF: 0.35
```

**Top Keywords:** `["login", "bug"]`

**Result:** ✅ `"Login Bug"`

---

## Example 4: Diverse/Unclear Cluster

### Input Responses:
```typescript
texts = [
  "Random issue",
  "Something's wrong",
  "Not working"
];
```

### Strategy 1: AI Generation ⚠️

**AI Response:**
```
General Issues
```

**Result:** ✅ `"General Issues"`

---

### Strategy 2: TF-IDF Keywords ❌

**Word Analysis:**
```
All words appear only once, no clear pattern
- random: TF-IDF: 0.23
- issue: TF-IDF: 0.23
- something: TF-IDF: 0.15
- wrong: TF-IDF: 0.23
- working: TF-IDF: 0.23
```

**Result:** ❌ Not enough significant keywords (all scores too low)

### Strategy 3: Fallback ✅

**Shortest Text:** `"Not working"` (11 chars)

**Result:** ✅ `"Not working"`

---

## Code Flow Visualization

```typescript
// Example execution trace

generateLabelFromTexts([
  "App is slow",
  "Slow performance",
  "Performance bad"
], "cluster-0")

↓

// Try AI (texts.length >= 3 ✅)
if (semanticService && texts.length >= 3) {
  aiLabel = await generateAILabel(texts)
  // → "Performance Issues" ✅
  return "Performance Issues"
}

// If AI failed, try TF-IDF...
// (not reached in this case)

// If TF-IDF failed, use shortest...
// (not reached in this case)
```

---

## TF-IDF Algorithm Explained

### What is TF-IDF?

**TF (Term Frequency):** How often a word appears
```
TF(word) = (count of word in cluster) / (total words in cluster)
```

**IDF (Inverse Document Frequency):** How unique/important a word is
```
IDF(word) = log(total texts / texts containing word)
```

**TF-IDF Score:** Combined importance
```
TF-IDF = TF × IDF
```

### Example Calculation:

```typescript
Cluster: ["App is slow", "Slow app", "Performance is bad"]

Word: "slow"
- Appears 2 times
- Appears in 2 out of 3 texts

TF = 2 / 3 = 0.67
IDF = log(3 / 2) = 0.176
TF-IDF = 0.67 × 0.176 = 0.118

Word: "performance"
- Appears 1 time
- Appears in 1 out of 3 texts (more unique!)

TF = 1 / 3 = 0.33
IDF = log(3 / 1) = 0.477
TF-IDF = 0.33 × 0.477 = 0.157 ← HIGHER SCORE (more distinctive)
```

---

## Integration with SemanticSimilarityService

For AI label generation to work, the SemanticSimilarityService needs a `generateLabel()` method:

```typescript
// In SemanticSimilarityService.ts

class SemanticSimilarityService {
  /**
   * Generate text completion using LLM
   * Used for label generation
   */
  async generateLabel(prompt: string): Promise<string> {
    // Call OpenRouter/Gemini/OpenAI
    const response = await this.callLLM(prompt, {
      maxTokens: 20,
      temperature: 0.3,  // Low temperature for consistent categorization
      model: 'gpt-3.5-turbo' // Or your preferred model
    });

    return response.trim();
  }

  private async callLLM(prompt: string, options: any): Promise<string> {
    // Your LLM API integration here
    // Example with OpenRouter:
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens,
        temperature: options.temperature
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

---

## Testing the Label Generation

```typescript
import ClassificationService from './ClassificationService';

// Mock some cluster data
const clusterTexts = [
  "App crashes on startup",
  "Crash when opening",
  "Application keeps crashing",
  "Startup crash bug"
];

// Test label generation
const label = await ClassificationService['generateLabelFromTexts'](
  clusterTexts,
  'cluster-1'
);

console.log(`Generated label: "${label}"`);

// Expected output (with AI):
// [Classification] AI-generated label for cluster-1: "Startup Crashes"

// Expected output (without AI, using TF-IDF):
// [Classification] TF-IDF label for cluster-1: "Crash Startup Application"

// Expected output (fallback):
// [Classification] Fallback label for cluster-1: "Crash when opening"
```

---

## Performance Comparison

| Strategy | Speed | Quality | Cost | Reliability |
|----------|-------|---------|------|-------------|
| **AI Generation** | 🐌 1-3s | ⭐⭐⭐⭐⭐ | 💰💰💰 | ⚠️ Depends on API |
| **TF-IDF** | ⚡ <10ms | ⭐⭐⭐ | Free | ✅ Always works |
| **Shortest Text** | ⚡ <1ms | ⭐⭐ | Free | ✅ Always works |

---

## Logs Example

When classification runs, you'll see:

```
[Classification] Processing 50 responses for poll poll-abc123
[Classification] Generated 50 embeddings
[Classification] Created 8 clusters

[Classification] AI-generated label for cluster-0: "Performance Issues"
[Classification] AI-generated label for cluster-1: "Dark Mode Request"
[Classification] TF-IDF label for cluster-2: "Login Bug" (AI unavailable)
[Classification] AI-generated label for cluster-3: "Feature Suggestions"
[Classification] TF-IDF label for cluster-4: "Crash Startup"
[Classification] Fallback label for cluster-5: "Random feedback"
[Classification] Cluster cluster-outliers already has label: "Other"

[Classification] Completed in 4523ms
```

---

## Next Steps

1. ✅ AI label generation implemented
2. ✅ TF-IDF keyword extraction implemented
3. ⏳ Implement SemanticSimilarityService.generateLabel()
4. ⏳ Test with real poll data
5. ⏳ Fine-tune TF-IDF stop words for your domain
6. ⏳ Add caching for AI-generated labels
