/**
 * Adaptive Outlier Threshold Computation
 *
 * PURPOSE: Context-aware outlier threshold based on data characteristics
 * DEPENDENCIES: ./statistics, ./dataProfiler
 * STATUS: ✅ Implemented
 *
 * This module provides sophisticated adaptive threshold computation that
 * considers data distribution, cluster characteristics, and context.
 *
 * Based on research from:
 * - MAD: https://medium.com/@aakash013/outlier-detection-treatment-z-score-iqr-and-robust-methods-398c99450ff3
 * - IQR: https://plotnerd.com/blog/complete-guide-to-iqr-method-outlier-detection/
 */

import {
  median,
  medianAbsoluteDeviation,
  percentile,
  interquartileRange,
  coefficientOfVariation,
  clamp,
} from './statistics';
import { DataStructureProfile, AdaptiveThresholdResult } from './types';

// Re-export the type for convenience
export { AdaptiveThresholdResult } from './types';

/**
 * MAD consistency constant
 * For normally distributed data, MAD * 1.4826 ≈ standard deviation
 */
const MAD_CONSISTENCY_CONSTANT = 1.4826;

/**
 * Compute MAD-based adaptive outlier threshold
 *
 * Threshold = median + k * MAD * 1.4826
 *
 * The k factor is context-dependent:
 * - Heavy tails: k = 4.0 (more lenient)
 * - Homogeneous: k = 2.5 (stricter)
 * - Default: k = 3.5
 *
 * @param withinClusterDistances - Array of within-cluster distances
 * @param profile - DataStructureProfile
 * @param clusterSizes - Optional array of cluster sizes for context
 * @returns MAD-based threshold
 */
export function computeMADThreshold(
  withinClusterDistances: number[],
  profile: DataStructureProfile,
  clusterSizes?: number[]
): number {
  if (withinClusterDistances.length === 0) {
    return 0.4; // Default
  }

  const med = median(withinClusterDistances);
  const mad = medianAbsoluteDeviation(withinClusterDistances);

  // Context 1: Data distribution shape
  let k: number;
  if (profile.hasHeavyTails) {
    // Heavy tails → more extreme values are normal
    k = 4.0;
  } else if (profile.isHomogeneous) {
    // Homogeneous → outliers are truly different
    k = 2.5;
  } else {
    k = 3.5; // Standard
  }

  // Context 2: Cluster size distribution (if available)
  if (clusterSizes && clusterSizes.length > 1) {
    const sizeCV = coefficientOfVariation(clusterSizes, false);
    if (sizeCV > 1.0) {
      // Highly unequal cluster sizes → dominant cluster scenario
      // Need to protect minority clusters, make stricter
      k = k * 0.8;
    }
  }

  // Compute threshold
  let threshold = med + k * mad * MAD_CONSISTENCY_CONSTANT;

  // Clamp to reasonable range for cosine distance (0-2)
  threshold = clamp(threshold, 0.2, 0.7);

  return threshold;
}

/**
 * Compute IQR-based adaptive outlier threshold
 *
 * Threshold = Q3 + k * IQR
 *
 * @param withinClusterDistances - Array of within-cluster distances
 * @param profile - DataStructureProfile
 * @returns IQR-based threshold
 */
export function computeIQRThreshold(withinClusterDistances: number[], profile: DataStructureProfile): number {
  if (withinClusterDistances.length < 4) {
    return 0.4; // Default - need at least 4 points for IQR
  }

  const q3 = percentile(withinClusterDistances, 75);
  const iqr = interquartileRange(withinClusterDistances);

  // Standard k = 1.5 for mild outliers, 3.0 for extreme
  // Adapt based on context
  let k: number;
  if (profile.isHomogeneous) {
    k = 1.0; // Stricter for uniform data
  } else if (profile.hasHeavyTails) {
    k = 2.0; // More lenient for heavy-tailed
  } else {
    k = 1.5; // Standard
  }

  // Upper bound is what matters for outlier detection
  let threshold = q3 + k * iqr;

  // Clamp to reasonable range
  threshold = clamp(threshold, 0.2, 0.7);

  return threshold;
}

/**
 * Compute percentile-based threshold
 * Simple but effective - top X% are outliers
 *
 * @param withinClusterDistances - Array of within-cluster distances
 * @param p - Percentile (default: 90 means top 10% are outliers)
 * @returns Percentile-based threshold
 */
export function computePercentileThreshold(withinClusterDistances: number[], p: number = 90): number {
  if (withinClusterDistances.length === 0) {
    return 0.4; // Default
  }

  let threshold = percentile(withinClusterDistances, p);

  // Clamp to reasonable range
  threshold = clamp(threshold, 0.2, 0.7);

  return threshold;
}

/**
 * Compute ensemble outlier threshold
 *
 * Combines MAD, IQR, and percentile methods with adaptive weighting
 * based on data characteristics.
 *
 * @param withinClusterDistances - Array of within-cluster distances
 * @param profile - DataStructureProfile
 * @param clusterSizes - Optional array of cluster sizes
 * @returns AdaptiveThresholdResult with ensemble threshold
 */
export function computeEnsembleThreshold(
  withinClusterDistances: number[],
  profile: DataStructureProfile,
  clusterSizes?: number[]
): AdaptiveThresholdResult {
  if (withinClusterDistances.length === 0) {
    return {
      value: 0.4,
      method: 'ensemble',
      reason: 'No within-cluster distances available, using default',
    };
  }

  // Compute all three thresholds
  const madThreshold = computeMADThreshold(withinClusterDistances, profile, clusterSizes);
  const iqrThreshold = computeIQRThreshold(withinClusterDistances, profile);
  const percentileThreshold = computePercentileThreshold(withinClusterDistances, 90);

  // Determine weights based on data characteristics
  let weights: number[];
  let reason: string;

  if (profile.hasHeavyTails) {
    // Heavy tails: MAD is most robust
    weights = [0.6, 0.2, 0.2];
    reason = 'Heavy-tailed distribution - prioritizing MAD (robust to outliers)';
  } else if (profile.isHomogeneous) {
    // Homogeneous: IQR works well
    weights = [0.3, 0.5, 0.2];
    reason = 'Homogeneous distribution - prioritizing IQR';
  } else if (profile.isHeterogeneous) {
    // Heterogeneous: use percentile as tiebreaker
    weights = [0.35, 0.35, 0.3];
    reason = 'Heterogeneous distribution - balanced ensemble';
  } else {
    // Balanced
    weights = [0.4, 0.3, 0.3];
    reason = 'Standard distribution - balanced ensemble';
  }

  // Weighted average
  const ensembleThreshold =
    weights[0] * madThreshold + weights[1] * iqrThreshold + weights[2] * percentileThreshold;

  return {
    value: clamp(ensembleThreshold, 0.2, 0.7),
    method: 'ensemble',
    components: {
      mad: madThreshold,
      iqr: iqrThreshold,
      percentile: percentileThreshold,
    },
    weights,
    reason,
  };
}

/**
 * Compute adaptive outlier threshold based on cluster assignments
 *
 * This is the main function to use - it computes within-cluster distances
 * and then applies the appropriate threshold method.
 *
 * @param distanceMatrix - Pre-computed pairwise distance matrix
 * @param clusterAssignments - Array of cluster labels for each point
 * @param profile - DataStructureProfile
 * @param method - Threshold method to use
 * @returns AdaptiveThresholdResult
 */
export function computeAdaptiveOutlierThreshold(
  distanceMatrix: number[][],
  clusterAssignments: number[],
  profile: DataStructureProfile,
  method: 'mad-based' | 'iqr-based' | 'percentile' | 'ensemble' = 'ensemble'
): AdaptiveThresholdResult {
  const n = distanceMatrix.length;

  // Compute within-cluster distances
  const withinClusterDistances: number[] = [];
  const clusterSizes: Map<number, number> = new Map();

  // Count cluster sizes
  for (const label of clusterAssignments) {
    if (label >= 0) {
      // Ignore outliers (label = -1)
      clusterSizes.set(label, (clusterSizes.get(label) || 0) + 1);
    }
  }

  // Collect within-cluster distances
  for (let i = 0; i < n; i++) {
    const labelI = clusterAssignments[i];
    if (labelI < 0) continue; // Skip outliers

    for (let j = i + 1; j < n; j++) {
      const labelJ = clusterAssignments[j];
      if (labelI === labelJ) {
        withinClusterDistances.push(distanceMatrix[i][j]);
      }
    }
  }

  // Convert cluster sizes to array
  const clusterSizesArray = Array.from(clusterSizes.values());

  // Apply selected method
  switch (method) {
    case 'mad-based': {
      const threshold = computeMADThreshold(withinClusterDistances, profile, clusterSizesArray);
      return {
        value: threshold,
        method: 'mad-based',
        reason: `MAD-based threshold with context adjustment`,
      };
    }

    case 'iqr-based': {
      const threshold = computeIQRThreshold(withinClusterDistances, profile);
      return {
        value: threshold,
        method: 'iqr-based',
        reason: `IQR-based threshold (Q3 + k*IQR)`,
      };
    }

    case 'percentile': {
      const threshold = computePercentileThreshold(withinClusterDistances, 90);
      return {
        value: threshold,
        method: 'percentile',
        reason: `90th percentile threshold`,
      };
    }

    case 'ensemble':
    default:
      return computeEnsembleThreshold(withinClusterDistances, profile, clusterSizesArray);
  }
}

/**
 * Compute density-based adaptive threshold (simple version)
 *
 * This is a simpler approach that only uses global data density.
 * Use computeAdaptiveOutlierThreshold for more sophisticated approach.
 *
 * @param density - Data density (0-1, higher = denser)
 * @param baseThreshold - Base threshold value (default: 0.4)
 * @returns Adjusted threshold
 */
export function computeDensityBasedThreshold(density: number, baseThreshold: number = 0.4): number {
  // Dense data: raise threshold (stricter - only flag truly different items)
  // Sparse data: lower threshold (more lenient - more things are legitimately different)

  if (density > 0.8) {
    return clamp(baseThreshold + 0.15, 0.2, 0.7); // Stricter
  } else if (density > 0.6) {
    return clamp(baseThreshold + 0.05, 0.2, 0.7); // Slightly stricter
  } else if (density < 0.3) {
    return clamp(baseThreshold - 0.15, 0.2, 0.7); // More lenient
  } else if (density < 0.5) {
    return clamp(baseThreshold - 0.05, 0.2, 0.7); // Slightly more lenient
  }

  return baseThreshold; // Normal
}

/**
 * Format threshold result as human-readable summary
 *
 * @param result - AdaptiveThresholdResult
 * @returns Formatted string
 */
export function formatThresholdSummary(result: AdaptiveThresholdResult): string {
  const lines: string[] = [
    `Adaptive Outlier Threshold: ${result.value.toFixed(3)}`,
    `  Method: ${result.method}`,
    `  Reason: ${result.reason}`,
  ];

  if (result.components) {
    lines.push(`  Components:`);
    if (result.components.mad !== undefined) {
      lines.push(`    - MAD: ${result.components.mad.toFixed(3)}`);
    }
    if (result.components.iqr !== undefined) {
      lines.push(`    - IQR: ${result.components.iqr.toFixed(3)}`);
    }
    if (result.components.percentile !== undefined) {
      lines.push(`    - Percentile: ${result.components.percentile.toFixed(3)}`);
    }
  }

  if (result.weights) {
    lines.push(`  Weights: [${result.weights.map((w) => w.toFixed(2)).join(', ')}]`);
  }

  return lines.join('\n');
}
