/**
 * Quality Thresholds - Configurable threshold profiles for cluster validation
 *
 * Provides different threshold profiles for determining cluster quality tiers.
 * Research-backed defaults with options for lenient (text embeddings) or strict evaluation.
 */

export type ThresholdProfile = 'research' | 'lenient' | 'strict' | 'custom';
export type ConfidenceTier = 'high' | 'medium' | 'low' | 'poor';

/**
 * Threshold configuration for a single metric
 */
export interface MetricThresholds {
  high: number;    // >= this (or <= for lower-is-better) = high confidence
  medium: number;  // >= this = medium confidence
  low: number;     // >= this = low confidence
  // below low = poor
}

/**
 * Complete threshold configuration for all metrics
 */
export interface QualityThresholds {
  profile: ThresholdProfile;

  /** Silhouette thresholds (range: -1 to 1, higher is better) */
  silhouette: MetricThresholds;

  /** Davies-Bouldin thresholds (lower is better) */
  daviesBouldin: MetricThresholds;

  /** Calinski-Harabasz thresholds (higher is better, no fixed scale) */
  calinskiHarabasz: MetricThresholds;

  /** Dunn Index thresholds (higher is better) */
  dunnIndex: MetricThresholds;
}

/**
 * Research-backed thresholds based on clustering literature
 *
 * Silhouette: Rousseeuw (1987) - >0.5 strong, >0.25 reasonable
 * Davies-Bouldin: Davies & Bouldin (1979) - <1.5 good separation
 * Dunn: Dunn (1974) - higher indicates compact, well-separated clusters
 */
export const RESEARCH_THRESHOLDS: QualityThresholds = {
  profile: 'research',
  silhouette: { high: 0.5, medium: 0.25, low: 0.0 },
  daviesBouldin: { high: 1.5, medium: 2.5, low: 3.5 },
  calinskiHarabasz: { high: 100, medium: 50, low: 20 },
  dunnIndex: { high: 0.5, medium: 0.3, low: 0.1 }
};

/**
 * Lenient thresholds for text embeddings
 *
 * Text embeddings in high-dimensional space often show lower geometric
 * separation even when semantic clusters are meaningful. These thresholds
 * account for that behavior.
 */
export const LENIENT_THRESHOLDS: QualityThresholds = {
  profile: 'lenient',
  silhouette: { high: 0.3, medium: 0.1, low: -0.1 },
  daviesBouldin: { high: 2.0, medium: 3.0, low: 4.0 },
  calinskiHarabasz: { high: 50, medium: 25, low: 10 },
  dunnIndex: { high: 0.3, medium: 0.15, low: 0.05 }
};

/**
 * Strict thresholds for high-quality clustering requirements
 */
export const STRICT_THRESHOLDS: QualityThresholds = {
  profile: 'strict',
  silhouette: { high: 0.7, medium: 0.5, low: 0.25 },
  daviesBouldin: { high: 1.0, medium: 1.5, low: 2.0 },
  calinskiHarabasz: { high: 200, medium: 100, low: 50 },
  dunnIndex: { high: 0.7, medium: 0.5, low: 0.3 }
};

/**
 * Get threshold configuration for a profile
 *
 * @param profile - Threshold profile to use
 * @param custom - Custom overrides (only used when profile='custom')
 * @returns Complete threshold configuration
 */
export function getThresholds(
  profile: ThresholdProfile,
  custom?: Partial<QualityThresholds>
): QualityThresholds {
  switch (profile) {
    case 'lenient':
      return LENIENT_THRESHOLDS;
    case 'strict':
      return STRICT_THRESHOLDS;
    case 'custom':
      if (custom) {
        return mergeThresholds(RESEARCH_THRESHOLDS, custom);
      }
      return RESEARCH_THRESHOLDS;
    case 'research':
    default:
      return RESEARCH_THRESHOLDS;
  }
}

/**
 * Merge custom thresholds with defaults
 */
function mergeThresholds(
  base: QualityThresholds,
  custom: Partial<QualityThresholds>
): QualityThresholds {
  return {
    profile: 'custom',
    silhouette: { ...base.silhouette, ...custom.silhouette },
    daviesBouldin: { ...base.daviesBouldin, ...custom.daviesBouldin },
    calinskiHarabasz: { ...base.calinskiHarabasz, ...custom.calinskiHarabasz },
    dunnIndex: { ...base.dunnIndex, ...custom.dunnIndex }
  };
}

/**
 * Classify a metric value against thresholds
 *
 * @param value - Metric value to classify
 * @param thresholds - Threshold configuration for this metric
 * @param direction - 'higher' if higher values are better, 'lower' if lower is better
 * @returns Confidence tier for this metric
 */
export function classifyByThreshold(
  value: number,
  thresholds: MetricThresholds,
  direction: 'higher' | 'lower'
): ConfidenceTier {
  if (direction === 'higher') {
    if (value >= thresholds.high) return 'high';
    if (value >= thresholds.medium) return 'medium';
    if (value >= thresholds.low) return 'low';
    return 'poor';
  } else {
    // Lower is better (e.g., Davies-Bouldin)
    if (value <= thresholds.high) return 'high';
    if (value <= thresholds.medium) return 'medium';
    if (value <= thresholds.low) return 'low';
    return 'poor';
  }
}

/**
 * Get threshold profile description for logging/display
 */
export function getThresholdDescription(profile: ThresholdProfile): string {
  switch (profile) {
    case 'research':
      return 'Research-backed thresholds (standard interpretation)';
    case 'lenient':
      return 'Lenient thresholds (adjusted for text embeddings)';
    case 'strict':
      return 'Strict thresholds (high-quality clustering required)';
    case 'custom':
      return 'Custom thresholds';
    default:
      return 'Unknown profile';
  }
}
