/**
 * Multi-Resolution Gap Analysis for Optimal K Selection
 *
 * PURPOSE: Replace single-gap detection with multi-scale analysis that:
 * 1. Computes gaps at multiple smoothing scales
 * 2. Weights gaps by local variance (significance)
 * 3. Optionally incorporates quality preview via silhouette sampling
 *
 * DEPENDENCIES: statistics.ts
 * STATUS: Implemented
 */

import { median, mean, standardDeviation, randomSampleIndices } from './statistics';

// ============ Types ============

/**
 * A candidate k value with associated scoring metrics
 */
export interface GapCandidate {
  /** Number of clusters at this cut point */
  k: number;
  /** Raw gap value at this position */
  gapValue: number;
  /** Index in merge sequence */
  gapIndex: number;
  /** Variance in neighborhood around this gap */
  localVariance: number;
  /** Gap significance = gapValue / (localVariance + epsilon) */
  significance: number;
  /** Optional estimated silhouette at this k */
  qualityPreview?: number;
  /** Final weighted score combining significance and quality */
  score: number;
}

/**
 * Options for multi-resolution gap analysis
 */
export interface MultiResolutionGapOptions {
  /** Minimum clusters to consider (default: 2) */
  minK?: number;
  /** Maximum clusters to consider (default: n-1) */
  maxK?: number;
  /** Window size for local variance calculation (default: 3) */
  neighborhoodSize?: number;
  /** Smoothing scales - moving average window sizes (default: [1, 2, 4]) */
  smoothingLevels?: number[];
  /** Small constant for numerical stability (default: 1e-6) */
  epsilon?: number;
  /** Weight for quality preview in final score (default: 0.5) */
  qualityWeight?: number;
  /** Whether to compute quality preview via silhouette sampling (default: true) */
  enableQualityPreview?: boolean;
  /** Sample size for quality preview (default: 20% of n, min 10, max 50) */
  qualitySampleSize?: number;
  /** Adaptive minimum k based on dataset size (default: true) */
  adaptiveMinK?: boolean;
  /** Penalty for k values below adaptive minimum (default: 0.5) */
  lowKPenalty?: number;
}

/**
 * Result of multi-resolution gap analysis
 */
export interface MultiResolutionAnalysis {
  /** Selected optimal k */
  optimalK: number;
  /** All scored candidates sorted by score descending */
  candidates: GapCandidate[];
  /** Raw merge heights from dendrogram */
  heights: number[];
  /** Raw gaps between consecutive heights */
  rawGaps: number[];
  /** Smoothed gaps at each level: Map<smoothingLevel, gaps[]> */
  smoothedGaps: Map<number, number[]>;
  /** The selected candidate with full details */
  selectedCandidate: GapCandidate;
  /** Debug info about the analysis */
  debug?: {
    numMerges: number;
    smoothingLevels: number[];
    qualityPreviewEnabled: boolean;
    suggestedMinK?: number;
    adaptiveMinKEnabled?: boolean;
  };
}

// ============ Helper Functions ============

/**
 * Extract merge heights from dendrogram tree (sorted ascending)
 */
export function extractMergeHeights(tree: any): number[] {
  const merges: { height: number; size: number }[] = [];

  function collectMerges(node: any) {
    if (!node.isLeaf && node.height !== undefined) {
      merges.push({ height: node.height, size: node.size || 0 });
      if (node.children) {
        node.children.forEach((child: any) => collectMerges(child));
      }
    }
  }

  collectMerges(tree);

  // Sort by height ascending (merge sequence from bottom to top)
  merges.sort((a, b) => a.height - b.height);
  return merges.map((m) => m.height);
}

/**
 * Compute gaps between consecutive merge heights
 */
export function computeGaps(heights: number[]): number[] {
  if (heights.length < 2) return [];

  const gaps: number[] = [];
  for (let i = 1; i < heights.length; i++) {
    gaps.push(heights[i] - heights[i - 1]);
  }
  return gaps;
}

/**
 * Apply moving average smoothing to gaps
 *
 * @param gaps - Array of gap values
 * @param windowSize - Size of smoothing window (1 = no smoothing)
 * @returns Smoothed gaps array
 */
export function smoothGaps(gaps: number[], windowSize: number): number[] {
  if (windowSize <= 1 || gaps.length === 0) return [...gaps];

  const smoothed: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < gaps.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(gaps.length - 1, i + halfWindow);
    let sum = 0;
    let count = 0;

    for (let j = start; j <= end; j++) {
      sum += gaps[j];
      count++;
    }

    smoothed.push(sum / count);
  }

  return smoothed;
}

/**
 * Compute local variance around a gap index
 *
 * @param gaps - Array of gap values
 * @param index - Center index
 * @param neighborhoodSize - Number of neighbors on each side
 * @returns Local variance
 */
export function computeLocalVariance(gaps: number[], index: number, neighborhoodSize: number): number {
  if (gaps.length === 0) return 0;

  const start = Math.max(0, index - neighborhoodSize);
  const end = Math.min(gaps.length - 1, index + neighborhoodSize);

  const neighborhood: number[] = [];
  for (let i = start; i <= end; i++) {
    neighborhood.push(gaps[i]);
  }

  if (neighborhood.length < 2) return 0;

  // Use sample variance
  const avg = mean(neighborhood);
  const squaredDiffs = neighborhood.map((v) => Math.pow(v - avg, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / (neighborhood.length - 1);
}

/**
 * Compute significance of a gap relative to local variance
 */
export function computeGapSignificance(gapValue: number, localVariance: number, epsilon: number): number {
  return gapValue / (Math.sqrt(localVariance) + epsilon);
}

/**
 * Cut tree at k clusters and return labels
 * Simplified version that traverses tree to find cut points
 */
function cutTreeAtK(tree: any, n: number, k: number): number[] {
  if (k >= n) {
    // Each point is its own cluster
    return Array.from({ length: n }, (_, i) => i);
  }

  if (k <= 1) {
    // All points in one cluster
    return new Array(n).fill(0);
  }

  // Collect all internal nodes with their heights
  const nodes: { node: any; height: number }[] = [];

  function collectNodes(node: any) {
    if (!node.isLeaf) {
      nodes.push({ node, height: node.height });
      if (node.children) {
        node.children.forEach((child: any) => collectNodes(child));
      }
    }
  }

  collectNodes(tree);

  // Sort by height descending - highest merges first
  nodes.sort((a, b) => b.height - a.height);

  // Find the cut height: we need k clusters, which means cutting before (n-k) merges
  // The top (k-1) merges should be "cut" to leave k subtrees
  const cutHeight = k <= nodes.length ? nodes[k - 1].height : 0;

  // Assign cluster labels by traversing tree
  const labels = new Array(n).fill(-1);
  let clusterId = 0;

  function assignLabels(node: any, currentCluster: number) {
    if (node.isLeaf) {
      labels[node.index] = currentCluster;
    } else if (node.height <= cutHeight) {
      // This subtree is a single cluster
      if (node.children) {
        node.children.forEach((child: any) => assignLabels(child, currentCluster));
      }
    } else {
      // Cut here - each child becomes separate cluster
      if (node.children) {
        node.children.forEach((child: any) => {
          assignLabels(child, clusterId);
          if (!child.isLeaf && child.height > cutHeight) {
            // Don't increment for internal nodes above cut
          } else {
            clusterId++;
          }
        });
      }
    }
  }

  // Start from root
  assignLabels(tree, clusterId);

  // Renumber clusters to be contiguous from 0
  const uniqueLabels = [...new Set(labels.filter((l) => l >= 0))];
  const labelMap = new Map<number, number>();
  uniqueLabels.forEach((label, idx) => labelMap.set(label, idx));

  return labels.map((l) => (l >= 0 ? labelMap.get(l) ?? 0 : 0));
}

/**
 * Quick silhouette estimate using sampling
 * Much faster than full silhouette computation
 *
 * @param distanceMatrix - Pre-computed distance matrix
 * @param labels - Cluster assignments
 * @param sampleSize - Number of points to sample
 * @returns Estimated silhouette score
 */
export function estimateSilhouetteAtK(
  distanceMatrix: number[][],
  labels: number[],
  sampleSize?: number
): number {
  const n = labels.length;
  const numClusters = Math.max(...labels) + 1;

  if (numClusters <= 1 || n < 3) return 0;

  // Determine sample size
  const effectiveSampleSize = sampleSize ?? Math.max(10, Math.min(Math.floor(n * 0.2), 50));
  const sampleIndices = randomSampleIndices(n, Math.min(effectiveSampleSize, n));

  let silhouetteSum = 0;
  let validCount = 0;

  for (const i of sampleIndices) {
    const clusterI = labels[i];

    // Calculate a(i): average distance to points in same cluster
    let sameClusterSum = 0;
    let sameClusterCount = 0;

    for (let j = 0; j < n; j++) {
      if (i !== j && labels[j] === clusterI) {
        sameClusterSum += distanceMatrix[i][j];
        sameClusterCount++;
      }
    }

    if (sameClusterCount === 0) continue; // Skip singleton clusters

    const a_i = sameClusterSum / sameClusterCount;

    // Calculate b(i): minimum average distance to other clusters
    let b_i = Infinity;

    for (let k = 0; k < numClusters; k++) {
      if (k === clusterI) continue;

      let otherClusterSum = 0;
      let otherClusterCount = 0;

      for (let j = 0; j < n; j++) {
        if (labels[j] === k) {
          otherClusterSum += distanceMatrix[i][j];
          otherClusterCount++;
        }
      }

      if (otherClusterCount > 0) {
        const avgDist = otherClusterSum / otherClusterCount;
        if (avgDist < b_i) {
          b_i = avgDist;
        }
      }
    }

    if (b_i === Infinity) continue;

    // Silhouette for point i
    const s_i = (b_i - a_i) / Math.max(a_i, b_i);
    silhouetteSum += s_i;
    validCount++;
  }

  return validCount > 0 ? silhouetteSum / validCount : 0;
}

// ============ Main Function ============

/**
 * Perform multi-resolution gap analysis to find optimal k
 *
 * This improves on single-gap detection by:
 * 1. Analyzing gaps at multiple smoothing scales
 * 2. Weighting by local variance (statistical significance)
 * 3. Optionally incorporating quality preview via silhouette sampling
 *
 * @param tree - Dendrogram tree from HAC (ml-hclust output)
 * @param distanceMatrix - Pre-computed distance matrix
 * @param options - Configuration options
 * @returns Analysis result with optimal k and all candidates
 */
export function multiResolutionGapAnalysis(
  tree: any,
  distanceMatrix: number[][],
  options: MultiResolutionGapOptions = {}
): MultiResolutionAnalysis {
  const {
    minK = 2,
    maxK: userMaxK,
    neighborhoodSize = 3,
    smoothingLevels = [1, 2, 4],
    epsilon = 1e-6,
    qualityWeight = 0.5,
    enableQualityPreview = true,
    qualitySampleSize,
    adaptiveMinK = true,
    lowKPenalty = 0.5,
  } = options;

  // Step 1: Extract merge heights from dendrogram
  const heights = extractMergeHeights(tree);
  const numMerges = heights.length;
  const n = numMerges + 1; // Number of original points
  const maxK = userMaxK ?? n - 1;

  // Step 1.5: Compute adaptive minimum k based on dataset size
  // For diverse user feedback, we want more clusters for larger datasets
  // Rule: suggestedMinK = max(6, sqrt(n/2)) for datasets with n >= 20
  // This gives: n=20->4, n=50->5, n=100->7, n=200->10, n=500->16
  let suggestedMinK = minK;
  if (adaptiveMinK && n >= 20) {
    suggestedMinK = Math.max(6, Math.min(Math.round(Math.sqrt(n / 2)), maxK));
  }

  // Edge cases
  if (numMerges < 2) {
    return {
      optimalK: Math.min(maxK, Math.max(minK, 2)),
      candidates: [],
      heights,
      rawGaps: [],
      smoothedGaps: new Map(),
      selectedCandidate: {
        k: 2,
        gapValue: 0,
        gapIndex: 0,
        localVariance: 0,
        significance: 0,
        score: 0,
      },
    };
  }

  // Step 2: Compute raw gaps
  const rawGaps = computeGaps(heights);

  // Step 3: Apply smoothing at multiple scales
  const smoothedGaps = new Map<number, number[]>();
  for (const level of smoothingLevels) {
    smoothedGaps.set(level, smoothGaps(rawGaps, level));
  }

  // Step 4: Score each potential k
  const candidates: GapCandidate[] = [];

  for (let k = minK; k <= Math.min(maxK, n - 1); k++) {
    // Gap index: cutting to get k clusters means we perform (n - k) merges
    // So we look at the gap after (n - k - 1) merges
    const gapIndex = n - k - 1;

    if (gapIndex < 0 || gapIndex >= rawGaps.length) continue;

    // Aggregate significance across smoothing levels
    let totalSignificance = 0;

    for (const [level, gaps] of smoothedGaps) {
      const adjIndex = Math.min(gapIndex, gaps.length - 1);
      const gapValue = gaps[adjIndex];
      const localVar = computeLocalVariance(gaps, adjIndex, neighborhoodSize);
      const sig = computeGapSignificance(gapValue, localVar, epsilon);
      totalSignificance += sig;
    }

    // Average across smoothing levels
    totalSignificance /= smoothingLevels.length;

    // Local variance at this gap (from raw gaps)
    const localVariance = computeLocalVariance(rawGaps, gapIndex, neighborhoodSize);

    // Optional: quality preview via silhouette sampling
    let qualityPreview: number | undefined;
    if (enableQualityPreview) {
      const labels = cutTreeAtK(tree, n, k);
      qualityPreview = estimateSilhouetteAtK(distanceMatrix, labels, qualitySampleSize);
      // Normalize to 0-1 range (silhouette is -1 to 1)
      qualityPreview = (qualityPreview + 1) / 2;
    }

    // Final score: blend significance with quality
    let score = enableQualityPreview && qualityPreview !== undefined
      ? (1 - qualityWeight) * totalSignificance + qualityWeight * qualityPreview
      : totalSignificance;

    // Apply strong penalty for k values below the suggested minimum
    // This discourages selecting very low k for larger, diverse datasets
    // Penalty scales with how far below the minimum: k=2 gets stronger penalty than k=5
    if (adaptiveMinK && k < suggestedMinK) {
      const penaltyScale = 1 - (k / suggestedMinK); // 0 at suggestedMinK, higher for lower k
      score *= (1 - lowKPenalty) * (1 - penaltyScale * 0.5); // Up to 80% reduction for very low k
    }

    candidates.push({
      k,
      gapValue: rawGaps[gapIndex],
      gapIndex,
      localVariance,
      significance: totalSignificance,
      qualityPreview,
      score,
    });
  }

  // Step 5: Rank candidates by score
  candidates.sort((a, b) => b.score - a.score);

  // Handle empty candidates (edge case)
  if (candidates.length === 0) {
    const fallbackK = Math.min(maxK, Math.max(minK, Math.round(Math.sqrt(n))));
    return {
      optimalK: fallbackK,
      candidates: [],
      heights,
      rawGaps,
      smoothedGaps,
      selectedCandidate: {
        k: fallbackK,
        gapValue: 0,
        gapIndex: 0,
        localVariance: 0,
        significance: 0,
        score: 0,
      },
      debug: {
        numMerges,
        smoothingLevels,
        qualityPreviewEnabled: enableQualityPreview,
        suggestedMinK,
        adaptiveMinKEnabled: adaptiveMinK,
      },
    };
  }

  const selectedCandidate = candidates[0];

  return {
    optimalK: selectedCandidate.k,
    candidates,
    heights,
    rawGaps,
    smoothedGaps,
    selectedCandidate,
    debug: {
      numMerges,
      smoothingLevels,
      qualityPreviewEnabled: enableQualityPreview,
      suggestedMinK,
      adaptiveMinKEnabled: adaptiveMinK,
    },
  };
}

/**
 * Rank candidates by score with optional tiebreaking
 *
 * @param candidates - Array of gap candidates
 * @param qualityWeight - Weight given to quality preview
 * @returns Sorted candidates (highest score first)
 */
export function rankCandidates(candidates: GapCandidate[], qualityWeight: number): GapCandidate[] {
  return [...candidates].sort((a, b) => {
    // Primary: score descending
    if (Math.abs(a.score - b.score) > 1e-9) {
      return b.score - a.score;
    }
    // Tiebreaker: prefer higher quality preview if available
    if (a.qualityPreview !== undefined && b.qualityPreview !== undefined) {
      return b.qualityPreview - a.qualityPreview;
    }
    // Tiebreaker: prefer larger gaps
    return b.gapValue - a.gapValue;
  });
}
