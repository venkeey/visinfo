/**
 * Clustering Utility Functions
 *
 * PURPOSE: Helper functions for clustering operations
 * DEPENDENCIES: None
 * STATUS: ✅ Implemented
 */

/**
 * Calculate Euclidean distance between two vectors
 * Formula: sqrt(sum((a[i] - b[i])^2))
 *
 * @param a First vector
 * @param b Second vector
 * @returns Euclidean distance
 * @throws Error if vectors have different lengths
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vectors must have same dimension (got ${a.length} and ${b.length})`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Calculate cosine similarity between two vectors
 * Formula: (a · b) / (||a|| * ||b||)
 *
 * @param a First vector
 * @param b Second vector
 * @returns Cosine similarity (-1 to 1, higher means more similar)
 * @throws Error if vectors have different lengths
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vectors must have same dimension (got ${a.length} and ${b.length})`);
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  // Handle zero vectors
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Calculate cosine distance between two vectors
 * Distance = 1 - similarity
 *
 * @param a First vector
 * @param b Second vector
 * @returns Cosine distance (0 to 2, lower means more similar)
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/**
 * Normalize vector to unit length
 * Formula: vector / ||vector||
 *
 * @param vector Vector to normalize
 * @returns Normalized vector
 */
export function normalizeVector(vector: number[]): number[] {
  let magnitude = 0;
  for (let i = 0; i < vector.length; i++) {
    magnitude += vector[i] * vector[i];
  }

  magnitude = Math.sqrt(magnitude);

  // Handle zero vector
  if (magnitude === 0) {
    return vector.slice(); // Return copy
  }

  return vector.map((v) => v / magnitude);
}

/**
 * Calculate centroid (mean) of multiple vectors
 * Used to find cluster centers
 *
 * @param vectors Array of vectors
 * @returns Centroid vector
 * @throws Error if vectors array is empty or vectors have different lengths
 */
export function calculateCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error('Cannot calculate centroid of empty vector array');
  }

  const dimension = vectors[0].length;
  const centroid = new Array(dimension).fill(0);

  // Sum all vectors
  for (const vector of vectors) {
    if (vector.length !== dimension) {
      throw new Error(`All vectors must have same dimension (expected ${dimension}, got ${vector.length})`);
    }

    for (let i = 0; i < dimension; i++) {
      centroid[i] += vector[i];
    }
  }

  // Calculate mean
  for (let i = 0; i < dimension; i++) {
    centroid[i] /= vectors.length;
  }

  return centroid;
}

/**
 * Calculate L2-normalized centroid for cosine space
 *
 * For cosine-based clustering, the arithmetic mean centroid may not represent
 * the actual cluster center in angular space. This function computes the
 * arithmetic mean and then L2-normalizes it, which is more appropriate for
 * cosine distance clustering.
 *
 * @param vectors Array of vectors
 * @returns Normalized centroid vector (unit length)
 * @throws Error if vectors array is empty or vectors have different lengths
 */
export function calculateNormalizedCentroid(vectors: number[][]): number[] {
  const centroid = calculateCentroid(vectors);
  return normalizeVector(centroid);
}

/**
 * Find index of nearest centroid to a point
 * Used in K-means assignment step
 *
 * @param point Point to classify
 * @param centroids Array of cluster centroids
 * @param metric Distance metric ('euclidean' or 'cosine')
 * @returns Index of nearest centroid
 */
export function assignToNearestCluster(
  point: number[],
  centroids: number[][],
  metric: 'euclidean' | 'cosine' = 'euclidean'
): number {
  let minDistance = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < centroids.length; i++) {
    const distance =
      metric === 'cosine' ? cosineDistance(point, centroids[i]) : euclideanDistance(point, centroids[i]);

    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

/**
 * Calculate silhouette score for clustering quality
 * Measures how similar points are within clusters vs between clusters
 *
 * @param vectors Array of vectors
 * @param labels Cluster assignments
 * @returns Silhouette score (-1 to 1, higher is better)
 */
export function silhouetteScore(vectors: number[][], labels: number[]): number {
  const n = vectors.length;
  if (n === 0) return 0;

  const numClusters = Math.max(...labels) + 1;
  if (numClusters === 1) return 0; // Single cluster has no meaningful silhouette

  let totalScore = 0;

  for (let i = 0; i < n; i++) {
    const clusterI = labels[i];

    // Calculate a(i): average distance to points in same cluster
    let sameClusterDistances: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i !== j && labels[j] === clusterI) {
        sameClusterDistances.push(euclideanDistance(vectors[i], vectors[j]));
      }
    }

    const a_i = sameClusterDistances.length > 0 ? average(sameClusterDistances) : 0;

    // Calculate b(i): minimum average distance to points in other clusters
    let b_i = Infinity;
    for (let k = 0; k < numClusters; k++) {
      if (k === clusterI) continue;

      let otherClusterDistances: number[] = [];
      for (let j = 0; j < n; j++) {
        if (labels[j] === k) {
          otherClusterDistances.push(euclideanDistance(vectors[i], vectors[j]));
        }
      }

      if (otherClusterDistances.length > 0) {
        const avgDist = average(otherClusterDistances);
        if (avgDist < b_i) {
          b_i = avgDist;
        }
      }
    }

    // Silhouette for point i
    const s_i = b_i === Infinity ? 0 : (b_i - a_i) / Math.max(a_i, b_i);
    totalScore += s_i;
  }

  return totalScore / n;
}

/**
 * Helper: Calculate average of numbers
 */
function average(numbers: number[]): number {
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}
