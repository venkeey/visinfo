/**
 * Classification Service - Phase 1 Feature #4: Basic Hierarchical Classification
 *
 * Orchestrates the full AI classification pipeline:
 * 1. Generate embeddings for responses
 * 2. Cluster similar responses
 * 3. Build hierarchical tree structure
 * 4. Generate labels for clusters
 * 5. Store results in database
 */

import ClusteringService, { Cluster, ResponseWithEmbedding } from './ClusteringService';
import { cosineSimilarity } from '../clustering/utils';
import { labelingService } from '../../ai/services/labelingService';

/**
 * Classification result interface
 */
export interface ClassificationResult {
  pollId: string;
  totalResponses: number;
  classified: number;
  failed: number;
  hierarchyRootIds: string[];  // IDs of top-level category nodes
  processingTimeMs: number;
  clusters: Cluster[];
}

/**
 * Response interface (matches expected model structure)
 */
interface IResponse {
  id: string;
  pollId: string;
  freeFormText?: string;
  semanticEmbedding?: number[];
  classified: boolean;
  classificationPath?: {
    level1?: string;
    level2?: string;
    level3?: string;
  };
  confidenceScores?: {
    level1?: number;
    level2?: number;
    level3?: number;
  };
  clusterId?: string;
  isOutlier?: boolean;
  save?: () => Promise<any>;
}

/**
 * HierarchyNode interface (matches expected model structure)
 */
interface IHierarchyNode {
  id: string;
  pollId: string;
  level: 'category' | 'subcategory' | 'cluster' | 'response';
  depth: number;
  parentId?: string;
  path: string[];
  label: string;
  description?: string;
  responseCount: number;
  directResponseCount: number;
  confidenceScore?: number;
  semanticCentroid?: number[];
  averageSimilarity?: number;
  responseIds?: string[];
  isOutlierGroup?: boolean;
}

/**
 * Poll interface (matches expected model structure)
 */
interface IPoll {
  id: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  responseCount: number;
  uniqueRespondents: number;
}

/**
 * Classification Service Class
 */
export class ClassificationService {
  private clusteringService: typeof ClusteringService;

  // Placeholder for SemanticSimilarityService (to be implemented)
  private semanticService: any;

  // Placeholder for database models (to be implemented)
  private ResponseModel: any;
  private HierarchyNodeModel: any;
  private PollModel: any;

  constructor() {
    this.clusteringService = ClusteringService;

    // These will be injected when models are implemented
    this.semanticService = null;
    this.ResponseModel = null;
    this.HierarchyNodeModel = null;
    this.PollModel = null;
  }

  /**
   * Set database models (for dependency injection)
   */
  setModels(models: { Response: any; HierarchyNode: any; Poll: any }) {
    this.ResponseModel = models.Response;
    this.HierarchyNodeModel = models.HierarchyNode;
    this.PollModel = models.Poll;
  }

  /**
   * Set semantic service (for dependency injection)
   */
  setSemanticService(service: any) {
    this.semanticService = service;
  }

  /**
   * Main classification pipeline for a poll
   * Processes all unclassified free-form responses and builds hierarchy
   *
   * @param pollId - Poll ID to process
   * @returns Classification results
   */
  async classifyPollResponses(pollId: string): Promise<ClassificationResult> {
    const startTime = Date.now();

    // 1. Update poll processing status (if models available)
    if (this.PollModel) {
      await this.updatePollStatus(pollId, 'processing');
    }

    try {
      // 2. Fetch all unclassified free-form responses
      const responses = await this.fetchUnclassifiedResponses(pollId);

      if (responses.length === 0) {
        throw new Error('No unclassified responses found');
      }

      console.log(`[Classification] Processing ${responses.length} responses for poll ${pollId}`);

      // 3. Generate embeddings for each response
      const responsesWithEmbeddings = await this.generateEmbeddings(responses);

      if (responsesWithEmbeddings.length === 0) {
        throw new Error('Failed to generate embeddings for any responses');
      }

      console.log(`[Classification] Generated ${responsesWithEmbeddings.length} embeddings`);

      // 4. Cluster responses
      const clusters = await this.clusteringService.clusterResponses(responsesWithEmbeddings);

      console.log(`[Classification] Created ${clusters.length} clusters`);

      // 5. Generate labels for clusters
      await this.generateClusterLabels(clusters, responsesWithEmbeddings);

      // 6. Build hierarchy nodes (if models available)
      let hierarchyRootIds: string[] = [];
      if (this.HierarchyNodeModel) {
        hierarchyRootIds = await this.buildHierarchyNodes(pollId, clusters);
      }

      // 7. Update responses with classification paths (if models available)
      if (this.ResponseModel) {
        await this.updateResponseClassifications(responses, clusters);
      }

      // 8. Update poll metadata (if models available)
      if (this.PollModel) {
        await this.updatePollMetadata(pollId);
        await this.updatePollStatus(pollId, 'completed');
      }

      const result: ClassificationResult = {
        pollId,
        totalResponses: responses.length,
        classified: responsesWithEmbeddings.length,
        failed: responses.length - responsesWithEmbeddings.length,
        hierarchyRootIds,
        processingTimeMs: Date.now() - startTime,
        clusters
      };

      console.log(`[Classification] Completed in ${result.processingTimeMs}ms`);

      return result;
    } catch (error) {
      // Update poll status to failed (if models available)
      if (this.PollModel) {
        await this.updatePollStatus(pollId, 'failed');
      }
      throw error;
    }
  }

  /**
   * Fetch unclassified responses for a poll
   */
  private async fetchUnclassifiedResponses(pollId: string): Promise<IResponse[]> {
    if (this.ResponseModel) {
      return await this.ResponseModel.find({
        pollId,
        classified: false,
        freeFormText: { $exists: true, $ne: null }
      });
    }

    // Mock data for testing when models not available
    console.warn('[Classification] ResponseModel not available, using mock data');
    return [];
  }

  /**
   * Generate embeddings for all responses
   * @param responses - Array of response documents
   * @returns Responses with embeddings added
   */
  private async generateEmbeddings(
    responses: IResponse[]
  ): Promise<ResponseWithEmbedding[]> {
    const responsesWithEmbeddings: ResponseWithEmbedding[] = [];

    for (const response of responses) {
      try {
        let embedding: number[];

        // Check if response already has embedding
        if (response.semanticEmbedding && response.semanticEmbedding.length > 0) {
          embedding = response.semanticEmbedding;
        } else if (this.semanticService) {
          // Generate new embedding using semantic service
          embedding = await this.semanticService.generateEmbedding(
            response.freeFormText || ''
          );

          // Save embedding to response document
          if (response.save) {
            response.semanticEmbedding = embedding;
            await response.save();
          }
        } else {
          // No semantic service available - skip this response
          console.warn(`[Classification] Cannot generate embedding for response ${response.id}: No semantic service`);
          continue;
        }

        responsesWithEmbeddings.push({
          id: response.id,
          text: response.freeFormText || '',
          embedding
        });
      } catch (error) {
        console.error(`[Classification] Failed to generate embedding for response ${response.id}:`, error);
      }
    }

    return responsesWithEmbeddings;
  }

  /**
   * Generate labels for clusters using AI or heuristics
   * @param clusters - Array of clusters
   * @param responses - Responses with embeddings
   */
  private async generateClusterLabels(
    clusters: Cluster[],
    responses: ResponseWithEmbedding[]
  ): Promise<void> {
    for (const cluster of clusters) {
      if (cluster.label && cluster.label.length > 0) {
        continue; // Already has label (e.g., "Other" for outliers)
      }

      // Get response texts for this cluster
      const clusterTexts = cluster.responseIds
        .map(id => responses.find(r => r.id === id)?.text)
        .filter(Boolean) as string[];

      if (clusterTexts.length === 0) {
        cluster.label = `Cluster ${cluster.id}`;
        continue;
      }

      // For now, use the most representative response as label
      // In the future, this could use AI to generate a summary label
      cluster.label = await this.generateLabelFromTexts(clusterTexts, cluster.id);
    }
  }

  /**
   * Generate label from cluster texts
   * Hybrid approach: AI generation → TF-IDF keywords → Shortest text fallback
   */
  private async generateLabelFromTexts(texts: string[], clusterId: string): Promise<string> {
    if (texts.length === 0) {
      return `Cluster ${clusterId}`;
    }

    // Strategy 1: Try AI generation (best quality)
    // Only use AI for clusters with 3+ responses (provides better context)
    if (texts.length >= 3) {
      try {
        const aiLabel = await this.generateAILabel(texts);
        if (aiLabel && aiLabel.length >= 3) {
          console.log(`[Classification] AI-generated label for ${clusterId}: "${aiLabel}"`);
          return aiLabel;
        }
      } catch (error) {
        console.warn(`[Classification] AI label generation failed for ${clusterId}, using fallback:`, error);
      }
    }

    // Strategy 2: Extract keywords with TF-IDF
    const keywords = this.extractKeywords(texts);
    if (keywords.length >= 2) {
      const label = keywords.slice(0, 3).join(' ')
        .replace(/^\w/, c => c.toUpperCase());
      console.log(`[Classification] TF-IDF label for ${clusterId}: "${label}"`);
      return label;
    }

    // Strategy 3: Fallback to shortest text
    const sorted = [...texts].sort((a, b) => a.length - b.length);
    const representative = sorted[0];

    // Truncate if too long
    const maxLength = 50;
    const label = representative.length > maxLength
      ? representative.substring(0, maxLength) + '...'
      : representative;

    console.log(`[Classification] Fallback label for ${clusterId}: "${label}"`);
    return label;
  }

  /**
   * Generate AI-powered label for cluster
   *
   * Flow: ClassificationService → LabelingService → getDefaultProvider() → BaseProvider.chat()
   *
   * The base provider (BaseAIProvider) handles:
   * - Provider selection (Gemini/OpenAI/OpenRouter based on .env AI_PROVIDER)
   * - Retry logic with exponential backoff
   * - Error handling and validation
   * - API calls through provider.chat()
   */
  private async generateAILabel(texts: string[]): Promise<string | null> {
    try {
      // Limit to 15 samples to avoid huge prompts
      const samples = texts.slice(0, 15);

      // Use LabelingService which routes through base provider
      // Flow: labelingService.labelCluster()
      //    → getDefaultProvider()
      //    → provider.chat()
      //    → BaseAIProvider.chat() implementation
      const result = await labelingService.labelCluster({
        samples,
        context: 'Poll response feedback',
        maxSamples: 15
      });

      // Extract and validate the label
      const label = result.label?.trim();

      if (!label || label.length < 3 || label.length > 60 || label === 'Unknown') {
        return null;
      }

      // Ensure title case formatting
      const titleCaseLabel = label.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      return titleCaseLabel;
    } catch (error) {
      console.error('[Classification] AI label generation error:', error);
      console.error('[Classification] Falling back to TF-IDF keywords');
      return null;
    }
  }

  /**
   * Extract keywords using TF-IDF (Term Frequency-Inverse Document Frequency)
   * Identifies the most important/distinctive words in cluster responses
   */
  private extractKeywords(texts: string[]): string[] {
    if (texts.length === 0) {
      return [];
    }

    // Common stop words to ignore
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
      'when', 'where', 'why', 'how', 'very', 'too', 'also', 'just', 'so'
    ]);

    // 1. Tokenize and count word frequencies in this cluster
    const wordFreq = new Map<string, number>();
    const wordTexts = new Map<string, Set<number>>(); // Track which texts contain each word

    texts.forEach((text, textIdx) => {
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')  // Remove punctuation
        .match(/\b\w+\b/g) || [];

      const uniqueWords = new Set<string>();

      for (const word of words) {
        // Skip stop words and short words
        if (stopWords.has(word) || word.length <= 2) {
          continue;
        }

        uniqueWords.add(word);
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }

      // Track which texts contain each word (for IDF calculation)
      uniqueWords.forEach(word => {
        if (!wordTexts.has(word)) {
          wordTexts.set(word, new Set());
        }
        wordTexts.get(word)!.add(textIdx);
      });
    });

    // 2. Calculate TF-IDF scores
    const tfidfScores = new Map<string, number>();
    const totalTexts = texts.length;

    for (const [word, freq] of wordFreq.entries()) {
      // Term Frequency: How often the word appears
      const tf = freq / texts.length;

      // Inverse Document Frequency: How unique the word is
      const textsContainingWord = wordTexts.get(word)!.size;
      const idf = Math.log(totalTexts / (1 + textsContainingWord));

      // TF-IDF score
      const tfidf = tf * idf;
      tfidfScores.set(word, tfidf);
    }

    // 3. Sort by TF-IDF score and get top keywords
    const sortedKeywords = Array.from(tfidfScores.entries())
      .sort((a, b) => b[1] - a[1])  // Sort by score descending
      .map(([word]) => word);

    // 4. Return top 3 keywords
    return sortedKeywords.slice(0, 3);
  }

  /**
   * Build hierarchy nodes from clusters
   * @param pollId - Poll ID
   * @param clusters - Cluster tree structure
   * @returns Array of root node IDs
   */
  private async buildHierarchyNodes(
    pollId: string,
    clusters: Cluster[]
  ): Promise<string[]> {
    if (!this.HierarchyNodeModel) {
      console.warn('[Classification] HierarchyNodeModel not available');
      return [];
    }

    const rootNodeIds: string[] = [];

    // Create hierarchy nodes for each cluster
    for (const cluster of clusters) {
      const nodeId = `node-${pollId}-${cluster.id}`;

      const hierarchyNode: IHierarchyNode = {
        id: nodeId,
        pollId,
        level: 'cluster',
        depth: cluster.level,
        parentId: undefined, // TODO: Set parent when building multi-level hierarchy
        path: [cluster.label],
        label: cluster.label,
        responseCount: cluster.responseIds.length,
        directResponseCount: cluster.responseIds.length,
        confidenceScore: cluster.confidenceScore,
        semanticCentroid: cluster.centroid,
        responseIds: cluster.responseIds,
        isOutlierGroup: cluster.isOutlier
      };

      await this.HierarchyNodeModel.create(hierarchyNode);
      rootNodeIds.push(nodeId);

      // Recursively create child nodes if present
      if (cluster.children && cluster.children.length > 0) {
        await this.buildChildNodes(pollId, cluster.children, nodeId, [cluster.label]);
      }
    }

    return rootNodeIds;
  }

  /**
   * Build child hierarchy nodes recursively
   */
  private async buildChildNodes(
    pollId: string,
    children: Cluster[],
    parentId: string,
    parentPath: string[]
  ): Promise<void> {
    if (!this.HierarchyNodeModel) return;

    for (const child of children) {
      const nodeId = `node-${pollId}-${child.id}`;
      const path = [...parentPath, child.label];

      const hierarchyNode: IHierarchyNode = {
        id: nodeId,
        pollId,
        level: 'cluster',
        depth: child.level,
        parentId,
        path,
        label: child.label,
        responseCount: child.responseIds.length,
        directResponseCount: child.responseIds.length,
        confidenceScore: child.confidenceScore,
        semanticCentroid: child.centroid,
        responseIds: child.responseIds,
        isOutlierGroup: child.isOutlier
      };

      await this.HierarchyNodeModel.create(hierarchyNode);

      // Recursively create grandchildren
      if (child.children && child.children.length > 0) {
        await this.buildChildNodes(pollId, child.children, nodeId, path);
      }
    }
  }

  /**
   * Update response documents with classification paths
   * @param responses - Responses with embeddings
   * @param clusters - Cluster structure
   */
  private async updateResponseClassifications(
    responses: IResponse[],
    clusters: Cluster[]
  ): Promise<void> {
    if (!this.ResponseModel) {
      console.warn('[Classification] ResponseModel not available');
      return;
    }

    // Create mapping of response ID to cluster
    const responseToCluster = new Map<string, Cluster>();
    this.mapResponsesToClusters(clusters, responseToCluster);

    // Update each response
    for (const response of responses) {
      const cluster = responseToCluster.get(response.id);

      if (cluster) {
        // Build classification path
        const path = this.buildClassificationPath(cluster, clusters);

        response.classified = true;
        response.classificationPath = {
          level1: path[0] || cluster.label,
          level2: path[1],
          level3: path[2]
        };
        response.confidenceScores = {
          level1: cluster.confidenceScore,
          level2: cluster.confidenceScore,
          level3: cluster.confidenceScore
        };
        response.clusterId = cluster.id;
        response.isOutlier = cluster.isOutlier;

        if (response.save) {
          await response.save();
        }
      }
    }
  }

  /**
   * Map responses to their clusters recursively
   */
  private mapResponsesToClusters(
    clusters: Cluster[],
    map: Map<string, Cluster>
  ): void {
    for (const cluster of clusters) {
      for (const responseId of cluster.responseIds) {
        map.set(responseId, cluster);
      }

      if (cluster.children) {
        this.mapResponsesToClusters(cluster.children, map);
      }
    }
  }

  /**
   * Build classification path for a cluster
   */
  private buildClassificationPath(cluster: Cluster, allClusters: Cluster[]): string[] {
    // For now, just return the cluster label
    // In a full implementation, this would traverse the hierarchy
    return [cluster.label];
  }

  /**
   * Update poll metadata after classification
   * @param pollId - Poll ID
   */
  private async updatePollMetadata(pollId: string): Promise<void> {
    if (!this.PollModel || !this.ResponseModel) {
      console.warn('[Classification] Models not available for metadata update');
      return;
    }

    // Count total responses
    const responseCount = await this.ResponseModel.countDocuments({ pollId });

    // Count unique respondents (non-anonymous)
    const uniqueRespondents = await this.ResponseModel.distinct('respondentId', {
      pollId,
      respondentId: { $exists: true, $ne: null }
    }).then((ids: any[]) => ids.length);

    // Update poll
    await this.PollModel.findOneAndUpdate(
      { id: pollId },
      {
        responseCount,
        uniqueRespondents
      }
    );
  }

  /**
   * Update poll processing status
   */
  private async updatePollStatus(
    pollId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    if (!this.PollModel) return;

    await this.PollModel.findOneAndUpdate(
      { id: pollId },
      { processingStatus: status }
    );
  }

  /**
   * Incrementally classify a single new response
   * (Real-time classification as responses arrive)
   *
   * @param responseId - Response ID to classify
   * @param pollId - Poll ID
   * @returns Classification path
   */
  async classifySingleResponse(
    responseId: string,
    pollId: string
  ): Promise<{ clusterId: string; path: string[]; confidence: number } | null> {
    if (!this.ResponseModel) {
      console.warn('[Classification] ResponseModel not available');
      return null;
    }

    // 1. Get response
    const response = await this.ResponseModel.findOne({ id: responseId });
    if (!response || !response.freeFormText) {
      return null;
    }

    // 2. Generate embedding if not present
    let embedding = response.semanticEmbedding;
    if (!embedding && this.semanticService) {
      embedding = await this.semanticService.generateEmbedding(response.freeFormText);
      response.semanticEmbedding = embedding;
      await response.save();
    }

    if (!embedding) {
      return null;
    }

    // 3. Get existing clusters for this poll
    const existingClusters = await this.getExistingClusters(pollId);

    if (existingClusters.length === 0) {
      // No existing clusters - need to run full classification first
      return null;
    }

    // 4. Find most similar cluster
    let bestCluster: Cluster | null = null;
    let bestSimilarity = -1;

    for (const cluster of existingClusters) {
      if (cluster.centroid && cluster.centroid.length > 0) {
        const similarity = cosineSimilarity(embedding, cluster.centroid);

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = cluster;
        }
      }
    }

    // 5. Assign to cluster if similarity is high enough
    const similarityThreshold = 0.6;

    if (bestCluster && bestSimilarity >= similarityThreshold) {
      // Update response
      response.classified = true;
      response.clusterId = bestCluster.id;
      response.isOutlier = false;
      await response.save();

      return {
        clusterId: bestCluster.id,
        path: [bestCluster.label],
        confidence: bestSimilarity
      };
    } else {
      // Mark as outlier
      response.classified = true;
      response.isOutlier = true;
      await response.save();

      return {
        clusterId: 'outlier',
        path: ['Other'],
        confidence: 0.3
      };
    }
  }

  /**
   * Get existing clusters for a poll
   */
  private async getExistingClusters(pollId: string): Promise<Cluster[]> {
    if (!this.HierarchyNodeModel) {
      return [];
    }

    const nodes = await this.HierarchyNodeModel.find({
      pollId,
      level: 'cluster'
    });

    return nodes.map((node: IHierarchyNode) => ({
      id: node.id,
      level: node.depth,
      label: node.label,
      responseIds: node.responseIds || [],
      centroid: node.semanticCentroid || [],
      confidenceScore: node.confidenceScore || 0,
      isOutlier: node.isOutlierGroup || false
    }));
  }
}

// Export singleton instance
export default new ClassificationService();
