/**
 * HAC Adaptive Configuration Helpers
 *
 * Pure functions for computing adaptive clustering parameters based on dataset characteristics.
 * These functions have no external dependencies and can be easily tested in isolation.
 */

/**
 * Compute adaptive minClusterSize based on dataset size
 * Uses sqrt(n)/2 for n<500, log10(n)*2 for n≥500
 *
 * @param n - Number of data points
 * @param base - Minimum floor value (default: 3)
 * @returns Computed minClusterSize
 */
export function computeAdaptiveMinClusterSize(n: number, base: number = 3): number {
  if (n < 500) {
    // For smaller datasets, use sqrt scaling (more clusters)
    return Math.max(base, Math.floor(Math.sqrt(n) / 2));
  } else {
    // For larger datasets, use log scaling (slower growth)
    return Math.max(base, Math.floor(Math.log10(n) * 2));
  }
}

/**
 * Compute adaptive maxClusters based on dataset size and minClusterSize
 *
 * @param n - Number of data points
 * @param minClusterSize - Minimum cluster size
 * @param userMax - User-specified maximum (optional cap)
 * @returns Computed maxClusters
 */
export function computeAdaptiveMaxClusters(
  n: number,
  minClusterSize: number,
  userMax?: number
): number {
  // Only apply physical constraint - let merge-height analysis find natural k
  // 1. Physical: Can't have more clusters than n/minClusterSize
  // 2. User preference: Don't exceed user-specified max (if provided)
  // NO arbitrary √n cap - trust the data structure
  const physicalMax = Math.floor(n / minClusterSize);
  const userCap = userMax || physicalMax;

  return Math.max(2, Math.min(physicalMax, userCap));
}

/**
 * Calculate data density (median pairwise similarity)
 * Used for adaptive outlier threshold
 *
 * @param distanceMatrix - Pre-computed distance matrix
 * @returns Density value (0-1, higher = denser data)
 */
export function calculateDataDensity(distanceMatrix: number[][]): number {
  const n = distanceMatrix.length;
  if (n < 2) return 1.0;

  // Collect all pairwise distances (upper triangle only)
  const distances: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      distances.push(distanceMatrix[i][j]);
    }
  }

  // Sort and find median
  distances.sort((a, b) => a - b);
  const mid = Math.floor(distances.length / 2);
  const medianDistance = distances.length % 2 === 0
    ? (distances[mid - 1] + distances[mid]) / 2
    : distances[mid];

  // Convert distance to similarity (density)
  // For cosine distance in [0, 2], similarity = 1 - distance/2
  // For typical values in [0, 1], similarity = 1 - distance
  return Math.max(0, Math.min(1, 1 - medianDistance));
}

/**
 * Compute adaptive outlier threshold based on data density
 *
 * @param density - Data density (0-1)
 * @param base - Default threshold (default: 0.4)
 * @returns Adjusted threshold
 */
export function computeAdaptiveOutlierThreshold(
  density: number,
  base: number = 0.4
): number {
  if (density > 0.8) {
    // Very dense data: be stricter (only flag truly different items)
    return 0.55;
  } else if (density < 0.5) {
    // Sparse data: be more lenient (more things are legitimately different)
    return 0.30;
  }
  // Normal density: use base threshold
  return base;
}
