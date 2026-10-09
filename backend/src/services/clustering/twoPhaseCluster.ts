/**
 * Two-Phase Clustering: Over-cluster then Merge
 *
 * PURPOSE: Improve cluster coherence by starting with more clusters than needed,
 * then intelligently merging similar pairs based on centroid similarity and
 * predicted coherence.
 *
 * Phase 1: Over-cluster to ~1.5-2x target k using standard HAC
 * Phase 2: Iteratively merge most similar pairs until target k reached or
 *          merge quality drops below threshold
 *
 * DEPENDENCIES: utils.ts, coherenceCheck.ts
 * STATUS: Implemented
 */

import { agnes } from 'ml-hclust';
import { cosineSimilarity, calculateCentroid, calculateNormalizedCentroid } from './utils';

// ============ Types ============

/**
 * Options for two-phase clustering
 */
export interface TwoPhaseOptions {
  /** Target number of clusters (auto-estimated if not set) */
  targetK?: number;
  /** Factor to multiply target k for Phase 1 over-clustering (default: 1.5) */
  overclusterFactor?: number;
  /** Don't merge if best score below this threshold (default: 0.5) */
  minMergeThreshold?: number;
  /** Maximum merge iterations (default: 100) */
  maxIterations?: number;
  /** Weight for centroid similarity in merge score (default: 0.6) */
  centroidSimilarityWeight?: number;
  /** Weight for predicted coherence in merge score (default: 0.4) */
  coherenceWeight?: number;
  /** Linkage method for Phase 1 HAC (default: 'average') */
  linkage?: 'single' | 'complete' | 'average' | 'ward';
  /** Distance metric (default: 'cosine') */
  metric?: 'euclidean' | 'cosine';
}

/**
 * A candidate merge between two clusters
 */
export interface MergeCandidate {
  /** First cluster ID */
  cluster1: number;
  /** Second cluster ID */
  cluster2: number;
  /** Cosine similarity between cluster centroids */
  centroidSimilarity: number;
  /** Predicted coherence if merged */
  predictedCoherence: number;
  /** Combined merge score */
  mergeScore: number;
}

/**
 * Record of a single merge step
 */
export interface MergeStep {
  /** Iteration number */
  iteration: number;
  /** IDs of clusters that were merged */
  merged: [number, number];
  /** ID of the new merged cluster */
  newClusterId: number;
  /** Score that triggered this merge */
  mergeScore: number;
  /** Clusters remaining after this merge */
  clustersRemaining: number;
}

/**
 * Result of two-phase clustering
 */
export interface TwoPhaseResult {
  /** Final cluster labels */
  labels: number[];
  /** Final number of clusters */
  numClusters: number;
  /** History of merges in Phase 2 */
  mergeHistory: MergeStep[];
  /** Number of clusters from Phase 1 */
  phase1K: number;
  /** Final k after Phase 2 */
  finalK: number;
  /** Whether Phase 2 stopped early (before reaching target k) */
  stoppedEarly: boolean;
  /** Reason for early stopping (if applicable) */
  stopReason?: string;
}

// ============ Helper Functions ============

/**
 * Build a distance matrix from vectors
 */
function buildDistanceMatrix(vectors: number[][], metric: 'euclidean' | 'cosine'): number[][] {
  const n = vectors.length;
  const distances: number[][] = [];

  for (let i = 0; i < n; i++) {
    distances[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
      } else if (j < i) {
        distances[i][j] = distances[j][i];
      } else {
        if (metric === 'cosine') {
          distances[i][j] = 1 - cosineSimilarity(vectors[i], vectors[j]);
        } else {
          // Euclidean
          let sum = 0;
          for (let k = 0; k < vectors[i].length; k++) {
            const diff = vectors[i][k] - vectors[j][k];
            sum += diff * diff;
          }
          distances[i][j] = Math.sqrt(sum);
        }
      }
    }
  }

  return distances;
}

/**
 * Extract labels from HAC tree at k clusters
 */
function extractLabelsFromTree(tree: any, n: number, k: number): number[] {
  if (k >= n) {
    return Array.from({ length: n }, (_, i) => i);
  }

  if (k <= 1) {
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

  // Sort by height descending
  nodes.sort((a, b) => b.height - a.height);

  // Find cut height
  const cutHeight = k <= nodes.length ? nodes[k - 1].height : 0;

  // Assign labels
  const labels = new Array(n).fill(-1);
  let clusterId = 0;

  function assignLabels(node: any, currentCluster: number) {
    if (node.isLeaf) {
      labels[node.index] = currentCluster;
    } else if (node.height <= cutHeight) {
      if (node.children) {
        node.children.forEach((child: any) => assignLabels(child, currentCluster));
      }
    } else {
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

  assignLabels(tree, clusterId);

  // Renumber clusters
  const uniqueLabels = [...new Set(labels.filter((l) => l >= 0))];
  const labelMap = new Map<number, number>();
  uniqueLabels.forEach((label, idx) => labelMap.set(label, idx));

  return labels.map((l) => (l >= 0 ? labelMap.get(l) ?? 0 : 0));
}

/**
 * Predict coherence if two clusters were merged
 * Based on the coherenceRatio metric from coherenceCheck.ts
 */
function predictMergedCoherence(
  cluster1Indices: number[],
  cluster2Indices: number[],
  distanceMatrix: number[][]
): number {
  const merged = [...cluster1Indices, ...cluster2Indices];

  if (merged.length < 3) return 1.0;

  // Compute all pairwise similarities in merged cluster
  const similarities: number[] = [];
  for (let i = 0; i < merged.length; i++) {
    for (let j = i + 1; j < merged.length; j++) {
      similarities.push(1 - distanceMatrix[merged[i]][merged[j]]);
    }
  }

  if (similarities.length === 0) return 1.0;

  const sorted = [...similarities].sort((a, b) => a - b);
  const minSim = sorted[0];
  const maxSim = sorted[sorted.length - 1];

  // Return coherence ratio as predicted coherence
  return maxSim > 0 ? minSim / maxSim : 1.0;
}

/**
 * Convert cluster map back to label array
 */
function buildLabelsFromMap(clusterMap: Map<number, number[]>, n: number): number[] {
  const labels = new Array(n).fill(0);
  let newClusterId = 0;

  for (const [_, indices] of clusterMap) {
    for (const idx of indices) {
      labels[idx] = newClusterId;
    }
    newClusterId++;
  }

  return labels;
}

/**
 * Generate all pairs from an array
 */
function* allPairs<T>(arr: T[]): Generator<[T, T]> {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      yield [arr[i], arr[j]];
    }
  }
}

// ============ Main Functions ============

/**
 * Phase 1: Over-cluster using standard HAC
 */
export function runOverClustering(
  distanceMatrix: number[][],
  initialK: number,
  linkage: 'single' | 'complete' | 'average' | 'ward'
): { labels: number[]; tree: any } {
  const n = distanceMatrix.length;

  // Run HAC
  const tree = agnes(distanceMatrix, { method: linkage });

  // Extract labels at initialK clusters
  const labels = extractLabelsFromTree(tree, n, initialK);

  return { labels, tree };
}

/**
 * Find the best merge candidate among all cluster pairs
 */
export function findBestMergeCandidate(
  clusterMap: Map<number, number[]>,
  vectors: number[][],
  distanceMatrix: number[][],
  centroids: Map<number, number[]>,
  options: TwoPhaseOptions
): MergeCandidate | null {
  const { centroidSimilarityWeight = 0.6, coherenceWeight = 0.4 } = options;

  const clusterIds = Array.from(clusterMap.keys());

  if (clusterIds.length < 2) return null;

  let bestCandidate: MergeCandidate | null = null;
  let bestScore = -Infinity;

  for (const [c1, c2] of allPairs(clusterIds)) {
    const centroid1 = centroids.get(c1);
    const centroid2 = centroids.get(c2);

    if (!centroid1 || !centroid2) continue;

    // Centroid similarity
    const centroidSim = cosineSimilarity(centroid1, centroid2);

    // Predict coherence if merged
    const cluster1Indices = clusterMap.get(c1) || [];
    const cluster2Indices = clusterMap.get(c2) || [];
    const predictedCoherence = predictMergedCoherence(cluster1Indices, cluster2Indices, distanceMatrix);

    // Combined score
    const mergeScore = centroidSimilarityWeight * centroidSim + coherenceWeight * predictedCoherence;

    if (mergeScore > bestScore) {
      bestScore = mergeScore;
      bestCandidate = {
        cluster1: c1,
        cluster2: c2,
        centroidSimilarity: centroidSim,
        predictedCoherence,
        mergeScore,
      };
    }
  }

  return bestCandidate;
}

/**
 * Merge two clusters and update data structures
 */
export function mergeClusters(
  clusterMap: Map<number, number[]>,
  centroids: Map<number, number[]>,
  vectors: number[][],
  clusterId1: number,
  clusterId2: number,
  newClusterId: number,
  metric: 'euclidean' | 'cosine' = 'cosine'
): void {
  const indices1 = clusterMap.get(clusterId1) || [];
  const indices2 = clusterMap.get(clusterId2) || [];
  const mergedIndices = [...indices1, ...indices2];

  // Remove old clusters
  clusterMap.delete(clusterId1);
  clusterMap.delete(clusterId2);
  centroids.delete(clusterId1);
  centroids.delete(clusterId2);

  // Add merged cluster
  clusterMap.set(newClusterId, mergedIndices);

  // Compute new centroid
  const clusterVectors = mergedIndices.map((i) => vectors[i]);
  const newCentroid =
    metric === 'cosine' ? calculateNormalizedCentroid(clusterVectors) : calculateCentroid(clusterVectors);

  centroids.set(newClusterId, newCentroid);
}

/**
 * Phase 2: Iterative merging
 */
export function iterativeMerge(
  vectors: number[][],
  distanceMatrix: number[][],
  initialLabels: number[],
  targetK: number,
  options: TwoPhaseOptions
): {
  labels: number[];
  mergeHistory: MergeStep[];
  stoppedEarly: boolean;
  stopReason?: string;
} {
  const { minMergeThreshold = 0.7, maxIterations = 100, metric = 'cosine' } = options;

  // Build cluster map: clusterId -> [indices]
  const clusterMap = new Map<number, number[]>();
  initialLabels.forEach((label, idx) => {
    if (!clusterMap.has(label)) clusterMap.set(label, []);
    clusterMap.get(label)!.push(idx);
  });

  // Compute initial centroids
  const centroids = new Map<number, number[]>();
  for (const [clusterId, indices] of clusterMap) {
    const clusterVectors = indices.map((i) => vectors[i]);
    const centroid =
      metric === 'cosine' ? calculateNormalizedCentroid(clusterVectors) : calculateCentroid(clusterVectors);
    centroids.set(clusterId, centroid);
  }

  const mergeHistory: MergeStep[] = [];
  let iteration = 0;
  let nextClusterId = Math.max(...Array.from(clusterMap.keys())) + 1;

  while (clusterMap.size > targetK && iteration < maxIterations) {
    iteration++;

    const candidate = findBestMergeCandidate(clusterMap, vectors, distanceMatrix, centroids, options);

    if (!candidate) {
      return {
        labels: buildLabelsFromMap(clusterMap, vectors.length),
        mergeHistory,
        stoppedEarly: true,
        stopReason: 'No valid merge candidates found',
      };
    }

    if (candidate.mergeScore < minMergeThreshold) {
      return {
        labels: buildLabelsFromMap(clusterMap, vectors.length),
        mergeHistory,
        stoppedEarly: true,
        stopReason: `Best merge score ${candidate.mergeScore.toFixed(3)} below threshold ${minMergeThreshold}`,
      };
    }

    // Execute merge
    mergeClusters(
      clusterMap,
      centroids,
      vectors,
      candidate.cluster1,
      candidate.cluster2,
      nextClusterId,
      metric
    );

    mergeHistory.push({
      iteration,
      merged: [candidate.cluster1, candidate.cluster2],
      newClusterId: nextClusterId,
      mergeScore: candidate.mergeScore,
      clustersRemaining: clusterMap.size,
    });

    nextClusterId++;
  }

  return {
    labels: buildLabelsFromMap(clusterMap, vectors.length),
    mergeHistory,
    stoppedEarly: false,
  };
}

/**
 * Run two-phase clustering
 *
 * Phase 1: Over-cluster using standard HAC
 * Phase 2: Iteratively merge most similar pairs until target k reached
 *
 * @param vectors - Input vectors to cluster
 * @param distanceMatrix - Pre-computed distance matrix
 * @param options - Configuration options
 * @returns Two-phase clustering result
 */
export function twoPhaseCluster(
  vectors: number[][],
  distanceMatrix: number[][],
  options: TwoPhaseOptions = {}
): TwoPhaseResult {
  const {
    targetK,
    overclusterFactor = 2.0, // Increased from 1.5 - start with more clusters
    linkage = 'average',
    metric = 'cosine',
  } = options;

  const n = vectors.length;

  // Determine effective target k
  const effectiveTargetK = targetK ?? Math.round(Math.sqrt(n / 2));

  // Phase 1: Over-cluster
  const initialK = Math.max(effectiveTargetK + 1, Math.round(effectiveTargetK * overclusterFactor));
  console.log(`   [TwoPhase] Phase 1: Over-clustering to k=${initialK}`);

  const { labels: initialLabels, tree } = runOverClustering(distanceMatrix, initialK, linkage);

  // Count actual clusters from Phase 1 (may be less than initialK due to tree structure)
  const actualPhase1K = new Set(initialLabels).size;
  console.log(`   [TwoPhase] Phase 1 result: ${actualPhase1K} clusters`);

  // If we already have fewer clusters than target, return Phase 1 result
  if (actualPhase1K <= effectiveTargetK) {
    console.log(`   [TwoPhase] Phase 1 already at or below target, skipping Phase 2`);
    return {
      labels: initialLabels,
      numClusters: actualPhase1K,
      mergeHistory: [],
      phase1K: actualPhase1K,
      finalK: actualPhase1K,
      stoppedEarly: false,
    };
  }

  // Phase 2: Iterative merging
  console.log(`   [TwoPhase] Phase 2: Merging down to target k=${effectiveTargetK}`);

  const { labels, mergeHistory, stoppedEarly, stopReason } = iterativeMerge(
    vectors,
    distanceMatrix,
    initialLabels,
    effectiveTargetK,
    options
  );

  const finalK = new Set(labels).size;

  if (stoppedEarly) {
    console.log(`   [TwoPhase] Phase 2 stopped early: ${stopReason}`);
  }

  console.log(`   [TwoPhase] Final result: ${finalK} clusters (${mergeHistory.length} merges)`);

  return {
    labels,
    numClusters: finalK,
    mergeHistory,
    phase1K: actualPhase1K,
    finalK,
    stoppedEarly,
    stopReason,
  };
}
