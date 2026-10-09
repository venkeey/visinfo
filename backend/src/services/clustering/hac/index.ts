/**
 * HAC (Hierarchical Agglomerative Clustering) Module
 *
 * Barrel export for all HAC-related functionality.
 * This allows consumers to import from './hac' instead of individual files.
 */

// Main clustering function
export { hacCluster, type HACOptions } from './hac';

// Adaptive configuration
export {
  computeAdaptiveMinClusterSize,
  computeAdaptiveMaxClusters,
  calculateDataDensity,
  computeAdaptiveOutlierThreshold
} from './hacAdaptiveConfig';

// Metrics
export {
  buildDistanceMatrix,
  calculateSilhouetteScoreEfficient,
  calculateClusterSizes,
  calculateCentroids
} from './hacMetrics';

// Tree utilities
export {
  getNodeSize,
  enforceMinSizeByParentBackup,
  getClusters,
  getLeafIndices,
  extractLabelsFromTree,
  extractHierarchy,
  calculateTreeDepth,
  analyzeMergeHeights,
  estimateOptimalK,
  type MergeHeightAnalysis
} from './hacTreeUtils';

// Presets
export {
  applyPreset,
  applyDataDrivenPreset,
  type ClusteringPreset,
  type PresetConfig
} from './hacPresets';
