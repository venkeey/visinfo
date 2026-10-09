/**
 * HAC Preset Configurations
 *
 * Preset parameter configurations for different dataset sizes and data characteristics.
 * Includes both legacy n-based presets and modern data-driven presets.
 */

import { classifyDataRegime, selectPresetFromRegime } from '../regimeClassifier';
import type { DataRegime } from '../types';

/**
 * Preset configurations for different dataset sizes
 */
export type ClusteringPreset = 'auto' | 'small' | 'medium' | 'large' | 'custom';

/**
 * Resolved preset configuration (returned by applyPreset)
 */
export interface PresetConfig {
  minClusterSizeMode: 'fixed' | 'adaptive';
  minClusterSizeBase: number;
  maxClustersMode: 'fixed' | 'adaptive';
  maxClustersBase: number;
  outlierThresholdMode: 'fixed' | 'adaptive-density' | 'adaptive-percentile';
  outlierThresholdBase: number;
  preset: ClusteringPreset;
  presetReason: string;
}

/**
 * Apply a preset configuration based on dataset size (legacy n-based approach)
 *
 * Presets:
 * - 'auto': Automatically selects small/medium/large based on n
 * - 'small': n < 50, fixed parameters tuned for small datasets
 * - 'medium': 50 ≤ n < 500, balanced adaptive parameters
 * - 'large': n ≥ 500, aggressive adaptive scaling
 * - 'custom': Use explicit options (no preset applied)
 *
 * @param preset - The preset name or 'auto'
 * @param n - Dataset size (required for 'auto')
 * @returns Preset configuration options
 *
 * @deprecated Use applyDataDrivenPreset for better results based on data structure
 */
export function applyPreset(preset: ClusteringPreset, n: number): PresetConfig {
  // Auto-select preset based on dataset size
  let resolvedPreset = preset;
  if (preset === 'auto') {
    if (n < 50) {
      resolvedPreset = 'small';
    } else if (n < 500) {
      resolvedPreset = 'medium';
    } else {
      resolvedPreset = 'large';
    }
  }

  switch (resolvedPreset) {
    case 'small':
      // Small datasets (n < 50): Fixed params, conservative settings
      // Avoid over-clustering with few items
      return {
        minClusterSizeMode: 'fixed',
        minClusterSizeBase: 2, // Allow smaller clusters for small datasets
        maxClustersMode: 'fixed',
        maxClustersBase: Math.min(10, Math.floor(n / 2)), // Cap at n/2 clusters
        outlierThresholdMode: 'fixed',
        outlierThresholdBase: 0.35, // More lenient for sparse data
        preset: 'small',
        presetReason: `Small dataset (n=${n}): fixed params, minSize=2, maxClusters=${Math.min(10, Math.floor(n / 2))}`
      };

    case 'medium':
      // Medium datasets (50 ≤ n < 500): Let merge-height analysis find natural k
      // Only apply physical constraint (n/minClusterSize), not arbitrary caps
      return {
        minClusterSizeMode: 'adaptive',
        minClusterSizeBase: 5, // ↑ from 3: larger clusters for better coherence (BERTopic-inspired)
        maxClustersMode: 'adaptive',
        maxClustersBase: Math.floor(n / 5), // Physical max only - let merge-height find natural k
        outlierThresholdMode: 'adaptive-density',
        outlierThresholdBase: 0.4,
        preset: 'medium',
        presetReason: `Medium dataset (n=${n}): adaptive √(n/2) scaling, minSize=5 for coherence`
      };

    case 'large':
      // Large datasets (n ≥ 500): Adaptive with log scaling
      // Research-based: √(n/2) gives ~16 for n=500, ~22 for n=1000
      return {
        minClusterSizeMode: 'adaptive',
        minClusterSizeBase: 8, // ↑ from 5: larger clusters for better coherence at scale
        maxClustersMode: 'adaptive',
        maxClustersBase: 20, // ↓ from 25: √(n/2) caps natural cluster count
        outlierThresholdMode: 'adaptive-density',
        outlierThresholdBase: 0.45, // Slightly stricter
        preset: 'large',
        presetReason: `Large dataset (n=${n}): adaptive √(n/2) scaling, minSize=8 for coherence`
      };

    case 'custom':
    default:
      // Custom: Use default values (caller will override)
      return {
        minClusterSizeMode: 'fixed',
        minClusterSizeBase: 3,
        maxClustersMode: 'fixed',
        maxClustersBase: 15,
        outlierThresholdMode: 'fixed',
        outlierThresholdBase: 0.4,
        preset: 'custom',
        presetReason: 'Custom: using explicit configuration values'
      };
  }
}

/**
 * Apply data-driven preset configuration based on data characteristics
 *
 * Uses Hopkins statistic and data structure profile to classify data
 * into regimes and select appropriate parameters. This replaces the
 * legacy n-based thresholds (50/500) with data-driven classification.
 *
 * @param distanceMatrix - Pre-computed distance matrix
 * @param n - Dataset size
 * @returns Preset configuration with regime analysis
 */
export function applyDataDrivenPreset(
  distanceMatrix: number[][],
  n: number
): PresetConfig & { regime: DataRegime } {
  // Classify data regime using Hopkins statistic and data structure profile
  const regime = classifyDataRegime(distanceMatrix, n);
  const presetSelection = selectPresetFromRegime(regime, n);

  // Convert PresetSelection to PresetConfig format
  const config: PresetConfig & { regime: DataRegime } = {
    minClusterSizeMode: 'fixed', // The value is already computed
    minClusterSizeBase: presetSelection.params.minClusterSize,
    maxClustersMode: 'fixed', // The value is already computed
    maxClustersBase: presetSelection.params.maxClusters,
    outlierThresholdMode: presetSelection.params.outlierMode === 'fixed' ? 'fixed' : 'adaptive-density',
    outlierThresholdBase: presetSelection.params.outlierThreshold,
    preset: presetSelection.preset as ClusteringPreset,
    presetReason: `${regime.regime.toUpperCase()}: ${regime.reason} → ${presetSelection.reason}`,
    regime,
  };

  return config;
}
