/**
 * Data Structure Profiler for Clustering
 *
 * PURPOSE: Analyze data characteristics to drive adaptive clustering decisions
 * DEPENDENCIES: ./statistics
 * STATUS: ✅ Implemented
 *
 * Based on research from:
 * - Hopkins Statistic: https://www.sthda.com/english/wiki/wiki.php?id_contents=20528
 * - Hopkins Statistic: https://en.wikipedia.org/wiki/Hopkins_statistic
 * - Datanovia: https://www.datanovia.com/en/lessons/assessing-clustering-tendency/
 */

import {
  median,
  mean,
  standardDeviation,
  medianAbsoluteDeviation,
  interquartileRange,
  computeSkewness,
  computeKurtosis,
  coefficientOfVariation,
  extractUpperTriangle,
  percentile,
  randomSampleIndices,
} from './statistics';
import { DataStructureProfile } from './types';

// Re-export the type for convenience
export { DataStructureProfile } from './types';

/**
 * Compute comprehensive data structure profile from distance matrix
 *
 * @param distanceMatrix - Pre-computed pairwise distance matrix
 * @returns DataStructureProfile object with all computed statistics
 */
export function computeDataStructureProfile(distanceMatrix: number[][]): DataStructureProfile {
  const n = distanceMatrix.length;

  // Handle edge cases
  if (n < 2) {
    return createEmptyProfile();
  }

  // Extract all pairwise distances (upper triangle only)
  const distances = extractUpperTriangle(distanceMatrix);

  if (distances.length === 0) {
    return createEmptyProfile();
  }

  // Compute core statistics
  const meanVal = mean(distances);
  const medianVal = median(distances);
  const stdVal = standardDeviation(distances);
  const madVal = medianAbsoluteDeviation(distances);
  const iqrVal = interquartileRange(distances);
  const cv = coefficientOfVariation(distances);
  const skew = computeSkewness(distances);
  const kurt = computeKurtosis(distances);

  // Range
  const sorted = [...distances].sort((a, b) => a - b);
  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];

  // Density proxy: for cosine distance (0-2 range), lower median = denser
  // Convert to 0-1 scale where higher = denser
  const density = 1 - medianVal / 2; // Assumes cosine distance range [0, 2]

  // Percentiles
  const p10 = percentile(distances, 10);
  const p25 = percentile(distances, 25);
  const p50 = medianVal;
  const p75 = percentile(distances, 75);
  const p90 = percentile(distances, 90);

  return {
    // Central tendency
    mean: meanVal,
    median: medianVal,

    // Dispersion
    std: stdVal,
    mad: madVal,
    iqr: iqrVal,

    // Relative dispersion
    coefficientOfVariation: cv,

    // Shape
    skewness: skew,
    kurtosis: kurt,

    // Range
    min: minVal,
    max: maxVal,
    range: maxVal - minVal,

    // Density
    density,

    // Derived flags
    isHomogeneous: cv < 0.3,
    isHeterogeneous: cv > 0.6,
    isDense: density > 0.7,
    isSparse: density < 0.3,
    isRightSkewed: skew > 0.5,
    isLeftSkewed: skew < -0.5,
    hasHeavyTails: kurt > 3,

    // Percentiles
    percentiles: {
      p10,
      p25,
      p50,
      p75,
      p90,
    },
  };
}

/**
 * Create empty profile for edge cases
 */
function createEmptyProfile(): DataStructureProfile {
  return {
    mean: 0,
    median: 0,
    std: 0,
    mad: 0,
    iqr: 0,
    coefficientOfVariation: 0,
    skewness: 0,
    kurtosis: 0,
    min: 0,
    max: 0,
    range: 0,
    density: 0.5,
    isHomogeneous: false,
    isHeterogeneous: false,
    isDense: false,
    isSparse: false,
    isRightSkewed: false,
    isLeftSkewed: false,
    hasHeavyTails: false,
    percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
  };
}

/**
 * Compute Hopkins Statistic for clustering tendency
 *
 * The Hopkins statistic measures whether data has inherent clustering structure
 * or is uniformly distributed (random).
 *
 * Interpretation:
 * - H ≈ 0.5: Data is uniformly distributed (random, no clusters)
 * - H > 0.7: Data has significant clustering structure
 * - H < 0.3: Data is regularly spaced (anti-clustered)
 *
 * Algorithm:
 * 1. Sample m points from the dataset
 * 2. For each sampled point, find distance to nearest neighbor (u_i)
 * 3. Generate m random "phantom" points
 * 4. For each phantom, find distance to nearest real point (w_i)
 * 5. H = sum(u) / (sum(u) + sum(w))
 *
 * Reference: https://en.wikipedia.org/wiki/Hopkins_statistic
 *
 * @param distanceMatrix - Pre-computed pairwise distance matrix
 * @param sampleRatio - Fraction of data to sample (default: 0.1)
 * @returns Hopkins statistic value (0-1)
 */
export function computeHopkinsStatistic(distanceMatrix: number[][], sampleRatio: number = 0.1): number {
  const n = distanceMatrix.length;

  if (n < 10) {
    // Too small for reliable Hopkins statistic
    return 0.5; // Neutral (no information)
  }

  // Sample size: typically 10% of data, but at least 10 and at most n-1
  const m = Math.min(Math.max(10, Math.floor(n * sampleRatio)), n - 1);

  // Step 1: Sample m random point indices
  const sampledIndices = randomSampleIndices(n, m);

  // Step 2: For each sampled point, find nearest neighbor distance
  // This is u_i: distance from sampled point to nearest OTHER point
  const uDistances: number[] = [];

  for (const i of sampledIndices) {
    let minDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const dist = distanceMatrix[i][j];
        if (dist < minDist) {
          minDist = dist;
        }
      }
    }
    uDistances.push(minDist);
  }

  // Step 3: Generate m random "phantom" points
  // Since we only have the distance matrix (not raw vectors), we approximate
  // by creating "phantom" points as the midpoint between random pairs
  // w_i: distance from phantom to nearest real point
  const wDistances: number[] = [];

  for (let k = 0; k < m; k++) {
    // Pick two random points to create a "phantom" between them
    const [i1, i2] = randomSampleIndices(n, 2);

    // Approximate phantom's distance to each real point
    // as the average of the two parents' distances
    let phantomMinDist = Infinity;

    for (let j = 0; j < n; j++) {
      // Phantom distance to j ≈ average of (dist(i1,j) + dist(i2,j)) / 2
      const avgDist = (distanceMatrix[i1][j] + distanceMatrix[i2][j]) / 2;
      if (avgDist < phantomMinDist) {
        phantomMinDist = avgDist;
      }
    }

    wDistances.push(phantomMinDist);
  }

  // Step 4: Compute Hopkins statistic
  const sumU = uDistances.reduce((a, b) => a + b, 0);
  const sumW = wDistances.reduce((a, b) => a + b, 0);

  // Avoid division by zero
  if (sumU + sumW === 0) {
    return 0.5;
  }

  const H = sumU / (sumU + sumW);

  return H;
}

/**
 * Analyze data for clustering suitability
 *
 * @param distanceMatrix - Pre-computed distance matrix
 * @returns Analysis result with Hopkins score and profile
 */
export function analyzeDataForClustering(distanceMatrix: number[][]): {
  hopkinsScore: number;
  clusteringTendency: 'uniform' | 'weak' | 'moderate' | 'strong';
  profile: DataStructureProfile;
  recommendation: string;
} {
  const hopkinsScore = computeHopkinsStatistic(distanceMatrix);
  const profile = computeDataStructureProfile(distanceMatrix);

  // Determine clustering tendency
  let clusteringTendency: 'uniform' | 'weak' | 'moderate' | 'strong';
  let recommendation: string;

  if (hopkinsScore < 0.5) {
    clusteringTendency = 'uniform';
    recommendation = 'Data appears uniformly distributed. Clustering may not be meaningful.';
  } else if (hopkinsScore < 0.6) {
    clusteringTendency = 'weak';
    recommendation = 'Weak clustering structure. Consider using fewer clusters or validating results carefully.';
  } else if (hopkinsScore < 0.75) {
    clusteringTendency = 'moderate';
    recommendation = 'Moderate clustering structure. Standard clustering approaches should work well.';
  } else {
    clusteringTendency = 'strong';
    recommendation = 'Strong clustering structure. Data has clear natural groupings.';
  }

  // Add profile-based recommendations
  if (profile.hasHeavyTails) {
    recommendation += ' Consider using robust outlier detection (MAD-based).';
  }

  if (profile.isHeterogeneous) {
    recommendation += ' High variance in distances suggests mixed cluster densities.';
  }

  return {
    hopkinsScore,
    clusteringTendency,
    profile,
    recommendation,
  };
}

/**
 * Format profile as human-readable summary
 *
 * @param profile - DataStructureProfile object
 * @returns Formatted string summary
 */
export function formatProfileSummary(profile: DataStructureProfile): string {
  const lines: string[] = [
    `Data Structure Profile:`,
    `  Central: mean=${profile.mean.toFixed(3)}, median=${profile.median.toFixed(3)}`,
    `  Dispersion: std=${profile.std.toFixed(3)}, mad=${profile.mad.toFixed(3)}, iqr=${profile.iqr.toFixed(3)}`,
    `  CV: ${profile.coefficientOfVariation.toFixed(3)} (${profile.isHomogeneous ? 'homogeneous' : profile.isHeterogeneous ? 'heterogeneous' : 'moderate'})`,
    `  Shape: skewness=${profile.skewness.toFixed(3)}, kurtosis=${profile.kurtosis.toFixed(3)}`,
    `  Density: ${profile.density.toFixed(3)} (${profile.isDense ? 'dense' : profile.isSparse ? 'sparse' : 'moderate'})`,
    `  Flags: ${[
      profile.isRightSkewed ? 'right-skewed' : null,
      profile.isLeftSkewed ? 'left-skewed' : null,
      profile.hasHeavyTails ? 'heavy-tails' : null,
    ]
      .filter(Boolean)
      .join(', ') || 'none'}`,
  ];

  return lines.join('\n');
}
