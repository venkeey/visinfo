/**
 * Clustering Type Definitions
 *
 * PURPOSE: Define interfaces and types for clustering operations
 * DEPENDENCIES: None
 * STATUS: ✅ Implemented
 */

/**
 * Supported clustering algorithms
 */
export enum ClusteringAlgorithm {
  /** Hierarchical Agglomerative Clustering - creates deep hierarchies (5-7 levels) */
  HAC = 'HAC',
  /** K-means - fallback for large datasets or when flat clustering is needed */
  KMEANS = 'KMEANS',
}

/**
 * Clustering configuration options
 */
export interface ClusteringOptions {
  /** Clustering algorithm to use (default: HAC) */
  algorithm?: ClusteringAlgorithm;

  /** Number of clusters (optional - auto-estimated if not provided) */
  numClusters?: number;

  /** Linkage method for HAC: how to measure distance between clusters
   * - 'single': minimum distance between any two points
   * - 'complete': maximum distance between any two points
   * - 'average': average distance (RECOMMENDED for text)
   * - 'ward': minimize within-cluster variance
   */
  linkage?: 'single' | 'complete' | 'average' | 'ward';

  /** Distance metric to use
   * - 'cosine': cosine distance (1 - cosine similarity) - RECOMMENDED for text embeddings
   * - 'euclidean': Euclidean distance
   */
  metric?: 'cosine' | 'euclidean';

  /** Maximum depth for hierarchical trees (default: 7) */
  maxDepth?: number;

  /** Minimum cluster size - don't split clusters smaller than this (default: 3) */
  minClusterSize?: number;

  /** Enable automatic k optimization (default: false) */
  optimizeK?: boolean;

  /** K optimization method (default: 'merge-heights')
   * - 'merge-heights': Fast, analyzes dendrogram structure (~100ms)
   * - 'silhouette': Balanced, tries multiple k values (~1-2s)
   * - 'gap-statistic': Rigorous, compares to random reference (~10s)
   */
  kOptimizationMethod?: 'gap-statistic' | 'merge-heights' | 'silhouette';

  /** Range of k values to test during optimization (default: {min: 2, max: 20}) */
  kOptimizationRange?: { min: number; max: number };

  /** Number of reference datasets for gap statistic (default: 10) */
  gapStatisticReferences?: number;

  /** Compute additional separation metrics like Davies-Bouldin Index (default: false) */
  computeSeparationMetrics?: boolean;

  // ============ Dynamic Configuration Options ============

  /** Mode for minClusterSize calculation (default: 'fixed')
   * - 'fixed': Use minClusterSize value directly
   * - 'adaptive': Scale based on dataset size (sqrt for n<500, log for n≥500)
   */
  minClusterSizeMode?: 'fixed' | 'adaptive';

  /** Base value for minClusterSize when mode is 'fixed', or floor when 'adaptive' (default: 3) */
  minClusterSizeBase?: number;

  /** Mode for maxClusters calculation (default: 'fixed')
   * - 'fixed': Use maxClusters value directly
   * - 'adaptive': Scale based on min(n/minClusterSize, sqrt(n), maxClustersBase)
   */
  maxClustersMode?: 'fixed' | 'adaptive';

  /** Base value for maxClusters - used as cap when 'adaptive' (default: 15) */
  maxClustersBase?: number;

  /** Mode for outlier threshold calculation (default: 'fixed')
   * - 'fixed': Use outlierThreshold value directly
   * - 'adaptive-density': Adjust based on data density
   * - 'adaptive-percentile': Use percentile of intra-cluster distances
   */
  outlierThresholdMode?: 'fixed' | 'adaptive-density' | 'adaptive-percentile';

  /** Base outlier threshold value (default: 0.4) */
  outlierThresholdBase?: number;

  /** Percentile for adaptive-percentile outlier mode (default: 10) */
  outlierThresholdPercentile?: number;

  /** Preset configuration for quick setup
   * - 'auto': Automatically select based on dataset size
   * - 'small': Optimized for n < 50
   * - 'medium': Optimized for 50 ≤ n < 500
   * - 'large': Optimized for n ≥ 500
   * - 'custom': Use explicit settings
   */
  preset?: 'auto' | 'small' | 'medium' | 'large' | 'custom';

  /** Maximum iterations for K-means (default: 100) */
  maxIterations?: number;

  /** Convergence tolerance for K-means (default: 0.0001) */
  tolerance?: number;
}

/**
 * Result from clustering operation
 */
export interface ClusteringResult {
  /** Cluster assignment for each point (index = point index, value = cluster ID) */
  labels: number[];

  /** Number of clusters found */
  numClusters: number;

  /** Cluster centroids (center points) - for K-means */
  centroids?: number[][];

  /** Hierarchical structure from HAC - contains dendrogram */
  hierarchy?: {
    /** Dendrogram tree structure from HAC (ml-hclust output) */
    dendrogram: any;

    /** Heights at which clusters were merged */
    mergeHeights?: number[];

    /** Gaps between consecutive merge heights (for elbow detection) */
    mergeGaps?: number[];

    /** Optimal k suggested by merge height analysis */
    optimalKByMergeHeights?: number;

    /** Size of each cluster at different levels */
    clusterSizes?: number[];

    /** Number of levels in the hierarchy */
    numLevels?: number;
  };

  /** Indices of noise points (empty for HAC, may contain values for HDBSCAN) */
  noise: number[];

  /** Quality metric: how well-separated clusters are (-1 to 1, higher is better) */
  silhouetteScore?: number;

  /** Silhouette scores for different k values (if k optimization was performed) */
  silhouetteByK?: Map<number, number>;

  /** Davies-Bouldin Index: measures cluster separation (lower is better, <1.5 is good) */
  daviesBouldinIndex?: number;

  /** Calinski-Harabasz Index: variance ratio criterion (higher is better) */
  calinskiHarabaszIndex?: number;

  /** Dunn Index: ratio of min inter-cluster to max intra-cluster distance (higher is better) */
  dunnIndex?: number;

  /** Gap statistic values for different k (if gap statistic was calculated) */
  gapStatistic?: Map<number, number>;

  /** Number of iterations performed (for K-means) */
  iterations?: number;

  /** Explanation of clustering decisions (for transparency) */
  explanation?: ClusteringExplanation;

  /** Data analysis results from Phase 5 (when preset='auto') */
  dataAnalysis?: {
    /** Hopkins statistic for clustering tendency (0.5 = random, >0.7 = clusterable) */
    hopkinsScore: number;
    /** Classified data regime */
    regime: DataRegimeType;
    /** Reason for regime classification */
    regimeReason: string;
    /** Data structure profile */
    profile: DataStructureProfile;
    /** Selected preset based on data analysis */
    selectedPreset: string;
    /** Reason for preset selection */
    presetReason: string;
    /** Note about Hopkins usage */
    note?: string;
  };

  /** Quality assessment from post-hoc validation */
  qualityAssessment?: QualityAssessmentResult;

  /** Coherence report from post-clustering validation */
  coherenceReport?: CoherenceReportResult;

  /** Two-phase clustering info (if two-phase was used) */
  twoPhaseInfo?: TwoPhaseInfo;
}

// ============ Coherence Check Types ============

/**
 * Result of coherence check for a single cluster
 */
export interface ClusterCoherenceResult {
  /** Whether the cluster passes coherence thresholds */
  isCoherent: boolean;
  /** Combined coherence score (0-1, higher = better) */
  coherenceScore: number;
  /** Ratio of min to max similarity (1.0 = perfectly uniform) */
  coherenceRatio: number;
  /** Spread of similarities (0 = perfectly uniform) */
  coherenceSpread: number;
  /** Items that don't fit well in the cluster */
  problematicItemCount: number;
}

/**
 * Report for a single cluster's coherence
 */
export interface ClusterCoherenceReportItem {
  /** Cluster ID */
  clusterId: number;
  /** Number of items in cluster */
  size: number;
  /** Coherence score for this cluster */
  coherenceScore: number;
  /** Whether the cluster is coherent */
  isCoherent: boolean;
  /** Recommended action */
  recommendation: 'keep' | 'review' | 'split';
}

/**
 * Full coherence report stored in ClusteringResult
 */
export interface CoherenceReportResult {
  /** Total number of clusters analyzed */
  totalClusters: number;
  /** Number of clusters that passed coherence check */
  coherentClusters: number;
  /** Number of problematic clusters */
  problematicClusterCount: number;
  /** Average coherence score across all clusters */
  overallCoherenceScore: number;
  /** Per-cluster results */
  clusterResults: ClusterCoherenceReportItem[];
  /** Human-readable recommendations */
  recommendations: string[];
  /** Whether auto-split was performed */
  autoSplitPerformed: boolean;
  /** Number of clusters that were auto-split */
  splitCount: number;
}

// ============ Two-Phase Clustering Types ============

/**
 * Record of a merge step in two-phase clustering
 */
export interface MergeStepRecord {
  /** Iteration number */
  iteration: number;
  /** IDs of clusters that were merged */
  merged: [number, number];
  /** Score that triggered this merge */
  mergeScore: number;
}

/**
 * Two-phase clustering info stored in ClusteringResult
 */
export interface TwoPhaseInfo {
  /** Number of clusters from Phase 1 (over-clustering) */
  phase1K: number;
  /** Final k after Phase 2 (merging) */
  finalK: number;
  /** Number of merge operations performed */
  mergeCount: number;
  /** Whether Phase 2 stopped early */
  stoppedEarly: boolean;
  /** Reason for early stopping (if applicable) */
  stopReason?: string;
  /** Summary of merge history */
  mergeHistory: MergeStepRecord[];
}

/**
 * Quality assessment result from post-hoc validation
 */
export interface QualityAssessmentResult {
  /** Overall confidence tier based on all metrics */
  confidenceTier: 'high' | 'medium' | 'low' | 'poor';

  /** Normalized confidence score (0-1) */
  confidenceScore: number;

  /** Threshold profile used for assessment */
  thresholdProfile: string;

  /** Individual tier for each metric */
  perMetricTiers: {
    silhouette: 'high' | 'medium' | 'low' | 'poor';
    daviesBouldin: 'high' | 'medium' | 'low' | 'poor';
    calinskiHarabasz: 'high' | 'medium' | 'low' | 'poor';
    dunnIndex: 'high' | 'medium' | 'low' | 'poor';
  };

  /** Contextual warnings/notes about the clustering */
  qualityFlags: string[];
}

/**
 * Explanation of clustering decisions (for debugging and transparency)
 */
export interface ClusteringExplanation {
  /** How minClusterSize was determined */
  minClusterSize: {
    value: number;
    mode: 'fixed' | 'adaptive';
    reason: string;
  };

  /** How maxClusters was determined */
  maxClusters: {
    value: number;
    mode: 'fixed' | 'adaptive';
    reason: string;
  };

  /** How k (number of clusters) was selected */
  kSelected: {
    value: number;
    method: string;
    reason: string;
  };

  /** How outlier threshold was determined */
  outlierThreshold?: {
    value: number;
    mode: string;
    dataDensity?: number;
    reason: string;
  };

  /** Preset used if any */
  preset?: string;
}

/**
 * Type alias for embedding vector
 */
export type Vector = number[];

/**
 * Type alias for multiple vectors (matrix)
 */
export type VectorMatrix = number[][];

// ============ Phase 5: Advanced Data-Driven Types ============

/**
 * Comprehensive profile of data structure characteristics
 * Used for data-driven preset selection
 */
export interface DataStructureProfile {
  // Central tendency
  mean: number;
  median: number;

  // Dispersion (robust measures)
  std: number;
  mad: number;
  iqr: number;

  // Relative dispersion
  coefficientOfVariation: number;

  // Distribution shape
  skewness: number;
  kurtosis: number;

  // Range
  min: number;
  max: number;
  range: number;

  // Density proxy (0-1, higher = denser data)
  density: number;

  // Derived classifications (boolean flags)
  isHomogeneous: boolean;
  isHeterogeneous: boolean;
  isDense: boolean;
  isSparse: boolean;
  isRightSkewed: boolean;
  isLeftSkewed: boolean;
  hasHeavyTails: boolean;

  // Percentiles (for threshold setting)
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

/**
 * Data regime types for adaptive clustering
 *
 * - uniform: Data has no clustering structure (Hopkins < 0.5)
 * - tight-clusters: Clear, well-separated clusters
 * - heterogeneous: Mixed data with varying densities
 * - dense: All points are close together
 * - sparse: Points are spread out
 * - small/medium/large: Fallback n-based classification
 */
export type DataRegimeType =
  | 'uniform'
  | 'tight-clusters'
  | 'heterogeneous'
  | 'dense'
  | 'sparse'
  | 'small'
  | 'medium'
  | 'large';

/**
 * Result of regime classification
 */
export interface DataRegime {
  regime: DataRegimeType;
  hopkinsScore: number;
  profile: DataStructureProfile;
  reason: string;
}

/**
 * Result of adaptive threshold computation
 */
export interface AdaptiveThresholdResult {
  value: number;
  method: 'mad-based' | 'iqr-based' | 'percentile' | 'ensemble';
  components?: {
    mad?: number;
    iqr?: number;
    percentile?: number;
  };
  weights?: number[];
  k?: number;
  reason: string;
}

/**
 * Preset parameters computed from data characteristics
 */
export interface PresetParams {
  minClusterSize: number;
  maxClusters: number;
  outlierThreshold: number;
  outlierMode: 'fixed' | 'mad-based' | 'iqr-based' | 'ensemble';
  optimizeK: boolean;
  kMethod: 'merge-heights' | 'silhouette-scan' | 'gap-statistic';
}

/**
 * Preset selection result with reasoning
 */
export interface PresetSelection {
  preset: string;
  reason: string;
  params: PresetParams;
}

/**
 * Complete data analysis result
 */
export interface DataAnalysisResult {
  regime: DataRegime;
  preset: PresetSelection;
  summary: string;
}
