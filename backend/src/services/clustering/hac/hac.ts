
import { agnes } from 'ml-hclust';
import { ClusteringResult, DataRegime, CoherenceReportResult, TwoPhaseInfo } from '../types';
import { isLegacyPreset, applyLegacyPreset } from '../legacyPresets';
import {
  computeAllValidationMetrics,
  assessClusterQuality,
  formatQualityAssessment,
  ValidationMetrics,
  DistanceMetric
} from '../clusterQuality';
import { ThresholdProfile } from '../qualityThresholds';
import {
  multiResolutionGapAnalysis,
  MultiResolutionGapOptions
} from '../multiResolutionGap';
import {
  checkAllClustersCoherence,
  autoSplitProblematicClusters,
  shouldUseTwoPhase,
  CoherenceCheckOptions,
  FullCoherenceReport
} from '../coherenceCheck';
import {
  twoPhaseCluster,
  TwoPhaseOptions,
  TwoPhaseResult
} from '../twoPhaseCluster';

// Import from extracted modules
import {
  computeAdaptiveMinClusterSize,
  computeAdaptiveMaxClusters,
  calculateDataDensity,
  computeAdaptiveOutlierThreshold
} from './hacAdaptiveConfig';
import {
  buildDistanceMatrix,
  calculateSilhouetteScoreEfficient,
  calculateClusterSizes,
  calculateCentroids
} from './hacMetrics';
import {
  extractLabelsFromTree,
  extractHierarchy,
  estimateOptimalK
} from './hacTreeUtils';
import {
  applyPreset,
  applyDataDrivenPreset,
  type ClusteringPreset,
  type PresetConfig
} from './hacPresets';

export interface HACOptions {
  numClusters?: number;
  linkage?: 'single' | 'complete' | 'average' | 'ward';
  metric?: 'euclidean' | 'cosine';

  // K optimization options
  optimizeK?: boolean;
  kOptimizationMethod?: 'gap-statistic' | 'merge-heights' | 'silhouette';
  kOptimizationRange?: { min: number; max: number };
  gapStatisticReferences?: number;

  // Quality enforcement
  minClusterSize?: number;
  computeSeparationMetrics?: boolean;

  // Dynamic configuration
  minClusterSizeMode?: 'fixed' | 'adaptive';
  minClusterSizeBase?: number;
  maxClustersMode?: 'fixed' | 'adaptive';
  maxClustersBase?: number;
  outlierThresholdMode?: 'fixed' | 'adaptive-density' | 'adaptive-percentile';
  outlierThresholdBase?: number;
  outlierThresholdPercentile?: number;

  // Preset configuration (overrides dynamic options if specified)
  // Note: 'uniform' and 'tight-clusters' are legacy presets in legacyPresets.ts
  preset?: 'auto' | 'small' | 'medium' | 'large' | 'custom' | 'uniform' | 'tight-clusters';

  // Quality assessment threshold profile (default: 'research')
  qualityThresholdProfile?: ThresholdProfile;

  // ============ New Improvement Options ============

  // Multi-resolution gap analysis (Improvement 1)
  /** Enable multi-resolution gap analysis for K selection (default: true) */
  useMultiResolutionGap?: boolean;
  /** Options for multi-resolution gap analysis */
  multiResolutionOptions?: MultiResolutionGapOptions;

  // Coherence check (Improvement 2)
  /** Enable post-clustering coherence validation (default: true) */
  enableCoherenceCheck?: boolean;
  /** Options for coherence checking */
  coherenceOptions?: CoherenceCheckOptions;

  // Two-phase clustering (Improvement 3)
  /** Two-phase clustering mode: 'off', 'on', or 'smart' (default: 'smart')
   * - 'off': Never use two-phase clustering
   * - 'on': Always use two-phase clustering
   * - 'smart': Auto-enable when coherence issues detected
   */
  useTwoPhaseCluster?: 'off' | 'on' | 'smart';
  /** Options for two-phase clustering */
  twoPhaseOptions?: Partial<TwoPhaseOptions>;
}

/**
 * Run Hierarchical Agglomerative Clustering
 */
export async function hacCluster(
  vectors: number[][],
  options: HACOptions = {}
): Promise<ClusteringResult> {
  const n = vectors.length;

  // ============ Build Distance Matrix First (needed for data-driven preset) ============
  const {
    linkage = 'average',  // Recommended for text embeddings
    metric = 'cosine',    // Recommended for text embeddings
  } = options;

  const distances = buildDistanceMatrix(vectors, metric);

  // ============ Apply Preset (if specified) ============
  // Presets provide sensible defaults based on dataset size OR data characteristics
  // Explicit options override preset values
  let presetConfig: (PresetConfig & { regime?: DataRegime }) | null = null;
  let presetReason = '';
  let dataRegime: DataRegime | undefined;

  if (options.preset && options.preset !== 'custom') {
    if (isLegacyPreset(options.preset)) {
      // User explicitly requested legacy preset ('uniform' or 'tight-clusters')
      const legacySelection = applyLegacyPreset(options.preset, n);
      presetConfig = {
        minClusterSizeMode: 'fixed',
        minClusterSizeBase: legacySelection.params.minClusterSize,
        maxClustersMode: 'fixed',
        maxClustersBase: legacySelection.params.maxClusters,
        outlierThresholdMode: legacySelection.params.outlierMode === 'fixed' ? 'fixed' : 'adaptive-density',
        outlierThresholdBase: legacySelection.params.outlierThreshold,
        preset: legacySelection.preset as ClusteringPreset,
        presetReason: legacySelection.reason
      };
      presetReason = legacySelection.reason;
      console.log(`   [HAC] LEGACY Preset: ${options.preset}`);
      console.log(`   [HAC] WARNING: ${legacySelection.warning}`);
      console.log(`   [HAC] Reason: ${presetReason}`);
    } else if (options.preset === 'auto') {
      // Use data-driven preset - analyzes data structure (Hopkins as metadata only)
      const dataDrivenConfig = applyDataDrivenPreset(distances, n);
      presetConfig = dataDrivenConfig;
      dataRegime = dataDrivenConfig.regime;
      presetReason = presetConfig.presetReason;

      console.log(`   [HAC] Data Analysis (Hopkins is metadata only):`);
      console.log(`     - Hopkins Score: ${dataRegime.hopkinsScore.toFixed(3)} (informational)`);
      console.log(`     - Regime: ${dataRegime.regime}`);
      console.log(`     - CV: ${dataRegime.profile.coefficientOfVariation.toFixed(3)}`);
      console.log(`     - Density: ${dataRegime.profile.density.toFixed(3)}`);
      console.log(`   [HAC] Preset: ${presetConfig.preset} - ${presetReason}`);
    } else {
      // Use standard n-based preset (small, medium, large)
      presetConfig = applyPreset(options.preset, n);
      presetReason = presetConfig.presetReason;
      console.log(`   [HAC] Preset: ${presetConfig.preset} - ${presetReason}`);
    }
  }

  // Merge preset with explicit options (explicit wins)
  const {
    numClusters,
    minClusterSize: minClusterSizeOption,
    minClusterSizeMode = presetConfig?.minClusterSizeMode ?? 'fixed',
    minClusterSizeBase = presetConfig?.minClusterSizeBase ?? 3,
    maxClustersMode = presetConfig?.maxClustersMode ?? 'fixed',
    maxClustersBase = presetConfig?.maxClustersBase ?? 15,
  } = options;

  // ============ Compute Adaptive Parameters ============

  // 1. Determine minClusterSize
  let effectiveMinClusterSize: number;
  let minClusterSizeReason: string;

  if (minClusterSizeMode === 'adaptive') {
    effectiveMinClusterSize = computeAdaptiveMinClusterSize(n, minClusterSizeBase);
    if (n < 500) {
      minClusterSizeReason = `Adaptive: sqrt(${n})/2 = ${effectiveMinClusterSize} (small dataset, sqrt scaling)`;
    } else {
      minClusterSizeReason = `Adaptive: log10(${n})*2 = ${effectiveMinClusterSize} (large dataset, log scaling)`;
    }
  } else {
    effectiveMinClusterSize = minClusterSizeOption || minClusterSizeBase;
    minClusterSizeReason = `Fixed: ${effectiveMinClusterSize} (user-specified or default)`;
  }

  // 2. Determine maxClusters
  let effectiveMaxClusters: number;
  let maxClustersReason: string;

  if (maxClustersMode === 'adaptive') {
    effectiveMaxClusters = computeAdaptiveMaxClusters(n, effectiveMinClusterSize, maxClustersBase);
    const physicalMax = Math.floor(n / effectiveMinClusterSize);
    maxClustersReason = `Adaptive: min(n/minSize=${physicalMax}, presetCap=${maxClustersBase}) = ${effectiveMaxClusters}`;
  } else {
    effectiveMaxClusters = maxClustersBase;
    maxClustersReason = `Fixed: ${effectiveMaxClusters} (user-specified or default)`;
  }

  // Log decisions for debugging
  console.log(`   [HAC] minClusterSize: ${effectiveMinClusterSize} (${minClusterSizeReason})`);
  console.log(`   [HAC] maxClusters: ${effectiveMaxClusters} (${maxClustersReason})`);

  // ============ Clustering Process ============

  // Distance matrix was already built above for data-driven preset

  // 4. Perform hierarchical clustering
  const tree = agnes(distances, { method: linkage });

  // 5. Determine optimal k if not provided (uses merge height analysis)
  let k: number;
  let kSelectionMethod: string;
  let kSelectionReason: string;

  // Extract new improvement options with defaults
  const useMultiResolutionGap = options.useMultiResolutionGap ?? true;
  const enableCoherenceCheck = options.enableCoherenceCheck ?? true;
  const useTwoPhaseCluster = options.useTwoPhaseCluster ?? 'smart';

  if (numClusters) {
    // User specified k directly
    k = Math.min(numClusters, effectiveMaxClusters);
    kSelectionMethod = 'user-specified';
    kSelectionReason = numClusters > effectiveMaxClusters
      ? `User requested k=${numClusters}, capped at maxClusters=${effectiveMaxClusters}`
      : `User specified k=${numClusters}`;
  } else {
    // Auto-determine k using multi-resolution gap analysis (if enabled)
    k = estimateOptimalK(n, tree, distances, {
      maxK: effectiveMaxClusters,
      useMultiResolution: useMultiResolutionGap,
      multiResolutionOptions: options.multiResolutionOptions
    });
    kSelectionMethod = useMultiResolutionGap ? 'multi-resolution-gap' : 'merge-heights';
    kSelectionReason = `Auto-selected k=${k} via ${kSelectionMethod} analysis (max allowed: ${effectiveMaxClusters})`;
  }

  // NOTE: Removed aggressive minPossibleK constraint that was forcing k up
  // The old formula (n / (minClusterSize * 2)) enforced max cluster size = 2x minClusterSize,
  // which over-fragmented text clusters. Now we let merge-height analysis determine optimal k
  // and only enforce minClusterSize during cluster extraction (enforceMinSizeByParentBackup)

  console.log(`   [HAC] k=${k} clusters (${kSelectionReason})`);

  // 6. Cut tree to get cluster labels (with minSize constraint)
  const labels = extractLabelsFromTree(tree, n, k, effectiveMinClusterSize);

  // 7. Extract hierarchy information
  const hierarchy = extractHierarchy(tree, labels, vectors);

  // 8. Calculate centroids for each cluster
  // Use normalized centroids for cosine metric to better represent cluster centers in angular space
  const actualK = new Set(labels).size;
  const centroids = calculateCentroids(vectors, labels, actualK, metric);

  // 9. Calculate silhouette score for quality assessment (using efficient version)
  const silhouetteScore = calculateSilhouetteScoreEfficient(distances, labels, actualK);

  // 10. Calculate data density (for potential use in outlier detection)
  const dataDensity = calculateDataDensity(distances);
  console.log(`   [HAC] Data density: ${dataDensity.toFixed(3)}`);

  // 11. Compute all post-hoc validation metrics
  console.log(`   [HAC] Computing post-hoc validation metrics...`);
  const clusteringMetric: DistanceMetric = metric === 'cosine' ? 'cosine' : 'euclidean';
  const validationMetrics = computeAllValidationMetrics(
    vectors,
    distances,
    labels,
    centroids,
    actualK,
    silhouetteScore,
    clusteringMetric
  );

  // 12. Assess cluster quality with configurable thresholds
  const qualityThresholdProfile = options.qualityThresholdProfile || 'research';
  const qualityAssessment = assessClusterQuality(validationMetrics, {
    thresholdProfile: qualityThresholdProfile,
    hopkinsScore: dataRegime?.hopkinsScore,
    dataProfile: dataRegime?.profile
  });

  console.log(formatQualityAssessment(qualityAssessment));

  // ============ New Improvements: Coherence Check & Two-Phase ============

  // Variables that may be updated by coherence check or two-phase
  let finalLabels = labels;
  let finalK = actualK;
  let finalCentroids = centroids;
  let finalValidationMetrics = validationMetrics;
  let finalSilhouetteScore = silhouetteScore;
  let coherenceReportResult: CoherenceReportResult | undefined;
  let twoPhaseInfo: TwoPhaseInfo | undefined;

  // 13. Coherence check (if enabled)
  if (enableCoherenceCheck) {
    console.log(`   [HAC] Running coherence check...`);

    let coherenceReport = checkAllClustersCoherence(
      finalLabels,
      finalK,
      distances,
      options.coherenceOptions
    );

    console.log(`   [HAC] Coherence: ${coherenceReport.coherentClusters}/${coherenceReport.totalClusters} coherent (overall score: ${coherenceReport.overallCoherenceScore.toFixed(3)})`);

    // Check if we should switch to two-phase clustering
    const shouldSwitchToTwoPhase =
      useTwoPhaseCluster === 'on' ||
      (useTwoPhaseCluster === 'smart' && shouldUseTwoPhase(coherenceReport));

    if (shouldSwitchToTwoPhase) {
      console.log(`   [HAC] Switching to two-phase clustering for better coherence...`);

      // Run two-phase clustering
      const twoPhaseResult = twoPhaseCluster(vectors, distances, {
        targetK: finalK,
        linkage,
        metric,
        ...options.twoPhaseOptions
      });

      // Update with two-phase results
      finalLabels = twoPhaseResult.labels;
      finalK = twoPhaseResult.numClusters;

      // Recalculate centroids and metrics for two-phase result
      finalCentroids = calculateCentroids(vectors, finalLabels, finalK, metric);
      finalSilhouetteScore = calculateSilhouetteScoreEfficient(distances, finalLabels, finalK);
      finalValidationMetrics = computeAllValidationMetrics(
        vectors,
        distances,
        finalLabels,
        finalCentroids,
        finalK,
        finalSilhouetteScore,
        clusteringMetric
      );

      // Re-run coherence check on two-phase result
      coherenceReport = checkAllClustersCoherence(
        finalLabels,
        finalK,
        distances,
        options.coherenceOptions
      );

      console.log(`   [HAC] Two-phase result: ${finalK} clusters, coherence ${coherenceReport.overallCoherenceScore.toFixed(3)}`);

      // Build two-phase info
      twoPhaseInfo = {
        phase1K: twoPhaseResult.phase1K,
        finalK: twoPhaseResult.finalK,
        mergeCount: twoPhaseResult.mergeHistory.length,
        stoppedEarly: twoPhaseResult.stoppedEarly,
        stopReason: twoPhaseResult.stopReason,
        mergeHistory: twoPhaseResult.mergeHistory.map(m => ({
          iteration: m.iteration,
          merged: m.merged,
          mergeScore: m.mergeScore
        }))
      };
    } else if (coherenceReport.problematicClusters.length > 0) {
      // Not using two-phase, but try auto-split if enabled
      const autoSplitEnabled = options.coherenceOptions?.autoSplit !== false;

      if (autoSplitEnabled) {
        console.log(`   [HAC] Auto-splitting ${coherenceReport.problematicClusters.length} problematic clusters...`);

        const splitResult = autoSplitProblematicClusters(
          finalLabels,
          distances,
          coherenceReport,
          options.coherenceOptions
        );

        if (splitResult.splitCount > 0) {
          finalLabels = splitResult.labels;
          finalK = splitResult.numClusters;
          coherenceReport = splitResult.coherenceReport;

          // Recalculate centroids and metrics
          finalCentroids = calculateCentroids(vectors, finalLabels, finalK, metric);
          finalSilhouetteScore = calculateSilhouetteScoreEfficient(distances, finalLabels, finalK);
          finalValidationMetrics = computeAllValidationMetrics(
            vectors,
            distances,
            finalLabels,
            finalCentroids,
            finalK,
            finalSilhouetteScore,
            clusteringMetric
          );

          console.log(`   [HAC] Auto-split: now ${finalK} clusters (split ${splitResult.splitCount})`);
        }
      }
    }

    // Build coherence report result for output
    coherenceReportResult = {
      totalClusters: coherenceReport.totalClusters,
      coherentClusters: coherenceReport.coherentClusters,
      problematicClusterCount: coherenceReport.problematicClusters.length,
      overallCoherenceScore: coherenceReport.overallCoherenceScore,
      clusterResults: coherenceReport.problematicClusters.map(pc => ({
        clusterId: pc.clusterId,
        size: pc.size,
        coherenceScore: pc.coherence.coherenceScore,
        isCoherent: pc.coherence.isCoherent,
        recommendation: pc.recommendation
      })),
      recommendations: coherenceReport.recommendations,
      autoSplitPerformed: twoPhaseInfo === undefined && coherenceReport.problematicClusters.length > 0,
      splitCount: 0 // Will be updated if auto-split was performed
    };
  }

  // Re-assess quality if labels changed
  let finalQualityAssessment = qualityAssessment;
  if (finalLabels !== labels) {
    finalQualityAssessment = assessClusterQuality(finalValidationMetrics, {
      thresholdProfile: qualityThresholdProfile,
      hopkinsScore: dataRegime?.hopkinsScore,
      dataProfile: dataRegime?.profile
    });
  }

  // Build result object
  const result: ClusteringResult = {
    labels: finalLabels,
    numClusters: finalK,
    hierarchy,
    centroids: finalCentroids,
    noise: [],  // No noise points in HAC - all points are clustered
    silhouetteScore: finalValidationMetrics.silhouetteScore,
    daviesBouldinIndex: finalValidationMetrics.daviesBouldinIndex,
    calinskiHarabaszIndex: finalValidationMetrics.calinskiHarabaszIndex,
    dunnIndex: finalValidationMetrics.dunnIndex,
    qualityAssessment: {
      confidenceTier: finalQualityAssessment.confidenceTier,
      confidenceScore: finalQualityAssessment.confidenceScore,
      thresholdProfile: finalQualityAssessment.thresholdProfile,
      perMetricTiers: finalQualityAssessment.perMetricTiers,
      qualityFlags: finalQualityAssessment.qualityFlags
    },
    explanation: {
      minClusterSize: {
        value: effectiveMinClusterSize,
        mode: minClusterSizeMode,
        reason: minClusterSizeReason
      },
      maxClusters: {
        value: effectiveMaxClusters,
        mode: maxClustersMode,
        reason: maxClustersReason
      },
      kSelected: {
        value: finalK,
        method: twoPhaseInfo ? 'two-phase' : kSelectionMethod,
        reason: twoPhaseInfo
          ? `Two-phase clustering: ${twoPhaseInfo.phase1K} -> ${twoPhaseInfo.finalK} clusters`
          : kSelectionReason
      }
    },
    coherenceReport: coherenceReportResult,
    twoPhaseInfo
  };

  // Add data analysis if available (when preset='auto' was used)
  if (dataRegime) {
    result.dataAnalysis = {
      hopkinsScore: dataRegime.hopkinsScore,
      regime: dataRegime.regime,
      regimeReason: dataRegime.reason,
      profile: dataRegime.profile,
      selectedPreset: presetConfig?.preset || 'auto',
      presetReason: presetReason,
      note: 'Hopkins is informational only - not used for parameter selection'
    };
  }

  return result;
}
