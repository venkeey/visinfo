/**
 * Cluster Quality Assessment Module
 *
 * Computes post-hoc validation metrics and confidence tiers for clustering results.
 * Uses multiple metrics (Silhouette, Davies-Bouldin, Calinski-Harabasz, Dunn Index)
 * to provide a comprehensive quality assessment.
 *
 * Hopkins statistic is NOT used for parameter selection - only as metadata.
 */

import { DataStructureProfile } from './types';
import {
  QualityThresholds,
  ThresholdProfile,
  ConfidenceTier,
  getThresholds,
  classifyByThreshold
} from './qualityThresholds';
import { euclideanDistance, cosineDistance } from './utils';

// Type for distance metric
export type DistanceMetric = 'euclidean' | 'cosine';

// ============ Interfaces ============

export interface ValidationMetrics {
  silhouetteScore: number;
  daviesBouldinIndex: number;
  calinskiHarabaszIndex: number;
  dunnIndex: number;
}

export interface PerMetricTiers {
  silhouette: ConfidenceTier;
  daviesBouldin: ConfidenceTier;
  calinskiHarabasz: ConfidenceTier;
  dunnIndex: ConfidenceTier;
}

export interface QualityAssessment {
  /** Overall confidence tier based on all metrics */
  confidenceTier: ConfidenceTier;

  /** Normalized confidence score (0-1) */
  confidenceScore: number;

  /** Threshold profile used for assessment */
  thresholdProfile: ThresholdProfile;

  /** Individual tier for each metric */
  perMetricTiers: PerMetricTiers;

  /** Contextual warnings/notes about the clustering */
  qualityFlags: string[];
}

export interface QualityAssessmentOptions {
  thresholdProfile?: ThresholdProfile;
  customThresholds?: Partial<QualityThresholds>;
  hopkinsScore?: number;
  dataProfile?: DataStructureProfile;
}

// ============ Metric Computation Functions ============

/**
 * Compute Davies-Bouldin Index
 *
 * DB = (1/k) * Σ max_j≠i [ (σ_i + σ_j) / d(c_i, c_j) ]
 *
 * Measures the average similarity between each cluster and its most similar one.
 * Lower values indicate better clustering (more separated, compact clusters).
 *
 * Interpretation:
 * - < 1.0: Excellent separation
 * - 1.0-1.5: Good separation
 * - 1.5-2.5: Moderate separation
 * - > 2.5: Poor separation
 *
 * @param vectors - Original data vectors
 * @param labels - Cluster assignment for each point
 * @param centroids - Centroid for each cluster
 * @param numClusters - Number of clusters
 * @param metric - Distance metric to use (should match clustering metric)
 * @returns Davies-Bouldin Index (lower is better)
 */
export function computeDaviesBouldinIndex(
  vectors: number[][],
  labels: number[],
  centroids: number[][],
  numClusters: number,
  metric: DistanceMetric = 'euclidean'
): number {
  if (numClusters < 2 || !centroids || centroids.length < 2) {
    return 0; // Need at least 2 clusters
  }

  // Select distance function based on metric
  const distFn = metric === 'cosine' ? cosineDistance : euclideanDistance;

  // Compute scatter (average distance to centroid) for each cluster
  const scatters: number[] = [];

  for (let i = 0; i < numClusters; i++) {
    const clusterIndices = labels
      .map((label, idx) => label === i ? idx : -1)
      .filter(idx => idx !== -1);

    if (clusterIndices.length === 0 || !centroids[i]) {
      scatters.push(0);
      continue;
    }

    let totalDist = 0;
    for (const idx of clusterIndices) {
      totalDist += distFn(vectors[idx], centroids[i]);
    }
    scatters.push(totalDist / clusterIndices.length);
  }

  // Compute Davies-Bouldin Index
  let dbSum = 0;
  let validClusters = 0;

  for (let i = 0; i < numClusters; i++) {
    if (!centroids[i]) continue;

    let maxRatio = 0;

    for (let j = 0; j < numClusters; j++) {
      if (i === j || !centroids[j]) continue;

      const centroidDist = distFn(centroids[i], centroids[j]);

      if (centroidDist > 0) {
        const ratio = (scatters[i] + scatters[j]) / centroidDist;
        maxRatio = Math.max(maxRatio, ratio);
      }
    }

    if (maxRatio > 0) {
      dbSum += maxRatio;
      validClusters++;
    }
  }

  return validClusters > 0 ? dbSum / validClusters : 0;
}

/**
 * Compute Calinski-Harabasz Index (Variance Ratio Criterion)
 *
 * CH = [B / (k-1)] / [W / (n-k)]
 * Where:
 *   B = between-cluster dispersion
 *   W = within-cluster dispersion
 *
 * Higher values indicate better-defined clusters.
 *
 * @param vectors - Original data vectors
 * @param labels - Cluster assignment for each point
 * @param centroids - Centroid for each cluster
 * @param numClusters - Number of clusters
 * @param metric - Distance metric to use (should match clustering metric)
 * @returns Calinski-Harabasz Index (higher is better)
 */
export function computeCalinskiHarabaszIndex(
  vectors: number[][],
  labels: number[],
  centroids: number[][],
  numClusters: number,
  metric: DistanceMetric = 'euclidean'
): number {
  const n = vectors.length;
  const k = numClusters;

  if (k <= 1 || n <= k || !centroids || centroids.length === 0) {
    return 0;
  }

  const dim = vectors[0].length;

  // Select distance function based on metric
  const distFn = metric === 'cosine' ? cosineDistance : euclideanDistance;

  // Compute global centroid
  const globalCentroid = new Array(dim).fill(0);
  for (const vec of vectors) {
    for (let d = 0; d < dim; d++) {
      globalCentroid[d] += vec[d];
    }
  }
  for (let d = 0; d < dim; d++) {
    globalCentroid[d] /= n;
  }

  // Within-cluster dispersion (W)
  let W = 0;
  for (let i = 0; i < n; i++) {
    const clusterIdx = labels[i];
    if (centroids[clusterIdx]) {
      const dist = distFn(vectors[i], centroids[clusterIdx]);
      W += dist * dist;
    }
  }

  // Between-cluster dispersion (B)
  let B = 0;
  for (let c = 0; c < k; c++) {
    if (!centroids[c]) continue;

    const clusterSize = labels.filter(l => l === c).length;
    if (clusterSize > 0) {
      const dist = distFn(centroids[c], globalCentroid);
      B += clusterSize * dist * dist;
    }
  }

  // Avoid division by zero
  if (W === 0 || k === 1 || n === k) {
    return 0;
  }

  return (B / (k - 1)) / (W / (n - k));
}

/**
 * Compute Dunn Index
 *
 * Dunn = min(inter-cluster distance) / max(intra-cluster diameter)
 *
 * Higher values indicate compact clusters that are well-separated.
 *
 * Note: This is O(n²) per cluster pair, more expensive than other metrics.
 *
 * @param distanceMatrix - Pre-computed pairwise distance matrix
 * @param labels - Cluster assignment for each point
 * @param numClusters - Number of clusters
 * @returns Dunn Index (higher is better)
 */
export function computeDunnIndex(
  distanceMatrix: number[][],
  labels: number[],
  numClusters: number
): number {
  if (numClusters < 2) {
    return 0;
  }

  // Build cluster index lists
  const clusterIndices: number[][] = [];
  for (let c = 0; c < numClusters; c++) {
    clusterIndices[c] = labels
      .map((label, idx) => label === c ? idx : -1)
      .filter(idx => idx !== -1);
  }

  // Compute intra-cluster diameters (max distance within each cluster)
  let maxIntraDiameter = 0;

  for (let c = 0; c < numClusters; c++) {
    const indices = clusterIndices[c];
    for (let i = 0; i < indices.length; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        const dist = distanceMatrix[indices[i]][indices[j]];
        maxIntraDiameter = Math.max(maxIntraDiameter, dist);
      }
    }
  }

  // Compute inter-cluster distances (min distance between clusters)
  let minInterDistance = Infinity;

  for (let c1 = 0; c1 < numClusters; c1++) {
    for (let c2 = c1 + 1; c2 < numClusters; c2++) {
      const indices1 = clusterIndices[c1];
      const indices2 = clusterIndices[c2];

      for (const i of indices1) {
        for (const j of indices2) {
          const dist = distanceMatrix[i][j];
          minInterDistance = Math.min(minInterDistance, dist);
        }
      }
    }
  }

  // Handle edge cases
  if (maxIntraDiameter === 0) {
    return minInterDistance === Infinity ? 0 : Infinity;
  }
  if (minInterDistance === Infinity) {
    return 0;
  }

  return minInterDistance / maxIntraDiameter;
}

/**
 * Compute all validation metrics
 *
 * @param vectors - Original data vectors
 * @param distanceMatrix - Pre-computed pairwise distance matrix
 * @param labels - Cluster assignment for each point
 * @param centroids - Centroid for each cluster
 * @param numClusters - Number of clusters
 * @param silhouetteScore - Pre-computed silhouette score (if available)
 * @param metric - Distance metric to use (should match clustering metric)
 * @returns All validation metrics
 */
export function computeAllValidationMetrics(
  vectors: number[][],
  distanceMatrix: number[][],
  labels: number[],
  centroids: number[][],
  numClusters: number,
  silhouetteScore?: number,
  metric: DistanceMetric = 'euclidean'
): ValidationMetrics {
  return {
    silhouetteScore: silhouetteScore ?? 0,
    daviesBouldinIndex: computeDaviesBouldinIndex(vectors, labels, centroids, numClusters, metric),
    calinskiHarabaszIndex: computeCalinskiHarabaszIndex(vectors, labels, centroids, numClusters, metric),
    dunnIndex: computeDunnIndex(distanceMatrix, labels, numClusters)
  };
}

// ============ Quality Assessment ============

/**
 * Assess cluster quality using multiple validation metrics
 *
 * Uses majority voting across metrics to determine overall confidence tier.
 * Silhouette score serves as tiebreaker and can cap the tier if negative.
 *
 * @param metrics - Validation metrics
 * @param options - Assessment options (threshold profile, Hopkins score, etc.)
 * @returns Quality assessment with confidence tier and flags
 */
export function assessClusterQuality(
  metrics: ValidationMetrics,
  options: QualityAssessmentOptions = {}
): QualityAssessment {
  const thresholdProfile = options.thresholdProfile || 'research';
  const thresholds = getThresholds(thresholdProfile, options.customThresholds);

  // Classify each metric
  const silTier = classifyByThreshold(metrics.silhouetteScore, thresholds.silhouette, 'higher');
  const dbTier = classifyByThreshold(metrics.daviesBouldinIndex, thresholds.daviesBouldin, 'lower');
  const chTier = classifyByThreshold(metrics.calinskiHarabaszIndex, thresholds.calinskiHarabasz, 'higher');
  const dunnTier = classifyByThreshold(metrics.dunnIndex, thresholds.dunnIndex, 'higher');

  const perMetricTiers: PerMetricTiers = {
    silhouette: silTier,
    daviesBouldin: dbTier,
    calinskiHarabasz: chTier,
    dunnIndex: dunnTier
  };

  // Count tier occurrences for majority vote
  const tiers = [silTier, dbTier, chTier, dunnTier];
  const tierCounts: Record<ConfidenceTier, number> = {
    high: tiers.filter(t => t === 'high').length,
    medium: tiers.filter(t => t === 'medium').length,
    low: tiers.filter(t => t === 'low').length,
    poor: tiers.filter(t => t === 'poor').length
  };

  // Determine overall tier by majority vote
  let confidenceTier: ConfidenceTier;

  if (tierCounts.high >= 2) {
    confidenceTier = 'high';
  } else if (tierCounts.high + tierCounts.medium >= 2) {
    confidenceTier = 'medium';
  } else if (tierCounts.poor >= 2) {
    confidenceTier = 'poor';
  } else {
    confidenceTier = 'low';
  }

  // Override: if silhouette is negative, cap at 'low'
  if (metrics.silhouetteScore < 0 && (confidenceTier === 'high' || confidenceTier === 'medium')) {
    confidenceTier = 'low';
  }

  // Compute normalized confidence score (0-1)
  const confidenceScore = computeNormalizedScore(metrics, thresholds);

  // Build quality flags
  const qualityFlags: string[] = [];

  if (options.hopkinsScore !== undefined && options.hopkinsScore < 0.5) {
    qualityFlags.push('Hopkins indicates weak geometric clustering - semantic clusters may still be valid');
  }

  if (metrics.silhouetteScore < 0) {
    qualityFlags.push('Negative silhouette: some points may be closer to other clusters than their own');
  }

  if (metrics.daviesBouldinIndex > 2.5) {
    qualityFlags.push('High Davies-Bouldin index: clusters may overlap significantly');
  }

  if (metrics.dunnIndex < 0.1) {
    qualityFlags.push('Low Dunn index: clusters may not be well-separated');
  }

  if (options.dataProfile?.isHeterogeneous) {
    qualityFlags.push('Heterogeneous data: cluster sizes/densities vary significantly');
  }

  if (options.dataProfile?.isSparse) {
    qualityFlags.push('Sparse data: points are spread out, clusters may be less cohesive');
  }

  return {
    confidenceTier,
    confidenceScore,
    thresholdProfile,
    perMetricTiers,
    qualityFlags
  };
}

/**
 * Compute normalized confidence score (0-1)
 *
 * Combines all metrics into a single score using weighted average.
 * Silhouette has highest weight as it's most reliable for text embeddings.
 */
function computeNormalizedScore(
  metrics: ValidationMetrics,
  thresholds: QualityThresholds
): number {
  // Normalize silhouette: -1..1 → 0..1
  const silNorm = (metrics.silhouetteScore + 1) / 2;

  // Normalize DB: Use threshold.low as max, invert (lower is better)
  const dbMax = thresholds.daviesBouldin.low * 1.2; // Allow some headroom
  const dbNorm = Math.max(0, 1 - metrics.daviesBouldinIndex / dbMax);

  // Normalize CH: Use sigmoid-like transform (no fixed scale)
  const chNorm = metrics.calinskiHarabaszIndex / (metrics.calinskiHarabaszIndex + 100);

  // Normalize Dunn: Cap at 1 (can theoretically be > 1)
  const dunnNorm = Math.min(1, metrics.dunnIndex);

  // Weighted combination (silhouette most reliable)
  const weights = {
    silhouette: 0.4,
    daviesBouldin: 0.25,
    calinskiHarabasz: 0.15,
    dunnIndex: 0.2
  };

  const score =
    weights.silhouette * silNorm +
    weights.daviesBouldin * dbNorm +
    weights.calinskiHarabasz * chNorm +
    weights.dunnIndex * dunnNorm;

  return Math.max(0, Math.min(1, score));
}

/**
 * Format quality assessment for logging
 */
export function formatQualityAssessment(assessment: QualityAssessment): string {
  const lines = [
    `   [Quality] Confidence: ${assessment.confidenceTier.toUpperCase()} (score: ${assessment.confidenceScore.toFixed(3)})`,
    `   [Quality] Profile: ${assessment.thresholdProfile}`,
    `   [Quality] Per-metric tiers:`,
    `     - Silhouette: ${assessment.perMetricTiers.silhouette}`,
    `     - Davies-Bouldin: ${assessment.perMetricTiers.daviesBouldin}`,
    `     - Calinski-Harabasz: ${assessment.perMetricTiers.calinskiHarabasz}`,
    `     - Dunn Index: ${assessment.perMetricTiers.dunnIndex}`
  ];

  if (assessment.qualityFlags.length > 0) {
    lines.push(`   [Quality] Flags:`);
    for (const flag of assessment.qualityFlags) {
      lines.push(`     - ${flag}`);
    }
  }

  return lines.join('\n');
}
