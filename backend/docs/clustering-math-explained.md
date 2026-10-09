# How We Group Similar Feedback Together: The Math Explained

## The Problem We're Solving

Imagine you have 100 sticky notes with customer feedback like:
- "App is too slow"
- "Love the new design"
- "Can't log in"
- "Add dark mode please"

Your job is to organize these into groups of similar feedback. But how do you decide what's "similar"? And how many groups should you make?

This document explains the math we use to solve this problem.

---

## Part 1: Turning Words Into Numbers

### The Challenge
Computers don't understand words like we do. To a computer, "App is slow" and "Loading takes forever" look completely different, even though they mean almost the same thing.

### The Solution: Embeddings
We use AI to convert each piece of feedback into a list of numbers called an "embedding." Think of it like giving each feedback a GPS coordinate, but instead of 2 dimensions (latitude, longitude), we use 768 dimensions!

**Example:**
- "App is slow" → [0.12, -0.45, 0.78, 0.23, ...]  (768 numbers)
- "Loading takes forever" → [0.11, -0.44, 0.79, 0.24, ...]  (768 numbers)

Notice how similar meanings get similar numbers!

---

## Part 2: Measuring How Similar Two Feedbacks Are

### Cosine Similarity

Imagine each embedding as an arrow pointing from the origin. Two similar feedbacks will have arrows pointing in almost the same direction.

**The Formula:**

```
                    A · B
Similarity = ─────────────────
              |A| × |B|
```

Where:
- A · B is the "dot product" (multiply matching numbers and add them up)
- |A| is the length of arrow A
- |B| is the length of arrow B

**What the result means:**
- 1.0 = Identical direction (exactly the same meaning)
- 0.0 = Perpendicular (completely unrelated)
- -1.0 = Opposite direction (opposite meanings)

**Real Example:**
- "App crashes" vs "App crashes constantly" → Similarity ≈ 0.95 (very similar)
- "App crashes" vs "Love the design" → Similarity ≈ 0.15 (not similar)

### Converting to Distance

For clustering, we need "distance" (how far apart things are) instead of similarity:

```
Distance = 1 - Similarity
```

So:
- Distance 0 = Identical
- Distance 1 = Completely different

---

## Part 3: Building a Family Tree of Feedback (Hierarchical Clustering)

### The Basic Idea

We start with each feedback as its own group, then repeatedly merge the two most similar groups until everything is in one big group.

### Step-by-Step Process

**Start:** 100 individual feedbacks

**Round 1:** Find the two most similar feedbacks
- "App is slow" and "Loading takes forever" are most similar (distance = 0.05)
- Merge them into Group A
- Now we have 99 groups

**Round 2:** Find the two most similar groups
- Maybe "Can't log in" and "Login broken" merge into Group B
- Now we have 98 groups

**... continue for 99 rounds ...**

**End:** 1 giant group containing everything

### How We Measure Distance Between Groups

When we have groups with multiple items, how do we measure distance?

**Average Linkage (what we use):**
Calculate the average distance between all pairs of items across the two groups.

```
Group A: ["App slow", "Loading forever"]
Group B: ["Very laggy", "Takes ages"]

Distance = Average of:
  - dist("App slow", "Very laggy")
  - dist("App slow", "Takes ages")
  - dist("Loading forever", "Very laggy")
  - dist("Loading forever", "Takes ages")
```

### The Dendrogram (Tree Diagram)

This process creates a tree showing when each merge happened:

```
Height
  |
1.5 ─────────────────┬─────────────────
  |                  │
1.2 ─────────┬───────┴───────┬─────────
  |          │               │
0.8 ────┬────┴────┬────  ────┴────
  |     │         │          │
0.4 ──┬─┴─┬──  ──┬┴┬──    ──┬┴┬──
  |   │   │      │ │        │ │
  0   A   B      C D        E F
```

The "height" tells us how different the merged groups were. Higher merges = less similar.

---

## Part 4: Deciding How Many Groups to Make

This is the hardest part! We developed a method called "Multi-Resolution Gap Analysis."

### The Key Insight

When we look at the heights where merges happen, there are often "gaps" - big jumps that indicate we're merging things that are quite different.

**Example merge heights:** 0.2, 0.25, 0.3, 0.35, **0.8**, 0.85, 0.9

See that jump from 0.35 to 0.8? That's a gap! It suggests those groups were quite different and maybe shouldn't be merged.

### Finding Significant Gaps

**Step 1: Calculate gaps between consecutive merge heights**
```
Heights: 0.2, 0.3, 0.5, 0.55, 1.2
Gaps:      0.1, 0.2, 0.05, 0.65
                          ^^^^
                      Big gap here!
```

**Step 2: Look at how unusual each gap is**

We compare each gap to its neighbors. A gap that's much bigger than nearby gaps is "significant."

```
                    Gap Value
Significance = ─────────────────────
                Local Variation + ε
```

Where ε (epsilon) is a tiny number to prevent division by zero.

### The Adaptive Minimum

For a dataset of size n, we suggest at least this many clusters:

```
Minimum k = max(6, √(n/2))
```

**Examples:**
- 20 items → minimum 6 clusters
- 50 items → minimum 6 clusters
- 100 items → minimum 7 clusters
- 200 items → minimum 10 clusters
- 500 items → minimum 16 clusters

Why? Larger datasets usually have more distinct topics!

### Quality Preview

Before finalizing k, we peek at how good the clustering would be using the "Silhouette Score."

---

## Part 5: Measuring Cluster Quality

### Silhouette Score (-1 to +1)

For each item, we ask:
1. How close is it to other items in its cluster? (call this **a**)
2. How close is it to items in the nearest other cluster? (call this **b**)

```
              b - a
Silhouette = ───────
             max(a, b)
```

**Interpretation:**
- +1 = Perfect! Item is close to its cluster, far from others
- 0 = Item is on the border between clusters
- -1 = Item is probably in the wrong cluster

We average this across all items.

### Davies-Bouldin Index (lower is better)

Measures how much clusters overlap. For each pair of clusters:

```
                 (spread of cluster i) + (spread of cluster j)
Overlap Score = ─────────────────────────────────────────────────
                      distance between cluster centers
```

A good clustering has tight clusters that are far apart → low score.

### Coherence Score (0 to 1)

Within each cluster, we check if all items are consistently similar to each other.

```
                    Minimum similarity in cluster
Coherence Ratio = ────────────────────────────────
                    Maximum similarity in cluster
```

If the ratio is close to 1, all items are equally similar to each other (good!).
If the ratio is low, some items don't fit well (bad!).

---

## Part 6: Two-Phase Clustering (The Safety Net)

Sometimes the first clustering has problems - like one giant cluster with 50+ items mixing different topics.

### Phase 1: Over-Cluster

Start with MORE clusters than we think we need (2x the target).

```
Target: 10 clusters
Phase 1: Create 20 clusters
```

### Phase 2: Carefully Merge

Now we selectively merge the most similar pairs, but we're picky:

**Merge Score = 0.6 × (centroid similarity) + 0.4 × (predicted coherence)**

We only merge if the score is above 0.7 (70% confidence).

This ensures we don't accidentally merge dissimilar groups!

---

## Part 7: Putting It All Together

Here's the complete flow:

```
1. Convert feedback to embeddings (words → numbers)
              ↓
2. Calculate all pairwise distances
              ↓
3. Build dendrogram (hierarchical tree)
              ↓
4. Find gaps and estimate best k
              ↓
5. Cut tree to get k clusters
              ↓
6. Check cluster quality
              ↓
   ┌─── Good quality? ───┐
   ↓                     ↓
  Yes                   No
   ↓                     ↓
 Done!          Run two-phase clustering
                         ↓
                   Better result!
```

---

## Real Example with Numbers

**Input:** 100 customer feedback items

**Step 1:** Generate 100 embeddings (each is 768 numbers)

**Step 2:** Calculate 100 × 100 = 10,000 distances

**Step 3:** Build dendrogram with 99 merges

**Step 4:** Gap analysis suggests k = 10
- Adaptive minimum: √(100/2) = √50 ≈ 7
- Gap significance highest at k = 10
- Quality preview shows silhouette ≈ 0.55

**Step 5:** Cut tree at k = 10, get clusters like:
- Cluster 1: "Performance complaints" (14 items)
- Cluster 2: "Dark mode requests" (4 items)
- Cluster 3: "Login issues" (5 items)
- ... and so on

**Step 6:** Check quality
- Silhouette = 0.20 (acceptable)
- Davies-Bouldin = 1.27 (good - clusters don't overlap much)
- Max cluster size = 14 (reasonable)

**Result:** 17 well-separated clusters with clear themes!

---

## Why This Matters

Good clustering helps us:
1. **Find patterns** - What are customers complaining about most?
2. **Prioritize** - Which issues affect the most people?
3. **Summarize** - Turn 100 comments into 17 actionable categories
4. **Track changes** - Are login complaints increasing over time?

The math ensures we're not just guessing - we're using proven statistical methods to find real patterns in the data.

---

## Key Formulas Summary

| Concept | Formula | What it measures |
|---------|---------|------------------|
| Cosine Similarity | (A·B)/(|A|×|B|) | How similar two embeddings are |
| Distance | 1 - Similarity | How different two embeddings are |
| Suggested Min k | max(6, √(n/2)) | Minimum clusters for dataset size n |
| Silhouette | (b-a)/max(a,b) | How well an item fits its cluster |
| Coherence | min_sim/max_sim | How uniform a cluster is |
| Merge Score | 0.6×similarity + 0.4×coherence | Should we merge two clusters? |

---

## Glossary

- **Embedding**: A list of numbers representing the meaning of text
- **Cosine Similarity**: A way to measure if two arrows point the same direction
- **Dendrogram**: A tree diagram showing how clusters merge
- **Silhouette Score**: How well each item fits in its cluster
- **Coherence**: How consistent the items within a cluster are
- **HAC**: Hierarchical Agglomerative Clustering - building a tree from bottom up
