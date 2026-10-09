/**
 * Data Regime Classifier for Adaptive Clustering
 *
 * PURPOSE: Classify data into regimes based on structure, not just count
 * DEPENDENCIES: ./dataProfiler, ./statistics
 * STATUS: ✅ Implemented (Phase 6 - Post-Hoc Validation)
 *
 * IMPORTANT: Hopkins statistic is NO LONGER used for regime selection.
 * Research shows Hopkins is unreliable for high-dimensional text embeddings.
 * Hopkins is still computed as metadata but does not affect parameters.
 *
 * Regime selection is now based on:
 * - Dataset size (n)
 * - Data structure profile (CV, density, skewness)
 *
 * Legacy Hopkins-dependent presets ('uniform', 'tight-clusters') are available
 * in legacyPresets.ts for manual override only.
 */

import { computeDataStructureProfile, computeHopkinsStatistic } from './dataProfiler';
import {
  DataStructureProfile,
  DataRegimeType,
  DataRegime,
  PresetParams,
  PresetSelection,
} from './types';

// Re-export types for convenience
export { DataRegimeType, DataRegime, PresetParams, PresetSelection } from './types';

/**
 * Classify data into a regime based on structure, not just count
 *
 * IMPORTANT: Hopkins statistic is computed for metadata only - NOT used for selection.
 * Research shows Hopkins loses statistical power in high-dimensional embeddings.
 *
 * Regime selection order:
 * 1. Profile-based: heterogeneous (high CV), dense, sparse
 * 2. Size-based fallback: small (<50), medium (50-500), large (>=500)
 *
 * @param distanceMatrix - Pre-computed pairwise distance matrix
 * @param n - Number of data points
 * @returns DataRegime with classification and reasoning
 */
export function classifyDataRegime(distanceMatrix: number[][], n: number): DataRegime {
  // Step 1: Compute data structure metrics
  // Hopkins is computed for metadata/diagnostics but NOT used for regime selection
  const hopkinsScore = computeHopkinsStatistic(distanceMatrix);
  const profile = computeDataStructureProfile(distanceMatrix);

  // Step 2: Classify based on profile characteristics (NOT Hopkins)
  // Note: 'uniform' and 'tight-clusters' regimes are NO LONGER auto-selected
  // They are available as legacy presets for manual override only

  // Profile-based classification 1: Heterogeneous - high variability in distances
  if (profile.coefficientOfVariation > 0.6) {
    return {
      regime: 'heterogeneous',
      hopkinsScore,
      profile,
      reason: `CV ${profile.coefficientOfVariation.toFixed(3)} > 0.6 indicates mixed cluster densities`,
    };
  }

  // Profile-based classification 2: Dense - all points close together
  if (profile.isDense && n >= 50) {
    return {
      regime: 'dense',
      hopkinsScore,
      profile,
      reason: `Density ${profile.density.toFixed(3)} > 0.7 indicates tight data`,
    };
  }

  // Profile-based classification 3: Sparse - points spread out
  if (profile.isSparse && n >= 50) {
    return {
      regime: 'sparse',
      hopkinsScore,
      profile,
      reason: `Density ${profile.density.toFixed(3)} < 0.3 indicates spread data`,
    };
  }

  // Size-based fallback classification
  if (n < 50) {
    return {
      regime: 'small',
      hopkinsScore,
      profile,
      reason: `Size-based: n=${n} < 50`,
    };
  } else if (n < 500) {
    return {
      regime: 'medium',
      hopkinsScore,
      profile,
      reason: `Size-based: 50 <= n=${n} < 500`,
    };
  } else {
    return {
      regime: 'large',
      hopkinsScore,
      profile,
      reason: `Size-based: n=${n} >= 500`,
    };
  }
}

/**
 * Select preset parameters based on regime and data characteristics
 *
 * NOTE: 'uniform' and 'tight-clusters' cases are NO LONGER handled here.
 * They are available as legacy presets in legacyPresets.ts for manual override.
 *
 * @param regime - Classified data regime
 * @param n - Number of data points
 * @returns PresetSelection with parameters and reasoning
 */
export function selectPresetFromRegime(regime: DataRegime, n: number): PresetSelection {
  const { profile } = regime;

  switch (regime.regime) {
    // NOTE: 'uniform' and 'tight-clusters' removed - use legacyPresets.ts for manual override

    case 'heterogeneous':
      // Mixed data - balanced approach with validation
      return {
        preset: 'heterogeneous',
        reason: `High CV indicates heterogeneous distances`,
        params: {
          minClusterSize: Math.max(4, Math.floor(Math.sqrt(n) / 3)),
          maxClusters: Math.floor(Math.sqrt(n) * 0.8),
          outlierThreshold: profile.percentiles.p75, // Use 75th percentile
          outlierMode: 'ensemble', // Need multiple methods
          optimizeK: true,
          kMethod: 'silhouette-scan', // Need validation
        },
      };

    case 'dense':
      // All points similar - fewer, larger clusters
      return {
        preset: 'dense',
        reason: `Density > 0.7 indicates tight data`,
        params: {
          minClusterSize: Math.max(5, Math.floor(Math.sqrt(n) / 2)),
          maxClusters: Math.floor(Math.sqrt(n) * 0.5),
          outlierThreshold: 0.55, // Stricter - everything is similar
          outlierMode: 'iqr-based',
          optimizeK: true,
          kMethod: 'merge-heights',
        },
      };

    case 'sparse':
      // Points spread out - more, smaller clusters + outliers
      return {
        preset: 'sparse',
        reason: `Density < 0.3 indicates spread data`,
        params: {
          minClusterSize: 3,
          maxClusters: Math.floor(Math.sqrt(n) * 1.2),
          outlierThreshold: 0.3, // More lenient
          outlierMode: 'mad-based',
          optimizeK: true,
          kMethod: 'merge-heights',
        },
      };

    case 'small':
      // Small dataset - careful approach
      return {
        preset: 'small',
        reason: `n=${n} < 50`,
        params: {
          minClusterSize: 3,
          maxClusters: Math.min(Math.floor(n / 3), 10),
          outlierThreshold: 0.4,
          outlierMode: 'fixed',
          optimizeK: true,
          kMethod: 'silhouette-scan', // More accurate for small n
        },
      };

    case 'medium':
      // Medium dataset - balanced
      return {
        preset: 'medium',
        reason: `50 <= n=${n} < 500`,
        params: {
          minClusterSize: Math.max(3, Math.floor(Math.sqrt(n) / 2)),
          maxClusters: Math.floor(Math.sqrt(n)),
          outlierThreshold: computeAdaptiveThresholdFromProfile(profile),
          outlierMode: 'ensemble',
          optimizeK: true,
          kMethod: 'merge-heights',
        },
      };

    case 'large':
      // Large dataset - efficiency matters
      return {
        preset: 'large',
        reason: `n=${n} >= 500`,
        params: {
          minClusterSize: Math.max(5, Math.floor(Math.log10(n) * 2)),
          maxClusters: Math.min(Math.floor(Math.sqrt(n)), 30),
          outlierThreshold: computeAdaptiveThresholdFromProfile(profile),
          outlierMode: 'mad-based', // Efficient
          optimizeK: true,
          kMethod: 'merge-heights', // Fast
        },
      };

    default:
      // Fallback to medium
      return {
        preset: 'balanced',
        reason: `Default balanced preset`,
        params: {
          minClusterSize: Math.max(3, Math.floor(Math.sqrt(n) / 2)),
          maxClusters: Math.floor(Math.sqrt(n)),
          outlierThreshold: 0.4,
          outlierMode: 'ensemble',
          optimizeK: true,
          kMethod: 'merge-heights',
        },
      };
  }
}

/**
 * Compute a simple adaptive threshold from profile
 * (More sophisticated version in adaptiveThreshold.ts)
 *
 * @param profile - DataStructureProfile
 * @returns Threshold value
 */
function computeAdaptiveThresholdFromProfile(profile: DataStructureProfile): number {
  // Base threshold adjusted by density
  let threshold = 0.4;

  if (profile.isDense) {
    threshold = 0.55; // Stricter for dense data
  } else if (profile.isSparse) {
    threshold = 0.3; // More lenient for sparse data
  }

  // Adjust for heavy tails
  if (profile.hasHeavyTails) {
    threshold -= 0.05; // More lenient (more outliers are normal)
  }

  // Clamp to reasonable range
  return Math.max(0.2, Math.min(0.7, threshold));
}

/**
 * Get regime-appropriate k optimization method
 *
 * @param regime - Data regime
 * @param n - Number of points
 * @returns Recommended k optimization method
 */
export function getRecommendedKMethod(
  regime: DataRegime,
  n: number
): 'merge-heights' | 'silhouette-scan' | 'gap-statistic' {
  // Gap statistic is expensive, only use for small datasets with weak structure
  if (n < 50 && regime.hopkinsScore < 0.6) {
    return 'gap-statistic';
  }

  // Silhouette scan for small datasets or heterogeneous data
  if (n < 100 || regime.regime === 'heterogeneous') {
    return 'silhouette-scan';
  }

  // Merge heights is fast and works well for most cases
  return 'merge-heights';
}

/**
 * Format regime as human-readable summary
 *
 * @param regime - DataRegime object
 * @returns Formatted string summary
 */
export function formatRegimeSummary(regime: DataRegime): string {
  const lines: string[] = [
    `Data Regime: ${regime.regime.toUpperCase()}`,
    `  Hopkins Score: ${regime.hopkinsScore.toFixed(3)}`,
    `  Reason: ${regime.reason}`,
    `  Profile Summary:`,
    `    - CV: ${regime.profile.coefficientOfVariation.toFixed(3)}`,
    `    - Density: ${regime.profile.density.toFixed(3)}`,
    `    - Skewness: ${regime.profile.skewness.toFixed(3)}`,
    `    - Kurtosis: ${regime.profile.kurtosis.toFixed(3)}`,
  ];

  return lines.join('\n');
}

/**
 * Analyze data and return complete regime analysis with preset recommendation
 *
 * @param distanceMatrix - Pre-computed distance matrix
 * @param n - Number of data points
 * @returns Complete analysis with regime and preset recommendation
 */
export function analyzeAndSelectPreset(
  distanceMatrix: number[][],
  n: number
): {
  regime: DataRegime;
  preset: PresetSelection;
  summary: string;
} {
  const regime = classifyDataRegime(distanceMatrix, n);
  const preset = selectPresetFromRegime(regime, n);

  const summary = [
    formatRegimeSummary(regime),
    ``,
    `Recommended Preset: ${preset.preset}`,
    `  minClusterSize: ${preset.params.minClusterSize}`,
    `  maxClusters: ${preset.params.maxClusters}`,
    `  outlierThreshold: ${preset.params.outlierThreshold.toFixed(3)}`,
    `  outlierMode: ${preset.params.outlierMode}`,
    `  kMethod: ${preset.params.kMethod}`,
  ].join('\n');

  return { regime, preset, summary };
}
