# Hierarchical Classification Architecture

## Overview

The hierarchical classification system is VisInfo's core innovation: it organizes free-form responses into explorable trees where nothing is lost, and stakeholders can drill down from high-level summaries to raw individual responses.

## Core Principle: Organize, Don't Discard

Traditional text analysis forces a choice:
- **Quantitative**: Count categories, lose nuance
- **Qualitative**: Keep nuance, lose scalability

**VisInfo does both:** Build quantitative structure while preserving qualitative depth.

## The Tree Structure

### Conceptual Model

```
Root (All Responses)
├── Category 1 (Major Theme)
│   ├── Subcategory 1.1
│   │   ├── Cluster 1.1.1 (Similar responses)
│   │   │   ├── Individual Response 1
│   │   │   ├── Individual Response 2
│   │   │   └── Individual Response 3
│   │   └── Cluster 1.1.2
│   └── Subcategory 1.2
├── Category 2
└── Category 3
```

### Data Structure

```dart
class ResponseNode {
  String id;
  NodeType type; // ROOT, CATEGORY, SUBCATEGORY, CLUSTER, RESPONSE
  String label;
  int voteCount;
  double confidence; // 0.0-1.0
  List<ResponseNode> children;
  String? originalText; // Only for leaf nodes
  DateTime? timestamp;
  Map<String, dynamic>? metadata;
}

enum NodeType {
  ROOT,        // Top of tree (all responses)
  CATEGORY,    // Major theme (e.g., "Performance Issues")
  SUBCATEGORY, // Theme subdivision (e.g., "Loading Speed")
  CLUSTER,     // Similar responses (e.g., "Slow Startup")
  RESPONSE     // Individual raw response
}
```

## Building the Hierarchy: The Algorithm

### Phase 1: Response Collection

```
Input: List of raw text responses
Output: List of preprocessed responses

1. Collect all responses
2. Preprocess each:
   - Normalize whitespace
   - Fix common typos (optional)
   - Detect language
   - Tag metadata (timestamp, user segment, etc.)
```

### Phase 2: Embedding Generation

```
Input: Preprocessed responses
Output: Vector embeddings for each response

For each response:
  1. Generate semantic embedding using LLM/embedding model
     - e.g., OpenAI embeddings, sentence-transformers
  2. Store: {response_id, text, embedding_vector}
```

### Phase 3: Initial Clustering (Clusters)

```
Input: Response embeddings
Output: Groups of similar responses (clusters)

Algorithm: Hierarchical Agglomerative Clustering (HAC)

1. Calculate pairwise cosine similarity between all embeddings
2. Group responses with similarity > threshold (e.g., 0.85)
3. Create CLUSTER nodes
4. Each cluster gets representative label from:
   - Most common response
   - LLM-generated summary of cluster
   - Most central response (highest avg similarity to others)
5. Calculate confidence: avg similarity within cluster

Example:
Cluster: "Slow Startup" (confidence: 0.91)
  - "app takes forever to load"
  - "slow startup time"
  - "launches too slow"
```

### Phase 4: Subcategory Formation

```
Input: Clusters
Output: Subcategories grouping related clusters

Algorithm: Second-level clustering

1. Generate embeddings for cluster labels
2. Cluster the clusters (lower threshold, e.g., 0.75)
3. Create SUBCATEGORY nodes

Example:
Subcategory: "Loading Speed" (confidence: 0.86)
  ├── Cluster: "Slow Startup" (31 responses)
  ├── Cluster: "Page Transitions" (22 responses)
  └── Cluster: "Image Loading" (15 responses)
```

### Phase 5: Category Formation

```
Input: Subcategories
Output: Top-level categories

Algorithm: Theme extraction

1. Analyze subcategory labels
2. Use LLM to identify major themes
3. Create CATEGORY nodes

Example:
Category: "Performance Issues" (confidence: 0.82)
  ├── Subcategory: "Loading Speed" (68 responses)
  ├── Subcategory: "Crashes" (35 responses)
  └── Subcategory: "Battery Drain" (24 responses)
```

### Phase 6: Outlier Handling

```
Input: Responses that didn't cluster well
Output: "Other" categories or flagged for review

1. Identify responses with low similarity to all clusters
2. Options:
   a) Group as "Other/Miscellaneous"
   b) Create singleton clusters
   c) Flag for human review
3. Calculate confidence (low for outliers)
```

## Example: Full Tree Construction

### Input Responses (Simplified)

```
1. "app takes forever to load"
2. "slow startup"
3. "crashes on my Samsung"
4. "dark mode please"
5. "want dark theme"
6. "app crashes constantly"
7. "loading is so slow"
8. "need night mode"
9. "battery drains fast"
10. "battery dies quickly"
```

### Step-by-Step Construction

#### After Phase 3 (Clusters)

```
Cluster A: "Slow Loading" (confidence: 0.92)
  - "app takes forever to load" (#1)
  - "slow startup" (#2)
  - "loading is so slow" (#7)

Cluster B: "App Crashes" (confidence: 0.89)
  - "crashes on my Samsung" (#3)
  - "app crashes constantly" (#6)

Cluster C: "Dark Mode" (confidence: 0.94)
  - "dark mode please" (#4)
  - "want dark theme" (#5)
  - "need night mode" (#8)

Cluster D: "Battery Drain" (confidence: 0.91)
  - "battery drains fast" (#9)
  - "battery dies quickly" (#10)
```

#### After Phase 4 (Subcategories)

```
Subcategory: "Loading Performance" (confidence: 0.88)
  └── Cluster A: "Slow Loading" (3 responses)

Subcategory: "Stability" (confidence: 0.87)
  └── Cluster B: "App Crashes" (2 responses)

Subcategory: "UI Theming" (confidence: 0.90)
  └── Cluster C: "Dark Mode" (3 responses)

Subcategory: "Battery Usage" (confidence: 0.89)
  └── Cluster D: "Battery Drain" (2 responses)
```

#### After Phase 5 (Categories)

```
Category: "Performance Issues" (confidence: 0.85)
  ├── Subcategory: "Loading Performance" (3 responses)
  │   └── Cluster: "Slow Loading"
  │       ├── "app takes forever to load"
  │       ├── "slow startup"
  │       └── "loading is so slow"
  ├── Subcategory: "Stability" (2 responses)
  │   └── Cluster: "App Crashes"
  │       ├── "crashes on my Samsung"
  │       └── "app crashes constantly"
  └── Subcategory: "Battery Usage" (2 responses)
      └── Cluster: "Battery Drain"
          ├── "battery drains fast"
          └── "battery dies quickly"

Category: "UI Improvements" (confidence: 0.90)
  └── Subcategory: "UI Theming" (3 responses)
      └── Cluster: "Dark Mode"
          ├── "dark mode please"
          ├── "want dark theme"
          └── "need night mode"
```

## Handling Edge Cases

### Case 1: Very Similar Responses

**Problem:** "dark mode" appears 100 times verbatim

**Solution:**
```
Cluster: "Dark Mode" (100 responses)
  - Group exact duplicates
  - Show count: "dark mode" (100)
  - Confidence: 1.0 (perfect match)
```

### Case 2: Negation/Contradiction

**Problem:** "I love dark mode" vs "I hate dark mode"

**Solution:**
```
Use sentiment analysis first:
  Cluster A: "Positive about Dark Mode"
    - "I love dark mode"
  Cluster B: "Negative about Dark Mode"
    - "I hate dark mode"

Or separate by sentiment dimension:
  Dark Mode
    ├── Positive (75%)
    └── Negative (25%)
```

### Case 3: Multi-topic Responses

**Problem:** "I want dark mode and better search"

**Solution:**
```
Option A: Split response (advanced)
  - Create two response nodes
  - Link to same original submission

Option B: Assign to primary topic
  - Use LLM to identify main topic
  - Flag as multi-topic
  - Show in primary category with note

Option C: Create multi-topic cluster
  - "Dark Mode + Search" becomes its own cluster
```

### Case 4: Ambiguous Responses

**Problem:** "Make it faster"

**Solution:**
```
Low confidence assignment:
  Cluster: "Speed/Performance (General)" (confidence: 0.45)
    - "Make it faster"

Flag for human review:
  ⚠️ Ambiguous - could mean:
    - Loading speed
    - Search speed
    - Animation speed

Allow creator to reassign or create "Unclear Requests" category
```

### Case 5: Device/Context-Specific

**Problem:** "Crashes on Samsung Galaxy S21 Android 13"

**Solution:**
```
Hierarchical metadata:
  Category: Performance
    Subcategory: Crashes
      Cluster: Android Crashes
        Response: "Crashes on Samsung..."
          Metadata:
            - Device: Samsung Galaxy S21
            - OS: Android 13

Enable filtering: "Show only Samsung-related issues"
```

## Confidence Scoring System

### Confidence Calculation at Each Level

#### Cluster Confidence

```
confidence = average_similarity_within_cluster

Example:
Cluster with 3 responses:
  sim(R1, R2) = 0.92
  sim(R1, R3) = 0.88
  sim(R2, R3) = 0.90

confidence = (0.92 + 0.88 + 0.90) / 3 = 0.90
```

#### Subcategory Confidence

```
confidence = average_cluster_confidence * cluster_cohesion

cluster_cohesion = similarity between cluster centroids

Example:
Subcategory with 2 clusters:
  Cluster A confidence: 0.90
  Cluster B confidence: 0.88
  Cohesion (A, B): 0.82

confidence = ((0.90 + 0.88) / 2) * 0.82 = 0.73
```

#### Category Confidence

```
confidence = average_subcategory_confidence * subcategory_cohesion
```

### Confidence Thresholds

```
High Confidence:   0.80 - 1.00  ✓ (Green)
Medium Confidence: 0.60 - 0.79  ⚠️ (Yellow)
Low Confidence:    0.00 - 0.59  ❌ (Red - flag for review)
```

## Dynamic Tree Updates

### Adding Responses in Real-Time

```
When new response arrives:

1. Generate embedding
2. Calculate similarity to existing clusters
3. If similarity > threshold:
   - Add to existing cluster
   - Update cluster centroid
   - Recalculate confidence
4. If similarity < threshold:
   - Create new singleton cluster
   - Check if it forms new subcategory
   - Rebalance tree if needed
5. Update vote counts up the tree
```

### Tree Rebalancing

```
Trigger: When confidence drops or imbalance occurs

Rules:
- If cluster grows > 50 responses: Consider splitting
- If cluster confidence drops < 0.60: Review for mixed topics
- If subcategory has 1 cluster: Collapse level
- If category has 1 subcategory: Collapse level

Example:
Before:
  Performance (127)
    └── Speed (127)
        └── Slow (127)

After rebalancing:
  Performance (127)
    └── Slow (127) [collapsed redundant levels]
```

## Visualization Requirements

### Interactive Tree UI

```
Level 1: Collapsed View
[+] Performance Issues (127) ━━━━━━━━ 15%
[+] UI Improvements (90) ━━━━━━ 11%
[+] Feature Requests (234) ━━━━━━━━━━━━ 28%

Level 2: Expanded Category
[-] Performance Issues (127) ✓ 0.82
  [+] Loading Speed (68)
  [+] Crashes (35)
  [+] Battery Drain (24)

Level 3: Expanded Subcategory
[-] Loading Speed (68) ✓ 0.86
  [+] Slow Startup (31)
  [+] Page Transitions (22)
  [+] Image Loading (15)

Level 4: Expanded Cluster
[-] Slow Startup (31) ✓ 0.91
  💬 "app takes forever to load" (12) [click to expand]
  💬 "slow startup time" (9)
  💬 "launches too slow" (7)
  💬 "opening the app is sluggish" (3)

Level 5: Individual Responses
💬 "app takes forever to load" (12 similar responses)
  1. "app takes forever to load"
  2. "takes too long to open"
  3. "forever to start up"
  ...
```

### Visual Indicators

```
✓ High confidence (green checkmark)
⚠️ Medium confidence (yellow warning)
❌ Low confidence (red flag - needs review)
🔍 Outlier (magnifying glass - unique response)
📊 Progress bars showing relative sizes
🏷️ Tags for metadata (device, segment, etc.)
```

## Export Formats

### Export at Any Level

```
User can export:
1. Entire tree (all levels)
2. From specific node down
3. Specific depth (e.g., "only top 2 levels")
4. Raw data only
5. Summary only

Formats:
- JSON (structured tree)
- CSV (flattened)
- Excel (hierarchical with sheets)
- PDF (visual report)
```

### Example JSON Export

```json
{
  "poll_id": "poll_123",
  "question": "What feature would improve the app?",
  "total_responses": 847,
  "generated_at": "2025-01-15T10:30:00Z",
  "tree": {
    "type": "ROOT",
    "children": [
      {
        "type": "CATEGORY",
        "label": "Performance Issues",
        "vote_count": 127,
        "confidence": 0.82,
        "children": [
          {
            "type": "SUBCATEGORY",
            "label": "Loading Speed",
            "vote_count": 68,
            "confidence": 0.86,
            "children": [
              {
                "type": "CLUSTER",
                "label": "Slow Startup",
                "vote_count": 31,
                "confidence": 0.91,
                "children": [
                  {
                    "type": "RESPONSE",
                    "text": "app takes forever to load",
                    "timestamp": "2025-01-10T14:22:00Z",
                    "similar_count": 12
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Performance Considerations

### Scalability

**For 1,000 responses:**
- Embedding generation: ~10-30 seconds (parallel processing)
- Clustering: ~1-5 seconds
- Tree building: <1 second
- Total: ~1 minute

**For 10,000 responses:**
- Embedding generation: ~2-5 minutes (parallel)
- Clustering: ~10-30 seconds (optimized algorithms)
- Tree building: ~5 seconds
- Total: ~5-7 minutes

### Optimization Strategies

1. **Incremental Updates**: Don't rebuild entire tree for each response
2. **Caching**: Cache embeddings and similarity calculations
3. **Parallel Processing**: Generate embeddings in batches
4. **Sampling for Preview**: Show partial tree while processing completes
5. **Lazy Loading**: Build deeper levels on-demand when user expands

## Human-in-the-Loop (Future)

### Manual Adjustments

Allow creators to:
1. **Merge clusters**: Combine incorrectly separated responses
2. **Split clusters**: Separate incorrectly grouped responses
3. **Reassign responses**: Move individual responses between clusters
4. **Rename categories**: Use domain-specific terminology
5. **Adjust hierarchy**: Promote/demote subcategories

### Learning from Adjustments

```
When creator manually merges two clusters:
  → Learn that these topics should group together
  → Apply to future similar polls
  → Improve AI model over time
```

## Validation & Quality Metrics

### Tree Quality Metrics

```
1. Balance Score: How evenly distributed are categories?
   - Ideal: No category dominates (>50%)

2. Depth Appropriateness: Is hierarchy at right depth?
   - Too shallow: Everything at top level
   - Too deep: Over-fragmented
   - Ideal: 3-4 levels

3. Cluster Purity: Are clusters internally consistent?
   - Measure: Average within-cluster similarity
   - Ideal: >0.80

4. Separation: Are categories distinct from each other?
   - Measure: Between-category similarity
   - Ideal: <0.60

5. Outlier Rate: How many responses don't fit?
   - Ideal: <5%
```

### Example Quality Report

```
Tree Quality Report

✓ Balance: 7/10 (Good)
  - Largest category: 28% (acceptable)
  - Smallest category: 5% (acceptable)

✓ Depth: 8/10 (Good)
  - Average depth: 3.2 levels (ideal)
  - Max depth: 4 levels (acceptable)

✓ Cluster Purity: 9/10 (Excellent)
  - Average confidence: 0.87 (high)
  - Low confidence clusters: 2%

⚠️ Separation: 6/10 (Fair)
  - Some category overlap detected
  - Consider merging: "UI Issues" and "Design Problems"

✓ Outlier Rate: 9/10 (Excellent)
  - Outliers: 2.1% (very good)
  - Flagged for review: 5 responses
```

## Conclusion

The hierarchical classification system is what makes VisInfo's approach viable:

1. **Preserves all data**: Every response traceable to root
2. **Scales analysis**: Serves executives and engineers from same tree
3. **Maintains trust**: Full transparency through drill-down
4. **Stays flexible**: Export and explore at any level
5. **Enables learning**: Human adjustments improve future processing

This isn't just grouping responses - it's building **explorable knowledge structures** from unstructured text.
