/**
 * HAC Metric Calculations
 *
 * Functions for calculating distances, silhouette scores, cluster sizes, and centroids.
 */

import { euclideanDistance, cosineSimilarity, calculateCentroid, calculateNormalizedCentroid } from '../utils';

/**
 * Build distance matrix for clustering
 *
 * @param vectors - Data vectors
 * @param metric - Distance metric to use
 * @returns Symmetric distance matrix
 */
export function buildDistanceMatrix(
  vectors: number[][],
  metric: 'cosine' | 'euclidean'
): number[][] {
  const n = vectors.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  // Calculate pairwise distances
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let distance: number;

      if (metric === 'cosine') {
        // Cosine distance = 1 - cosine similarity
        const similarity = cosineSimilarity(vectors[i], vectors[j]);
        distance = 1 - similarity;
      } else {
        distance = euclideanDistance(vectors[i], vectors[j]);
      }

      // Matrix is symmetric
      matrix[i][j] = distance;
      matrix[j][i] = distance;
    }
  }

  return matrix;
}

/**
 * Calculate silhouette score efficiently using pre-computed distance matrix
 * This is significantly faster than recalculating distances: O(n²) vs O(n²k)
 *
 * @param distanceMatrix - Pre-computed pairwise distance matrix
 * @param labels - Cluster assignments for each point
 * @param numClusters - Total number of clusters
 * @returns Silhouette score between -1 and 1 (higher is better)
 */
export function calculateSilhouetteScoreEfficient(
  distanceMatrix: number[][],
  labels: number[],
  numClusters: number
): number {
  const n = distanceMatrix.length;

  if (n < 2 || numClusters < 2) {
    return 1.0; // Perfect score for trivial cases
  }

  // Pre-compute cluster membership for O(1) lookup
  const clusterMembers: number[][] = Array(numClusters)
    .fill(0)
    .map(() => []);

  labels.forEach((label, idx) => {
    if (label >= 0 && label < numClusters) {
      clusterMembers[label].push(idx);
    }
  });

  let totalSilhouette = 0;
  let validPoints = 0;

  // For each point i
  for (let i = 0; i < n; i++) {
    const clusterLabel = labels[i];
    if (clusterLabel < 0 || clusterLabel >= numClusters) continue;

    const sameCluster = clusterMembers[clusterLabel];

    // Skip singleton clusters (can't calculate a(i) meaningfully)
    if (sameCluster.length <= 1) continue;

    // a(i): average distance to points in same cluster (excluding self)
    let a_i = 0;
    for (const j of sameCluster) {
      if (i !== j) {
        a_i += distanceMatrix[i][j];
      }
    }
    a_i /= (sameCluster.length - 1);

    // b(i): minimum average distance to points in other clusters
    let b_i = Infinity;
    for (let k = 0; k < numClusters; k++) {
      if (k === clusterLabel) continue;

      const otherCluster = clusterMembers[k];
      if (otherCluster.length === 0) continue;

      // Calculate average distance to this other cluster
      let avgDist = 0;
      for (const j of otherCluster) {
        avgDist += distanceMatrix[i][j];
      }
      avgDist /= otherCluster.length;

      b_i = Math.min(b_i, avgDist);
    }

    // Skip if no other cluster found
    if (b_i === Infinity) continue;

    // s(i) = (b(i) - a(i)) / max(a(i), b(i))
    const s_i = (b_i - a_i) / Math.max(a_i, b_i);
    totalSilhouette += s_i;
    validPoints++;
  }

  return validPoints > 0 ? totalSilhouette / validPoints : 0;
}

/**
 * Calculate cluster sizes from labels
 *
 * @param labels - Cluster assignments for each point
 * @returns Array where index is cluster ID and value is size
 */
export function calculateClusterSizes(labels: number[]): number[] {
  // Handle edge case: empty labels array
  if (labels.length === 0) {
    return [];
  }

  const maxClusterId = Math.max(...labels);

  // Handle edge case: invalid maxClusterId (NaN, Infinity, etc.)
  if (!isFinite(maxClusterId) || maxClusterId < 0) {
    console.error('Invalid maxClusterId:', maxClusterId, 'from labels:', labels);
    return [];
  }

  const sizes = new Array(maxClusterId + 1).fill(0);

  // Count how many points in each cluster
  for (const label of labels) {
    if (isFinite(label) && label >= 0) {
      sizes[label]++;
    }
  }

  return sizes;
}

/**
 * Calculate centroids for each cluster
 *
 * @param vectors - Original data vectors
 * @param labels - Cluster assignments
 * @param numClusters - Number of clusters
 * @param metric - Distance metric used for clustering (affects centroid computation)
 * @returns Array of centroid vectors
 */
export function calculateCentroids(
  vectors: number[][],
  labels: number[],
  numClusters: number,
  metric: 'euclidean' | 'cosine' = 'euclidean'
): number[][] {
  const centroids: number[][] = [];

  // For cosine distance, use normalized centroids for better representation
  // in angular space. For Euclidean, use standard arithmetic mean.
  const centroidFn = metric === 'cosine' ? calculateNormalizedCentroid : calculateCentroid;

  // For each cluster, find all vectors with that label and calculate centroid
  for (let clusterId = 0; clusterId < numClusters; clusterId++) {
    const clusterVectors = vectors.filter((_, index) => labels[index] === clusterId);

    if (clusterVectors.length > 0) {
      centroids.push(centroidFn(clusterVectors));
    } else {
      // Empty cluster - shouldn't happen with HAC, but handle gracefully
      centroids.push(new Array(vectors[0].length).fill(0));
    }
  }

  return centroids;
}
