/**
 * Legacy Presets - Hopkins-dependent presets preserved for manual override
 *
 * These presets were originally selected based on Hopkins statistic classification.
 * They are NOT used in auto mode but available for explicit selection when users
 * know their data characteristics.
 *
 * Use cases:
 * - 'uniform': User knows their data is truly uniform (synthetic data, random embeddings)
 * - 'tight-clusters': User knows their data has clear, well-separated clusters (curated labeled data)
 */

import { PresetParams, PresetSelection } from './types';

export type LegacyPresetType = 'uniform' | 'tight-clusters';

/**
 * Check if a preset name is a legacy preset
 */
export function isLegacyPreset(preset: string): preset is LegacyPresetType {
  return preset === 'uniform' || preset === 'tight-clusters';
}

/**
 * Apply a legacy preset configuration
 *
 * @param preset - Legacy preset type
 * @param n - Dataset size
 * @returns Preset configuration with warning
 */
export function applyLegacyPreset(
  preset: LegacyPresetType,
  n: number
): PresetSelection & { warning: string } {
  switch (preset) {
    case 'uniform':
      return {
        preset: 'uniform',
        reason: 'UNIFORM (manual): Conservative settings for data without natural clusters',
        params: {
          minClusterSize: Math.max(3, Math.floor(n / 5)),
          maxClusters: Math.min(5, Math.floor(n / 10)),
          outlierThreshold: 0.5, // Lenient - more things treated as outliers
          outlierMode: 'fixed',
          optimizeK: false, // Don't try to optimize - no natural k exists
          kMethod: 'merge-heights'
        },
        warning: 'This preset assumes no cluster structure exists - use only if you are certain your data is truly uniform/random'
      };

    case 'tight-clusters':
      return {
        preset: 'tight-clusters',
        reason: 'TIGHT-CLUSTERS (manual): Aggressive settings for well-separated data',
        params: {
          minClusterSize: 3,
          maxClusters: Math.floor(Math.sqrt(n) * 1.5),
          outlierThreshold: 0.45,
          outlierMode: 'mad-based',
          optimizeK: true,
          kMethod: 'merge-heights'
        },
        warning: 'This preset assumes clear clusters exist - may over-cluster noisy or heterogeneous data'
      };

    default:
      // Should never reach here due to type checking, but provide fallback
      return {
        preset: 'uniform',
        reason: 'Unknown legacy preset, falling back to uniform',
        params: {
          minClusterSize: 3,
          maxClusters: Math.min(10, Math.floor(n / 3)),
          outlierThreshold: 0.4,
          outlierMode: 'fixed',
          optimizeK: true,
          kMethod: 'merge-heights'
        },
        warning: 'Unknown preset type'
      };
  }
}

/**
 * Get description of legacy presets for documentation/help
 */
export function getLegacyPresetDescriptions(): Record<LegacyPresetType, string> {
  return {
    'uniform': `
      Use when data has no natural cluster structure.
      - Very conservative: creates few, large clusters
      - High outlier tolerance
      - Does not attempt to optimize k
      - Best for: synthetic data, random embeddings, data known to be uniformly distributed
    `.trim(),

    'tight-clusters': `
      Use when data has clear, well-separated clusters.
      - Aggressive: allows more, smaller clusters
      - MAD-based outlier detection
      - Optimizes k using merge-height analysis
      - Best for: curated labeled data, data with known distinct categories
    `.trim()
  };
}

/**
 * Format legacy preset selection for logging
 */
export function formatLegacyPresetSelection(
  selection: PresetSelection & { warning: string }
): string {
  return [
    `   [HAC] Legacy Preset: ${selection.preset}`,
    `   [HAC] Reason: ${selection.reason}`,
    `   [HAC] WARNING: ${selection.warning}`,
    `   [HAC] Parameters:`,
    `     - minClusterSize: ${selection.params.minClusterSize}`,
    `     - maxClusters: ${selection.params.maxClusters}`,
    `     - outlierThreshold: ${selection.params.outlierThreshold}`,
    `     - outlierMode: ${selection.params.outlierMode}`,
    `     - optimizeK: ${selection.params.optimizeK}`,
    `     - kMethod: ${selection.params.kMethod}`
  ].join('\n');
}
