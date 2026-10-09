# VisInfo Clustering

Groups free-text poll answers into one ranked idea. "dark mode", "dark theme" and "night mode" become a single cluster with a combined count, instead of three small requests.

## How it works

1. **Embed**: each response becomes a vector (768 dimensions with Gemini embeddings). Providers: Gemini, OpenRouter, OpenAI.
2. **Compare**: cosine similarity between vectors.
3. **Cluster**: hierarchical agglomerative clustering (HAC) with average linkage builds a tree of merges. Merge heights suggest how many clusters to cut.
4. **Label**: a chat model names each cluster and returns sentiment, themes and a one-line summary.
5. **Visualise**: the merge tree is rendered as a dendrogram.

The maths is written up in plain language in [`backend/docs/clustering-math-explained.md`](backend/docs/clustering-math-explained.md) and in more detail in [`clustering-math-detailed.md`](backend/docs/clustering-math-detailed.md).

## What is here

| Path | What |
|---|---|
| `backend/src/services/clustering/` | HAC, k-means, adaptive thresholds, cluster-quality metrics, coherence checks, two-phase clustering, dendrogram visualiser |
| `backend/src/ai/` | Provider layer (Gemini, OpenRouter, OpenAI), embedding and labeling services, rate limiter and retry |
| `backend/src/services/ai/` | Classification, semantic-similarity and clustering services |
| `backend/src/models`, `repositories` | Poll, response and hierarchy models |
| `frontend/lib/` | Flutter screens: create poll, poll settings, submit response, results |
| `docs/` | Product and architecture notes |

## Status

This is a working prototype, not a finished product.

- **Working and tested:** the HAC clustering core (`hacCluster`), typechecked with `tsc --noEmit`, with an offline unit test.
- **Not finished:** the Express routes and controllers are commented-out scaffolding (excluded from the build), and `cluster()` in `clustering/index.ts` is a stub. Call `hacCluster` directly.
- **Not verified here:** live calls to the AI providers. You need your own API keys.
- **Flutter:** only `lib/` is included. Run `flutter create .` inside `frontend/` to generate the platform folders.

## Run

```bash
cd backend
cp .env.example .env     # add your own API keys; never commit .env
npm install
npx tsc --noEmit         # typecheck
npm test                 # offline HAC test
```

## License

MIT, see [LICENSE](LICENSE).
