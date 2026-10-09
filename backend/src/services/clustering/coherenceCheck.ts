/**
 * Post-Clustering Coherence Check
 *
 * PURPOSE: Validate that clusters are semantically coherent by analyzing
 * pairwise similarity distributions within each cluster. Flags problematic
 * clusters and optionally auto-splits them.
 *
 * DEPENDENCIES: statistics.ts
 * STATUS: Implemented
 */

import { median } from './statistics';

// ============ Types ============

/**
 * Result of coherence check for a single cluster
 */
export interface CoherenceResult {
  /** Whether the cluster passes coherence thresholds */
  isCoherent: boolean;
  /** Combined coherence score (0-1, higher = better) */
  coherenceScore: number;
  /** Minimum pairwise similarity in cluster */
  minSimilarity: number;
  /** Maximum pairwise similarity in cluster */
  maxSimilarity: number;
  /** Median pairwise similarity in cluster */
  medianSimilarity: number;
  /** Ratio of min to max similarity (1.0 = perfectly uniform) */
  coherenceRatio: number;
  /** Spread of similarities (0 = perfectly uniform) */
  coherenceSpread: number;
  /** Items that don't fit well in the cluster */
  problematicItems?: ProblematicItem[];
}

/**
 * An item identified as not fitting well in its cluster
 */
export interface ProblematicItem {
  /** Index within the cluster's item list */
  index: number;
  /** Original index in the full dataset */
  originalIndex: number;
  /** Average similarity to other items in cluster */
  avgSimilarityToCluster: number;
  /** Minimum similarity to any item in cluster */
  minSimilarityInCluster: number;
  /** Score indicating how much of an outlier (0-1, higher = worse fit) */
  outlierScore: number;
}

/**
 * Report for a single cluster's coherence
 */
export interface ClusterCoherenceReport {
  /** Cluster ID */
  clusterId: number;
  /** Number of items in cluster */
  size: number;
  /** Detailed coherence results */
  coherence: CoherenceResult;
  /** Recommended action */
  recommendation: 'keep' | 'review' | 'split';
}

/**
 * Suggestion for how to split a problematic cluster
 */
export interface SplitSuggestion {
  /** Suggested number of sub-clusters */
  suggestedSubclusters: number;
  /** Indices where natural divisions might occur */
  divisionPoints: number[];
}

/**
 * Full coherence report for all clusters
 */
export interface FullCoherenceReport {
  /** Total number of clusters analyzed */
  totalClusters: number;
  /** Number of clusters that passed coherence check */
  coherentClusters: number;
  /** Clusters with issues */
  problematicClusters: ClusterCoherenceReport[];
  /** Average coherence score across all clusters */
  overallCoherenceScore: number;
  /** Human-readable recommendations */
  recommendations: string[];
}

/**
 * Options for coherence checking
 */
export interface CoherenceCheckOptions {
  /** Minimum coherence ratio (minSim/maxSim) for coherent cluster (default: 0.6) */
  coherenceRatioThreshold?: number;
  /** Maximum similarity spread (maxSim-minSim) for coherent cluster (default: 0.4) */
  maxSpreadThreshold?: number;
  /** Similarity below this marks an item as outlier (default: 0.3) */
  outlierThreshold?: number;
  /** Skip coherence check for clusters smaller than this (default: 3) */
  minClusterSizeForCheck?: number;
  /** Enable auto-splitting of problematic clusters (default: true) */
  autoSplit?: boolean;
  /** Maximum iterations of auto-splitting (default: 2) */
  maxAutoSplitIterations?: number;
}

/**
 * Result of auto-split operation
 */
export interface AutoSplitResult {
  /** Updated cluster labels */
  labels: number[];
  /** New number of clusters */
  numClusters: number;
  /** Updated coherence report after splitting */
  coherenceReport: FullCoherenceReport;
  /** Number of clusters that were split */
  splitCount: number;
  /** Details of what was split */
  splitDetails: Array<{
    originalClusterId: number;
    newClusterIds: number[];
    reason: string;
  }>;
}

// ============ Helper Functions ============

/**
 * Get all indices belonging to a specific cluster
 */
function getClusterIndices(labels: number[], clusterId: number): number[] {
  return labels.map((label, idx) => (label === clusterId ? idx : -1)).filter((idx) => idx !== -1);
}

/**
 * Compute all pairwise similarities within a cluster
 */
export function computeClusterPairwiseSimilarities(
  clusterIndices: number[],
  distanceMatrix: number[][]
): number[] {
  const similarities: number[] = [];

  for (let i = 0; i < clusterIndices.length; i++) {
    for (let j = i + 1; j < clusterIndices.length; j++) {
      // Convert cosine distance to similarity
      const similarity = 1 - distanceMatrix[clusterIndices[i]][clusterIndices[j]];
      similarities.push(similarity);
    }
  }

  return similarities;
}

/**
 * Find items with low average similarity to rest of cluster
 */
export function findProblematicItems(
  clusterIndices: number[],
  distanceMatrix: number[][],
  outlierThreshold: number
): ProblematicItem[] {
  const problematic: ProblematicItem[] = [];

  for (let i = 0; i < clusterIndices.length; i++) {
    const idx = clusterIndices[i];
    let sumSim = 0;
    let minSim = 1.0;
    let count = 0;

    for (let j = 0; j < clusterIndices.length; j++) {
      if (i === j) continue;
      const sim = 1 - distanceMatrix[idx][clusterIndices[j]];
      sumSim += sim;
      minSim = Math.min(minSim, sim);
      count++;
    }

    if (count === 0) continue;

    const avgSim = sumSim / count;

    // If average similarity is below threshold, this item doesn't belong
    if (avgSim < outlierThreshold) {
      const outlierScore = (outlierThreshold - avgSim) / outlierThreshold;
      problematic.push({
        index: i,
        originalIndex: idx,
        avgSimilarityToCluster: avgSim,
        minSimilarityInCluster: minSim,
        outlierScore,
      });
    }
  }

  // Sort by outlier score descending (worst fits first)
  return problematic.sort((a, b) => b.outlierScore - a.outlierScore);
}

// ============ Main Functions ============

/**
 * Check coherence of a single cluster
 *
 * @param clusterIndices - Indices of items in this cluster
 * @param distanceMatrix - Pre-computed distance matrix
 * @param options - Coherence check options
 * @returns Coherence result for this cluster
 */
export function checkClusterCoherence(
  clusterIndices: number[],
  distanceMatrix: number[][],
  options: CoherenceCheckOptions = {}
): CoherenceResult {
  const {
    coherenceRatioThreshold = 0.6,
    maxSpreadThreshold = 0.4,
    outlierThreshold = 0.3,
    minClusterSizeForCheck = 3,
  } = options;

  // Skip tiny clusters - they're trivially coherent
  if (clusterIndices.length < minClusterSizeForCheck) {
    return {
      isCoherent: true,
      coherenceScore: 1.0,
      minSimilarity: 1.0,
      maxSimilarity: 1.0,
      medianSimilarity: 1.0,
      coherenceRatio: 1.0,
      coherenceSpread: 0,
    };
  }

  // Compute all pairwise similarities within cluster
  const similarities = computeClusterPairwiseSimilarities(clusterIndices, distanceMatrix);

  if (similarities.length === 0) {
    return {
      isCoherent: true,
      coherenceScore: 1.0,
      minSimilarity: 1.0,
      maxSimilarity: 1.0,
      medianSimilarity: 1.0,
      coherenceRatio: 1.0,
      coherenceSpread: 0,
    };
  }

  // Compute coherence metrics
  const sorted = [...similarities].sort((a, b) => a - b);
  const minSim = sorted[0];
  const maxSim = sorted[sorted.length - 1];
  const medianSim = median(similarities);

  // Coherence ratio: how uniform are the similarities?
  const coherenceRatio = maxSim > 0 ? minSim / maxSim : 1.0;

  // Coherence spread: absolute range of similarities
  const coherenceSpread = maxSim - minSim;

  // Cluster is coherent if ratio is high AND spread is low
  const isCoherent = coherenceRatio >= coherenceRatioThreshold && coherenceSpread <= maxSpreadThreshold;

  // Combined coherence score (0-1)
  const coherenceScore = (coherenceRatio + (1 - Math.min(1, coherenceSpread))) / 2;

  // Find problematic items if not coherent
  let problematicItems: ProblematicItem[] | undefined;
  if (!isCoherent) {
    problematicItems = findProblematicItems(clusterIndices, distanceMatrix, outlierThreshold);
  }

  return {
    isCoherent,
    coherenceScore,
    minSimilarity: minSim,
    maxSimilarity: maxSim,
    medianSimilarity: medianSim,
    coherenceRatio,
    coherenceSpread,
    problematicItems,
  };
}

/**
 * Generate human-readable recommendations based on problematic clusters
 */
function generateRecommendations(problematicClusters: ClusterCoherenceReport[]): string[] {
  const recommendations: string[] = [];

  const toSplit = problematicClusters.filter((c) => c.recommendation === 'split');
  const toReview = problematicClusters.filter((c) => c.recommendation === 'review');

  if (toSplit.length > 0) {
    recommendations.push(
      `${toSplit.length} cluster(s) have very low coherence and should be split: ` +
        `clusters ${toSplit.map((c) => c.clusterId).join(', ')}`
    );
  }

  if (toReview.length > 0) {
    recommendations.push(
      `${toReview.length} cluster(s) have moderate coherence issues and should be reviewed: ` +
        `clusters ${toReview.map((c) => c.clusterId).join(', ')}`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('All clusters pass coherence checks.');
  }

  return recommendations;
}

/**
 * Check coherence of all clusters and generate full report
 *
 * @param labels - Cluster assignments for all items
 * @param numClusters - Number of clusters
 * @param distanceMatrix - Pre-computed distance matrix
 * @param options - Coherence check options
 * @returns Full coherence report
 */
export function checkAllClustersCoherence(
  labels: number[],
  numClusters: number,
  distanceMatrix: number[][],
  options: CoherenceCheckOptions = {}
): FullCoherenceReport {
  const reports: ClusterCoherenceReport[] = [];
  let coherentCount = 0;
  let totalCoherenceScore = 0;

  for (let clusterId = 0; clusterId < numClusters; clusterId++) {
    // Get indices belonging to this cluster
    const clusterIndices = getClusterIndices(labels, clusterId);

    if (clusterIndices.length === 0) continue;

    const coherence = checkClusterCoherence(clusterIndices, distanceMatrix, options);

    // Determine recommendation
    // Lower threshold to catch more borderline incoherent clusters
    let recommendation: 'keep' | 'review' | 'split' = 'keep';
    if (!coherence.isCoherent) {
      if (coherence.coherenceScore < 0.5) {
        recommendation = 'split';
      } else {
        recommendation = 'review';
      }
    }

    reports.push({
      clusterId,
      size: clusterIndices.length,
      coherence,
      recommendation,
    });

    if (coherence.isCoherent) coherentCount++;
    totalCoherenceScore += coherence.coherenceScore;
  }

  const problematicClusters = reports.filter((r) => r.recommendation !== 'keep');
  const overallCoherenceScore = reports.length > 0 ? totalCoherenceScore / reports.length : 1.0;

  return {
    totalClusters: reports.length,
    coherentClusters: coherentCount,
    problematicClusters,
    overallCoherenceScore,
    recommendations: generateRecommendations(problematicClusters),
  };
}

/**
 * Run mini HAC on a subset of items to split a cluster
 * This is a simplified version that finds the best binary split
 *
 * @param clusterIndices - Original indices of items in the cluster
 * @param distanceMatrix - Full distance matrix
 * @returns Labels for the sub-clustering (0 or 1)
 */
function runMiniHAC(clusterIndices: number[], distanceMatrix: number[][]): number[] {
  const n = clusterIndices.length;

  if (n <= 2) {
    // Can't meaningfully split 2 or fewer items
    return n === 2 ? [0, 1] : [0];
  }

  // Build sub-distance matrix
  const subDistances: number[][] = [];
  for (let i = 0; i < n; i++) {
    subDistances[i] = [];
    for (let j = 0; j < n; j++) {
      subDistances[i][j] = distanceMatrix[clusterIndices[i]][clusterIndices[j]];
    }
  }

  // Simple agglomerative approach: start with each item as own cluster,
  // merge until we have 2 clusters
  let clusters: number[][] = clusterIndices.map((_, i) => [i]);

  while (clusters.length > 2) {
    // Find most similar pair of clusters
    let bestI = 0;
    let bestJ = 1;
    let bestDist = Infinity;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        // Average linkage: average distance between all pairs
        let sumDist = 0;
        let count = 0;

        for (const a of clusters[i]) {
          for (const b of clusters[j]) {
            sumDist += subDistances[a][b];
            count++;
          }
        }

        const avgDist = sumDist / count;
        if (avgDist < bestDist) {
          bestDist = avgDist;
          bestI = i;
          bestJ = j;
        }
      }
    }

    // Merge the two closest clusters
    const merged = [...clusters[bestI], ...clusters[bestJ]];
    clusters = clusters.filter((_, idx) => idx !== bestI && idx !== bestJ);
    clusters.push(merged);
  }

  // Convert clusters to labels
  const labels = new Array(n).fill(0);
  if (clusters.length === 2) {
    for (const idx of clusters[1]) {
      labels[idx] = 1;
    }
  }

  return labels;
}

/**
 * Count unique values in array
 */
function countUnique(arr: number[]): number {
  return new Set(arr).size;
}

/**
 * Auto-split problematic clusters to improve coherence
 *
 * @param labels - Original cluster labels
 * @param distanceMatrix - Pre-computed distance matrix
 * @param coherenceReport - Initial coherence report
 * @param options - Coherence check options
 * @returns Result with updated labels and new coherence report
 */
export function autoSplitProblematicClusters(
  labels: number[],
  distanceMatrix: number[][],
  coherenceReport: FullCoherenceReport,
  options: CoherenceCheckOptions = {}
): AutoSplitResult {
  const { maxAutoSplitIterations = 2 } = options;

  let currentLabels = [...labels];
  let currentReport = coherenceReport;
  let iteration = 0;
  let totalSplitCount = 0;
  const splitDetails: AutoSplitResult['splitDetails'] = [];

  while (iteration < maxAutoSplitIterations) {
    iteration++;

    // Find clusters marked for splitting
    const toSplit = currentReport.problematicClusters.filter((c) => c.recommendation === 'split');

    if (toSplit.length === 0) break;

    for (const cluster of toSplit) {
      const clusterIndices = getClusterIndices(currentLabels, cluster.clusterId);

      if (clusterIndices.length < 4) {
        // Too small to split meaningfully
        continue;
      }

      // Sub-cluster this problematic cluster into 2
      const subLabels = runMiniHAC(clusterIndices, distanceMatrix);

      // Find the next available cluster ID
      const maxClusterId = Math.max(...currentLabels);
      const newClusterId = maxClusterId + 1;

      // Assign new cluster IDs
      const newClusterIds = [cluster.clusterId, newClusterId];
      for (let i = 0; i < clusterIndices.length; i++) {
        if (subLabels[i] === 1) {
          currentLabels[clusterIndices[i]] = newClusterId;
        }
      }

      totalSplitCount++;
      splitDetails.push({
        originalClusterId: cluster.clusterId,
        newClusterIds,
        reason: `Coherence score ${cluster.coherence.coherenceScore.toFixed(2)} below threshold`,
      });
    }

    // Re-check coherence after splitting
    const newNumClusters = countUnique(currentLabels);
    currentReport = checkAllClustersCoherence(currentLabels, newNumClusters, distanceMatrix, options);
  }

  return {
    labels: currentLabels,
    numClusters: countUnique(currentLabels),
    coherenceReport: currentReport,
    splitCount: totalSplitCount,
    splitDetails,
  };
}

/**
 * Check if two-phase clustering should be triggered based on coherence report
 *
 * @param coherenceReport - Coherence report from initial clustering
 * @returns Whether to switch to two-phase clustering
 */
export function shouldUseTwoPhase(coherenceReport: FullCoherenceReport): boolean {
  // Trigger two-phase if:
  // 1. More than 20% of clusters are problematic (lowered from 30%)
  const problematicRatio =
    coherenceReport.totalClusters > 0
      ? coherenceReport.problematicClusters.length / coherenceReport.totalClusters
      : 0;

  // 2. OR any cluster has coherence score < 0.45 (raised from 0.3)
  const hasVerySplittable = coherenceReport.problematicClusters.some(
    (c) => c.coherence.coherenceScore < 0.45
  );

  // 3. OR overall coherence score < 0.6 (raised from 0.5)
  const lowOverall = coherenceReport.overallCoherenceScore < 0.6;

  // 4. OR any single cluster has more than 40% of total items (mega-cluster detection)
  const hasMegaCluster = coherenceReport.problematicClusters.some(
    (c) => c.size > coherenceReport.totalClusters * 8 // cluster size > 8x average
  );

  return problematicRatio > 0.2 || hasVerySplittable || lowOverall || hasMegaCluster;
}
