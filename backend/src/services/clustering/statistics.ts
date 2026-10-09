/**
 * Statistical Helper Functions for Clustering
 *
 * PURPOSE: Provide robust statistical functions for data-driven clustering decisions
 * DEPENDENCIES: None
 * STATUS: ✅ Implemented
 *
 * Based on research from:
 * - MAD: https://medium.com/@aakash013/outlier-detection-treatment-z-score-iqr-and-robust-methods-398c99450ff3
 * - IQR: https://plotnerd.com/blog/complete-guide-to-iqr-method-outlier-detection/
 * - CV: https://ieeexplore.ieee.org/document/6100578/
 */

/**
 * Calculate median of an array
 * @param arr - Array of numbers
 * @returns Median value
 */
export function median(arr: number[]): number {
  if (arr.length === 0) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate mean of an array
 * @param arr - Array of numbers
 * @returns Mean value
 */
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate standard deviation
 * @param arr - Array of numbers
 * @param useSample - Use sample std (n-1) instead of population std (n)
 * @returns Standard deviation
 */
export function standardDeviation(arr: number[], useSample: boolean = true): number {
  if (arr.length < 2) return 0;

  const avg = mean(arr);
  const squaredDiffs = arr.map((val) => Math.pow(val - avg, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (arr.length - (useSample ? 1 : 0));

  return Math.sqrt(variance);
}

/**
 * Calculate Median Absolute Deviation (MAD)
 * MAD is more robust to outliers than standard deviation
 *
 * MAD = median(|x_i - median(x)|)
 *
 * @param arr - Array of numbers
 * @returns MAD value
 */
export function medianAbsoluteDeviation(arr: number[]): number {
  if (arr.length === 0) return 0;

  const med = median(arr);
  const absoluteDeviations = arr.map((val) => Math.abs(val - med));

  return median(absoluteDeviations);
}

/**
 * Calculate percentile of an array
 * Uses linear interpolation between data points
 *
 * @param arr - Array of numbers
 * @param p - Percentile (0-100)
 * @returns Percentile value
 */
export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  if (p <= 0) return Math.min(...arr);
  if (p >= 100) return Math.max(...arr);

  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

/**
 * Calculate Interquartile Range (IQR)
 * IQR = Q3 - Q1
 *
 * @param arr - Array of numbers
 * @returns IQR value
 */
export function interquartileRange(arr: number[]): number {
  if (arr.length < 4) return 0;

  const q1 = percentile(arr, 25);
  const q3 = percentile(arr, 75);

  return q3 - q1;
}

/**
 * Calculate skewness (Fisher-Pearson coefficient)
 * Measures asymmetry of the distribution
 *
 * Interpretation:
 * - skewness > 0: Right-skewed (more large values)
 * - skewness < 0: Left-skewed (more small values)
 * - skewness ≈ 0: Symmetric
 *
 * @param arr - Array of numbers
 * @returns Skewness value
 */
export function computeSkewness(arr: number[]): number {
  if (arr.length < 3) return 0;

  const n = arr.length;
  const avg = mean(arr);
  const std = standardDeviation(arr, false);

  if (std === 0) return 0;

  // Third standardized moment
  const m3 = arr.reduce((sum, val) => sum + Math.pow((val - avg) / std, 3), 0) / n;

  // Adjust for sample size (Fisher's correction)
  const adjustment = Math.sqrt((n * (n - 1))) / (n - 2);

  return m3 * adjustment;
}

/**
 * Calculate excess kurtosis with Fisher's sample correction
 * Measures "tailedness" of the distribution
 *
 * Uses Fisher's correction for sample kurtosis to reduce bias:
 * G2 = ((n-1) / ((n-2)(n-3))) * ((n+1) * g2 + 6)
 * where g2 = m4 - 3 (uncorrected excess kurtosis)
 *
 * Interpretation:
 * - kurtosis > 0: Heavy tails (more outliers than normal)
 * - kurtosis < 0: Light tails (fewer outliers than normal)
 * - kurtosis ≈ 0: Normal-like tails
 *
 * @param arr - Array of numbers
 * @returns Excess kurtosis value (Fisher-corrected for samples)
 */
export function computeKurtosis(arr: number[]): number {
  if (arr.length < 4) return 0;

  const n = arr.length;
  const avg = mean(arr);
  const std = standardDeviation(arr, false);

  if (std === 0) return 0;

  // Fourth standardized moment
  const m4 = arr.reduce((sum, val) => sum + Math.pow((val - avg) / std, 4), 0) / n;

  // Uncorrected excess kurtosis (subtract 3 for normal distribution baseline)
  const g2 = m4 - 3;

  // Fisher's correction for sample kurtosis
  // This reduces bias for finite samples
  const correction = ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * g2 + 6);

  return correction;
}

/**
 * Calculate Coefficient of Variation (CV)
 * CV = standard deviation / mean
 * Measures relative variability
 *
 * For MAD-based robust CV: CV = MAD / median
 *
 * @param arr - Array of numbers
 * @param robust - Use MAD/median instead of std/mean
 * @returns CV value
 */
export function coefficientOfVariation(arr: number[], robust: boolean = true): number {
  if (arr.length === 0) return 0;

  if (robust) {
    const med = median(arr);
    if (med === 0) return 0;
    const mad = medianAbsoluteDeviation(arr);
    return mad / med;
  } else {
    const avg = mean(arr);
    if (avg === 0) return 0;
    const std = standardDeviation(arr);
    return std / avg;
  }
}

/**
 * Extract upper triangle from a distance matrix (excluding diagonal)
 * Used to get all unique pairwise distances
 *
 * @param matrix - Square distance matrix
 * @returns Array of pairwise distances
 */
export function extractUpperTriangle(matrix: number[][]): number[] {
  const distances: number[] = [];
  const n = matrix.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      distances.push(matrix[i][j]);
    }
  }

  return distances;
}

/**
 * Compute basic statistics summary for an array
 *
 * @param arr - Array of numbers
 * @returns Statistics summary object
 */
export function computeStatsSummary(arr: number[]): {
  mean: number;
  median: number;
  std: number;
  mad: number;
  iqr: number;
  min: number;
  max: number;
  range: number;
  cv: number;
  skewness: number;
  kurtosis: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
} {
  if (arr.length === 0) {
    return {
      mean: 0,
      median: 0,
      std: 0,
      mad: 0,
      iqr: 0,
      min: 0,
      max: 0,
      range: 0,
      cv: 0,
      skewness: 0,
      kurtosis: 0,
      p10: 0,
      p25: 0,
      p75: 0,
      p90: 0,
    };
  }

  const sorted = [...arr].sort((a, b) => a - b);
  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];

  return {
    mean: mean(arr),
    median: median(arr),
    std: standardDeviation(arr),
    mad: medianAbsoluteDeviation(arr),
    iqr: interquartileRange(arr),
    min: minVal,
    max: maxVal,
    range: maxVal - minVal,
    cv: coefficientOfVariation(arr),
    skewness: computeSkewness(arr),
    kurtosis: computeKurtosis(arr),
    p10: percentile(arr, 10),
    p25: percentile(arr, 25),
    p75: percentile(arr, 75),
    p90: percentile(arr, 90),
  };
}

/**
 * Clamp a value between min and max
 *
 * @param value - Value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Random sample from array without replacement
 *
 * @param arr - Source array
 * @param n - Number of samples to take
 * @returns Array of sampled elements
 */
export function randomSample<T>(arr: T[], n: number): T[] {
  if (n >= arr.length) return [...arr];

  const result: T[] = [];
  const indices = new Set<number>();

  while (indices.size < n) {
    const idx = Math.floor(Math.random() * arr.length);
    if (!indices.has(idx)) {
      indices.add(idx);
      result.push(arr[idx]);
    }
  }

  return result;
}

/**
 * Random sample of indices without replacement
 *
 * @param max - Maximum index (exclusive)
 * @param n - Number of indices to sample
 * @returns Array of sampled indices
 */
export function randomSampleIndices(max: number, n: number): number[] {
  if (n >= max) return Array.from({ length: max }, (_, i) => i);

  const indices = new Set<number>();
  while (indices.size < n) {
    indices.add(Math.floor(Math.random() * max));
  }

  return Array.from(indices);
}
