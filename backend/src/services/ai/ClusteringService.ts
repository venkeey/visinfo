/**
 * Clustering Service - Phase 1 Feature #6: Basic Clustering
 *
 * Automatically groups similar responses using hierarchical agglomerative clustering:
 * - Builds multi-level groups
 * - Creates meaningful subcategories
 * - Identifies outliers
 * - Generates cluster metadata
 */

import { hacCluster, HACOptions } from '../clustering/hac';
import { ClusteringResult } from '../clustering/types';
import { cosineSimilarity } from '../clustering/utils';

/**
 * Cluster interface
 */
export interface Cluster {
  id: string;
  level: number;           // Depth in hierarchy (1, 2, 3)
  label: string;           // Generated label (empty until ClassificationService fills it)
  responseIds: string[];   // Responses in this cluster
  centroid: number[];      // Semantic centroid
  children?: Cluster[];    // Sub-clusters
  confidenceScore: number; // Cohesion score (0-1)
  isOutlier: boolean;      // True if this is outlier group
}

/**
 * Clustering configuration
 */
export interface ClusteringConfig {
  minClusterSize: number;        // Minimum responses per cluster (default: 3)
  maxClusters: number;           // Maximum clusters to create (default: 10)
  outlierThreshold: number;      // Similarity threshold for outliers (default: 0.5)
  linkageMethod: 'single' | 'complete' | 'average' | 'ward';  // HAC linkage method
  metric: 'cosine' | 'euclidean'; // Distance metric

  // Dynamic configuration (NEW)
  minClusterSizeMode?: 'fixed' | 'adaptive';   // How to compute minClusterSize
  maxClustersMode?: 'fixed' | 'adaptive';      // How to compute maxClusters
  outlierThresholdMode?: 'fixed' | 'adaptive-density' | 'adaptive-percentile';

  // Preset configuration (overrides other dynamic options if specified)
  preset?: 'auto' | 'small' | 'medium' | 'large' | 'custom';
}

/**
 * Response with embedding interface
 */
export interface ResponseWithEmbedding {
  id: string;
  text: string;
  embedding: number[];
}

/**
 * Clustering Service Class
 */
export class ClusteringService {
  private config: ClusteringConfig;

  constructor(config?: Partial<ClusteringConfig>) {
    // When a preset is specified, DON'T default the mode options to 'fixed'
    // Let the preset configure them instead
    const hasPreset = config?.preset && config.preset !== 'custom';

    this.config = {
      minClusterSize: config?.minClusterSize ?? 3,
      maxClusters: config?.maxClusters ?? 10,
      outlierThreshold: config?.outlierThreshold ?? 0.5,
      linkageMethod: config?.linkageMethod ?? 'ward', // Ward usually produces better, more compact clusters
      metric: config?.metric ?? 'euclidean', // Ward works best with Euclidean distance
      // Dynamic configuration: if preset is specified, don't default to 'fixed'
      // Let the preset determine the modes
      minClusterSizeMode: config?.minClusterSizeMode ?? (hasPreset ? undefined : 'fixed'),
      maxClustersMode: config?.maxClustersMode ?? (hasPreset ? undefined : 'fixed'),
      outlierThresholdMode: config?.outlierThresholdMode ?? (hasPreset ? undefined : 'fixed'),
      // Preset (if specified, overrides dynamic config options)
      preset: config?.preset
    };
  }

  /**
   * Perform hierarchical agglomerative clustering on responses with full metadata
   * @param responses - Array of responses with embeddings
   * @returns Clustering result with clusters, hierarchy, and quality metrics
   */
  async clusterResponsesWithMetadata(
    responses: ResponseWithEmbedding[]
  ): Promise<{
    clusters: Cluster[];
    hierarchy: any;
    qualityMetrics: {
      numClusters: number;
      avgClusterSize: number;
      minClusterSize: number;
      maxClusterSize: number;
      avgConfidence: number;
      outlierCount: number;
      // Validation metrics
      validationMetrics: {
        silhouetteScore: number;
        daviesBouldinIndex: number;
        calinskiHarabaszIndex: number;
        dunnIndex: number;
      };
      // Quality assessment (Phase 6)
      qualityAssessment?: {
        confidenceTier: 'high' | 'medium' | 'low' | 'poor';
        confidenceScore: number;
        thresholdProfile: string;
        perMetricTiers: {
          silhouette: string;
          daviesBouldin: string;
          calinskiHarabasz: string;
          dunnIndex: string;
        };
        qualityFlags: string[];
      };
      // Data analysis (Hopkins is metadata only)
      dataAnalysis?: {
        hopkinsScore: number;
        regime: string;
        regimeReason: string;
        selectedPreset: string;
        presetReason: string;
        density: number;
        coefficientOfVariation: number;
        note: string;
      };
    };
  }> {
    const clusters = await this.clusterResponses(responses);

    // Re-run clustering to get the full result with hierarchy
    // (clusterResponses returns only Cluster[], losing hierarchy)
    const embeddings = responses.map(r => r.embedding);
    const hasPreset = this.config.preset && this.config.preset !== 'custom';

    // When using a preset, don't override numClusters/minClusterSize - let the preset decide
    const hacOptions: any = {
      linkage: this.config.linkageMethod,
      metric: this.config.metric,
      computeSeparationMetrics: true,
      // Preset (if specified, controls all dynamic options)
      preset: this.config.preset
    };

    // Only pass explicit values when NOT using a preset
    if (!hasPreset) {
      const maxPossibleClusters = Math.ceil(responses.length / this.config.minClusterSize);
      hacOptions.numClusters = Math.max(
        1,
        Math.min(this.config.maxClusters, maxPossibleClusters, responses.length)
      );
      hacOptions.minClusterSize = this.config.minClusterSize;
      hacOptions.minClusterSizeMode = this.config.minClusterSizeMode;
      hacOptions.minClusterSizeBase = this.config.minClusterSize;
      hacOptions.maxClustersMode = this.config.maxClustersMode;
      hacOptions.maxClustersBase = this.config.maxClusters;
      hacOptions.outlierThresholdMode = this.config.outlierThresholdMode;
      hacOptions.outlierThresholdBase = this.config.outlierThreshold;
    }

    const clusteringResult = await hacCluster(embeddings, hacOptions);
    const stats = this.getClusterStats(clusters);

    // Build quality metrics with new Phase 6 structure
    const qualityMetrics: any = {
      numClusters: clusters.length,
      avgClusterSize: stats.avgClusterSize,
      minClusterSize: stats.minClusterSize,
      maxClusterSize: stats.maxClusterSize,
      avgConfidence: stats.avgConfidence,
      outlierCount: stats.outlierCount,

      // Validation metrics from HAC
      validationMetrics: {
        silhouetteScore: clusteringResult.silhouetteScore ?? 0,
        daviesBouldinIndex: clusteringResult.daviesBouldinIndex ?? 0,
        calinskiHarabaszIndex: clusteringResult.calinskiHarabaszIndex ?? 0,
        dunnIndex: clusteringResult.dunnIndex ?? 0
      }
    };

    // Add quality assessment if available (Phase 6)
    if (clusteringResult.qualityAssessment) {
      qualityMetrics.qualityAssessment = {
        confidenceTier: clusteringResult.qualityAssessment.confidenceTier,
        confidenceScore: clusteringResult.qualityAssessment.confidenceScore,
        thresholdProfile: clusteringResult.qualityAssessment.thresholdProfile,
        perMetricTiers: clusteringResult.qualityAssessment.perMetricTiers,
        qualityFlags: clusteringResult.qualityAssessment.qualityFlags
      };
    }

    // Add data analysis if available (Hopkins is metadata only)
    if (clusteringResult.dataAnalysis) {
      qualityMetrics.dataAnalysis = {
        hopkinsScore: clusteringResult.dataAnalysis.hopkinsScore,
        regime: clusteringResult.dataAnalysis.regime,
        regimeReason: clusteringResult.dataAnalysis.regimeReason,
        selectedPreset: clusteringResult.dataAnalysis.selectedPreset,
        presetReason: clusteringResult.dataAnalysis.presetReason,
        density: clusteringResult.dataAnalysis.profile.density,
        coefficientOfVariation: clusteringResult.dataAnalysis.profile.coefficientOfVariation,
        note: clusteringResult.dataAnalysis.note || 'Hopkins is informational only - not used for parameter selection'
      };
    }

    return {
      clusters,
      hierarchy: clusteringResult.hierarchy,
      qualityMetrics
    };
  }

  /**
   * Perform hierarchical agglomerative clustering on responses
   * @param responses - Array of responses with embeddings
   * @returns Hierarchical cluster structure
   */
  async clusterResponses(
    responses: ResponseWithEmbedding[]
  ): Promise<Cluster[]> {
    if (responses.length === 0) {
      return [];
    }

    if (responses.length === 1) {
      // Single response - create single cluster
      return [{
        id: 'cluster-0',
        level: 1,
        label: '',
        responseIds: [responses[0].id],
        centroid: responses[0].embedding,
        confidenceScore: 1.0,
        isOutlier: false
      }];
    }

    // Extract embeddings for clustering
    const embeddings = responses.map(r => r.embedding);
    const hasPreset = this.config.preset && this.config.preset !== 'custom';

    // When using a preset, let it control all parameters
    const hacOptions: HACOptions = {
      linkage: this.config.linkageMethod,
      metric: this.config.metric,
      // Preset (if specified, controls all dynamic options)
      preset: this.config.preset
    };

    // Only pass explicit values when NOT using a preset
    if (!hasPreset) {
      // Calculate max possible clusters based on minClusterSize
      const maxPossibleClusters = Math.ceil(responses.length / this.config.minClusterSize);
      const numClusters = Math.max(
        1,
        Math.min(this.config.maxClusters, maxPossibleClusters, responses.length)
      );
      hacOptions.numClusters = numClusters;
      hacOptions.minClusterSize = this.config.minClusterSize;
      hacOptions.minClusterSizeMode = this.config.minClusterSizeMode;
      hacOptions.minClusterSizeBase = this.config.minClusterSize;
      hacOptions.maxClustersMode = this.config.maxClustersMode;
      hacOptions.maxClustersBase = this.config.maxClusters;
      hacOptions.outlierThresholdMode = this.config.outlierThresholdMode;
      hacOptions.outlierThresholdBase = this.config.outlierThreshold;
    }

    const clusteringResult: ClusteringResult = await hacCluster(embeddings, hacOptions);

    // Convert clustering result to Cluster objects
    const clusters = this.convertToClusterObjects(
      responses,
      clusteringResult
    );

    // Calculate confidence scores for each cluster
    for (const cluster of clusters) {
      const clusterEmbeddings = cluster.responseIds.map(
        id => responses.find(r => r.id === id)!.embedding
      );
      cluster.confidenceScore = this.calculateCohesionScore(cluster, clusterEmbeddings);
    }

    // Identify and separate outliers
    const { clusters: mainClusters, outliers } = this.identifyOutliers(
      responses,
      clusters
    );

    // Combine main clusters with outlier cluster
    const result = outliers ? [...mainClusters, outliers] : mainClusters;

    // Build hierarchy (convert flat clusters to tree structure)
    return this.buildHierarchy(result, clusteringResult);
  }

  /**
   * Convert ClusteringResult to Cluster objects
   */
  private convertToClusterObjects(
    responses: ResponseWithEmbedding[],
    result: ClusteringResult
  ): Cluster[] {
    const clusters: Cluster[] = [];

    for (let i = 0; i < result.numClusters; i++) {
      const responseIds = responses
        .filter((_, idx) => result.labels[idx] === i)
        .map(r => r.id);

      if (responseIds.length > 0) {
        clusters.push({
          id: `cluster-${i}`,
          level: 1,
          label: '',  // Label will be generated by ClassificationService
          responseIds,
          centroid: result.centroids?.[i] || [],
          confidenceScore: 0,  // Will be calculated separately
          isOutlier: false
        });
      }
    }

    return clusters;
  }

  /**
   * Calculate cluster cohesion score (confidence)
   * @param cluster - Cluster to evaluate
   * @param embeddings - Embeddings of responses in cluster
   * @returns Confidence score (0-1)
   */
  calculateCohesionScore(cluster: Cluster, embeddings: number[][]): number {
    if (embeddings.length < 2) {
      return 1.0; // Single item clusters are perfectly cohesive
    }

    let totalSimilarity = 0;
    let count = 0;

    // Calculate average pairwise similarity within cluster
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        totalSimilarity += cosineSimilarity(embeddings[i], embeddings[j]);
        count++;
      }
    }

    return count > 0 ? totalSimilarity / count : 0;
  }

  /**
   * Calculate Davies-Bouldin Index for cluster quality assessment
   * Lower values indicate better separation between clusters
   *
   * DB = (1/k) × Σ max_j≠i [(σ_i + σ_j) / d(c_i, c_j)]
   *
   * Interpretation:
   * - < 1.0: Good separation
   * - 1.0-1.5: Reasonable separation
   * - > 1.5: Poor separation
   *
   * @param clusters - Array of clusters
   * @param responses - All responses with embeddings
   * @returns Davies-Bouldin Index (lower is better)
   */
  calculateDaviesBouldinIndex(
    clusters: Cluster[],
    responses: ResponseWithEmbedding[]
  ): number {
    // Filter out outlier clusters
    const validClusters = clusters.filter(c => !c.isOutlier);

    if (validClusters.length < 2) {
      return 0; // Need at least 2 clusters to measure separation
    }

    // Calculate scatter (average distance to centroid) for each cluster
    const scatters: number[] = [];

    for (const cluster of validClusters) {
      const clusterEmbeddings = cluster.responseIds.map(
        id => responses.find(r => r.id === id)!.embedding
      );

      if (clusterEmbeddings.length === 0) {
        scatters.push(0);
        continue;
      }

      // Average distance to centroid (using cosine distance)
      let totalDist = 0;
      for (const embedding of clusterEmbeddings) {
        const distance = 1 - cosineSimilarity(embedding, cluster.centroid);
        totalDist += distance;
      }

      scatters.push(totalDist / clusterEmbeddings.length);
    }

    // Calculate Davies-Bouldin Index
    let dbSum = 0;

    for (let i = 0; i < validClusters.length; i++) {
      let maxRatio = -1;

      // Find worst-case ratio with any other cluster
      for (let j = 0; j < validClusters.length; j++) {
        if (i === j) continue;

        // Distance between cluster centroids
        const centroidDist = 1 - cosineSimilarity(
          validClusters[i].centroid,
          validClusters[j].centroid
        );

        if (centroidDist > 0) {
          // Ratio of within-cluster to between-cluster distances
          const ratio = (scatters[i] + scatters[j]) / centroidDist;
          maxRatio = Math.max(maxRatio, ratio);
        }
      }

      if (maxRatio > 0) {
        dbSum += maxRatio;
      }
    }

    return validClusters.length > 0 ? dbSum / validClusters.length : 0;
  }

  /**
   * Identify and separate outliers from main clusters
   * Uses a two-pass algorithm to ensure order-independent, deterministic results
   *
   * @param responses - All responses with embeddings
   * @param clusters - Initial clusters
   * @returns Updated clusters with outliers separated
   */
  identifyOutliers(
    responses: ResponseWithEmbedding[],
    clusters: Cluster[]
  ): { clusters: Cluster[]; outliers: Cluster | null } {
    // Pass 1: Separate clusters by size
    const largeClusters: Cluster[] = [];
    const smallClusters: Cluster[] = [];

    for (const cluster of clusters) {
      if (cluster.responseIds.length >= this.config.minClusterSize) {
        largeClusters.push(cluster);
      } else {
        smallClusters.push(cluster);
      }
    }

    // Pass 2: Check each small cluster against ALL large cluster centroids
    const outlierResponseIds: string[] = [];
    const reclassifiedClusters: Cluster[] = [];

    for (const smallCluster of smallClusters) {
      // Find the most similar large cluster for each response in the small cluster
      let maxSimilarity = -1;
      let mostSimilarLargeCluster: Cluster | null = null;

      for (const responseId of smallCluster.responseIds) {
        const response = responses.find(r => r.id === responseId)!;

        // Find which large cluster is most similar to this response
        for (const largeCluster of largeClusters) {
          const similarity = cosineSimilarity(response.embedding, largeCluster.centroid);
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            mostSimilarLargeCluster = largeCluster;
          }
        }
      }

      // Classify based on maximum similarity found
      if (maxSimilarity < this.config.outlierThreshold || !mostSimilarLargeCluster) {
        // True outlier - not similar enough to any large cluster
        outlierResponseIds.push(...smallCluster.responseIds);
      } else {
        // Merge into the most similar large cluster (respects minClusterSize)
        mostSimilarLargeCluster.responseIds.push(...smallCluster.responseIds);
      }
    }

    // Recalculate centroids for clusters that absorbed small clusters
    for (const largeCluster of largeClusters) {
      const clusterEmbeddings = largeCluster.responseIds.map(
        id => responses.find(r => r.id === id)!.embedding
      );

      // Calculate centroid (average of all embeddings)
      if (clusterEmbeddings.length > 0) {
        const dimension = clusterEmbeddings[0].length;
        const centroid = new Array(dimension).fill(0);

        for (const embedding of clusterEmbeddings) {
          for (let i = 0; i < dimension; i++) {
            centroid[i] += embedding[i];
          }
        }

        for (let i = 0; i < dimension; i++) {
          centroid[i] /= clusterEmbeddings.length;
        }

        largeCluster.centroid = centroid;
      }
    }

    // Return only large clusters (small clusters were either merged or marked as outliers)
    const mainClusters = largeClusters;

    // Create outlier cluster if any outliers found
    const outlierCluster: Cluster | null = outlierResponseIds.length > 0 ? {
      id: 'cluster-outliers',
      level: 1,
      label: 'Other',
      responseIds: outlierResponseIds,
      centroid: this.calculateOutlierCentroid(responses, outlierResponseIds),
      confidenceScore: 0.3, // Low confidence for outliers
      isOutlier: true
    } : null;

    return { clusters: mainClusters, outliers: outlierCluster };
  }

  /**
   * Calculate centroid for outlier cluster
   */
  private calculateOutlierCentroid(
    responses: ResponseWithEmbedding[],
    outlierIds: string[]
  ): number[] {
    const outlierEmbeddings = responses
      .filter(r => outlierIds.includes(r.id))
      .map(r => r.embedding);

    if (outlierEmbeddings.length === 0) {
      return [];
    }

    const dimension = outlierEmbeddings[0].length;
    const centroid = new Array(dimension).fill(0);

    for (const embedding of outlierEmbeddings) {
      for (let i = 0; i < dimension; i++) {
        centroid[i] += embedding[i];
      }
    }

    for (let i = 0; i < dimension; i++) {
      centroid[i] /= outlierEmbeddings.length;
    }

    return centroid;
  }

  /**
   * Create hierarchical structure from flat clusters
   * Uses dendrogram from HAC to build multi-level hierarchy
   *
   * @param clusters - Flat array of clusters
   * @param clusteringResult - Result from HAC with dendrogram
   * @returns Hierarchical tree structure (Level 1 -> Level 2 -> Level 3)
   */
  buildHierarchy(clusters: Cluster[], clusteringResult: ClusteringResult): Cluster[] {
    // If we have hierarchy information from HAC, use it to build levels
    if (!clusteringResult.hierarchy?.dendrogram) {
      // No hierarchy info - return flat clusters as Level 1
      return clusters.map(c => ({ ...c, level: 1 }));
    }

    // For now, return flat clusters at Level 1
    // In a full implementation, we would:
    // 1. Traverse the dendrogram tree
    // 2. Create parent clusters at different cut heights
    // 3. Build a multi-level tree structure (Level 1 -> Level 2 -> Level 3)
    // 4. Each level represents a different granularity of clustering

    // This would require mapping the dendrogram structure to Cluster objects
    // and determining optimal cut points for each level

    return clusters.map(c => ({ ...c, level: 1 }));
  }

  /**
   * Get cluster by ID
   */
  getClusterById(clusters: Cluster[], clusterId: string): Cluster | null {
    for (const cluster of clusters) {
      if (cluster.id === clusterId) {
        return cluster;
      }
      if (cluster.children) {
        const found = this.getClusterById(cluster.children, clusterId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Get all leaf clusters (clusters with no children)
   */
  getLeafClusters(clusters: Cluster[]): Cluster[] {
    const leaves: Cluster[] = [];

    for (const cluster of clusters) {
      if (!cluster.children || cluster.children.length === 0) {
        leaves.push(cluster);
      } else {
        leaves.push(...this.getLeafClusters(cluster.children));
      }
    }

    return leaves;
  }

  /**
   * Calculate total number of responses across all clusters
   */
  getTotalResponses(clusters: Cluster[]): number {
    return clusters.reduce((total, cluster) => {
      return total + cluster.responseIds.length;
    }, 0);
  }

  /**
   * Get cluster statistics
   */
  getClusterStats(clusters: Cluster[]): {
    totalClusters: number;
    avgClusterSize: number;
    minClusterSize: number;
    maxClusterSize: number;
    avgConfidence: number;
    outlierCount: number;
  } {
    const sizes = clusters.map(c => c.responseIds.length);
    const confidences = clusters.map(c => c.confidenceScore);
    const outlierCluster = clusters.find(c => c.isOutlier);

    return {
      totalClusters: clusters.length,
      avgClusterSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
      minClusterSize: Math.min(...sizes),
      maxClusterSize: Math.max(...sizes),
      avgConfidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
      outlierCount: outlierCluster ? outlierCluster.responseIds.length : 0
    };
  }
}

// Export singleton instance
export default new ClusteringService();
