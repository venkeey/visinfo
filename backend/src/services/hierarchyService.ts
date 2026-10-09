/**
 * Hierarchy Builder Service
 *
 * PURPOSE: Build hierarchical tree structure from flat clusters
 * DEPENDENCIES: ../models/types, ./clustering
 * STATUS: ❌ Not implemented - AI prompt below
 *
 * ============================================================
 * AI CODING PROMPT - Copy this to Claude/ChatGPT/Copilot:
 * ============================================================
 *
 * Create a service that converts HAC dendrogram directly to ClusterTree structure.
 *
 * Input:
 * - clusteringResult: ClusteringResult with dendrogram from HAC
 * - responses: Array of Response objects
 *
 * Output: ClusterTree structure (5-7 levels deep)
 *
 * IMPORTANT: The HAC dendrogram IS the hierarchy!
 * We DON'T group by sentiment - we use the semantic similarity structure from HAC.
 *
 * Algorithm:
 *
 * 1. Traverse HAC dendrogram recursively
 * 2. For each internal node (merge point):
 *    - Collect all responses in that subtree
 *    - Use AI to label the cluster (get themes, summary)
 *    - Calculate size and percentage
 *    - Get sentiment as metadata (not for grouping)
 *    - Extract sample responses
 * 3. Limit depth to 5-7 levels (configurable)
 * 4. Build ClusterNode tree structure matching dendrogram
 *
 * Example 5-level structure:
 *    Root (500 responses)
 *    ├─ Product Feedback (300, 60%)                    ← Level 1
 *    │  ├─ Feature Requests (200, 40%)                 ← Level 2
 *    │  │  ├─ New Capabilities (120, 24%)              ← Level 3
 *    │  │  │  ├─ Integrations (60, 12%)                ← Level 4
 *    │  │  │  │  ├─ Third-party Apps (30, 6%)          ← Level 5
 *    │  │  │  │  └─ API Access (30, 6%)
 *    │  │  │  └─ Automation (60, 12%)
 *    │  │  └─ Enhancements (80, 16%)
 *    │  └─ UX Improvements (100, 20%)
 *    └─ Technical Issues (200, 40%)
 *
 * 5. For each cluster node, include:
 *    - id: node ID from dendrogram
 *    - label: AI-generated label based on responses
 *    - sentiment: positive/negative/neutral (metadata only)
 *    - size: number of responses in subtree
 *    - percentage: percentage of total
 *    - themes: array of themes from AI
 *    - summary: AI-generated summary
 *    - sampleResponses: top 3-5 representative responses
 *    - children: array of child nodes (recursive)
 *
 * Example Implementation:
 * ```typescript
 * export async function buildHierarchy(
 *   clusteringResult: ClusteringResult,  // ← Changed! Now takes clustering result with dendrogram
 *   responses: Response[],
 *   options: { maxDepth?: number } = {}
 * ): Promise<ClusterTree> {
 *   const { maxDepth = 7 } = options;
 *   const dendrogram = clusteringResult.hierarchy.dendrogram;
 *   const totalResponses = responses.length;
 *
 *   // Recursively convert dendrogram to ClusterNode
 *   async function dendrogramToNode(
 *     node: any,
 *     depth: number
 *   ): Promise<ClusterNode> {
 *     // Collect all response indices in this subtree
 *     const responseIndices = collectLeafIndices(node);
 *     const nodeResponses = responseIndices.map(i => responses[i]);
 *
 *     // Base case: reached max depth or small cluster
 *     if (depth >= maxDepth || nodeResponses.length < 5) {
 *       const label = await labelingService.labelCluster(
 *         nodeResponses.map(r => r.text)
 *       );
 *
 *       return {
 *         id: `cluster_${node.id}`,
 *         label: label.label,
 *         sentiment: label.sentiment,  // ← Metadata only!
 *         size: nodeResponses.length,
 *         percentage: (nodeResponses.length / totalResponses) * 100,
 *         themes: label.themes,
 *         summary: label.summary,
 *         sampleResponses: nodeResponses.slice(0, 5).map(r => r.text),
 *         children: []  // No children at max depth
 *       };
 *     }
 *
 *     // Recursive case: process left and right children
 *     const leftChild = await dendrogramToNode(node.left, depth + 1);
 *     const rightChild = await dendrogramToNode(node.right, depth + 1);
 *
 *     // Label this node based on its children
 *     const label = await labelingService.labelCluster(
 *       nodeResponses.slice(0, 20).map(r => r.text)  // Sample for labeling
 *     );
 *
 *     return {
 *       id: `cluster_${node.id}`,
 *       label: label.label,
 *       sentiment: label.sentiment,
 *       size: nodeResponses.length,
 *       percentage: (nodeResponses.length / totalResponses) * 100,
 *       themes: label.themes,
 *       summary: label.summary,
 *       sampleResponses: nodeResponses.slice(0, 5).map(r => r.text),
 *       children: [leftChild, rightChild]  // ← Hierarchy from dendrogram!
 *     };
 *   }
 *
 *   // Build root from dendrogram
 *   const root = await dendrogramToNode(dendrogram, 1);
 *
 *   return { root };
 * }
 * ```
 *
 * Helper Functions Needed:
 *
 * 1. collectLeafIndices(node: any): number[]
 *    - Recursively traverse dendrogram node
 *    - Collect all leaf indices (response indices)
 *    - Return flat array of indices
 *
 * 2. shouldStopBranching(node: any, depth: number, maxDepth: number): boolean
 *    - Check if we should stop expanding this node
 *    - Conditions: depth >= maxDepth OR node.size < minClusterSize
 *    - Return boolean
 *
 * 3. Optional: pruneDendrogram(dendrogram: any, minSimilarity: number): any
 *    - Remove very high similarity nodes (merge height > 0.95)
 *    - Reduces tree depth by merging near-duplicates
 *    - Return pruned dendrogram
 *
 * Advanced (Optional):
 * - Sub-cluster positive/negative groups by themes
 * - Use clustering similarity to create deeper hierarchies
 * - Weight sample responses by distance to centroid
 *
 * Integration in processingOrchestrator.ts:
 * ```typescript
 * import { buildHierarchy } from './hierarchyService';
 *
 * // After clustering and labeling
 * const tree = await buildHierarchy(labeledClusters, responses);
 * ```
 *
 * ============================================================
 */

import { ClusterTree, ClusterNode, Response } from '../models/types';
import { ClusteringResult } from './clustering/types';
import { labelingService } from '../ai/services/labelingService';

/**
 * Build hierarchical tree structure from HAC dendrogram
 *
 * @param clusteringResult - Result from HAC clustering with dendrogram
 * @param responses - Array of responses
 * @param options - Configuration options
 * @returns ClusterTree structure (5-7 levels deep)
 */
export async function buildHierarchy(
  clusteringResult: ClusteringResult,
  responses: Response[],
  options: { maxDepth?: number; minClusterSize?: number } = {}
): Promise<ClusterTree> {
  const { maxDepth = 7, minClusterSize = 3 } = options;

  if (!clusteringResult.hierarchy || !clusteringResult.hierarchy.dendrogram) {
    throw new Error('ClusteringResult must contain hierarchy with dendrogram (use HAC clustering)');
  }

  const dendrogram = clusteringResult.hierarchy.dendrogram;
  const totalResponses = responses.length;

  /**
   * Recursively convert dendrogram node to ClusterNode
   */
  async function dendrogramToNode(node: any, depth: number): Promise<ClusterNode> {
    // Collect all response indices in this subtree
    const responseIndices = collectLeafIndices(node);
    const nodeResponses = responseIndices.map((i) => responses[i]);

    // Base case: reached max depth or small cluster
    if (depth >= maxDepth || nodeResponses.length < minClusterSize) {
      const label = await labelingService.labelCluster(nodeResponses.map((r) => r.text));

      return {
        id: `cluster_${node.index || depth}_${responseIndices[0]}`,
        label: label.label,
        sentiment: label.sentiment, // Metadata only - NOT used for grouping!
        size: nodeResponses.length,
        percentage: (nodeResponses.length / totalResponses) * 100,
        themes: label.themes,
        summary: label.summary,
        sampleResponses: nodeResponses.slice(0, 5).map((r) => r.text),
        children: [], // No children at max depth
      };
    }

    // Recursive case: process left and right children
    const leftChild = await dendrogramToNode(node.children[0], depth + 1);
    const rightChild = await dendrogramToNode(node.children[1], depth + 1);

    // Label this node based on sample responses
    const sampleTexts = nodeResponses.slice(0, 20).map((r) => r.text);
    const label = await labelingService.labelCluster(sampleTexts);

    return {
      id: `cluster_${node.index || depth}_${responseIndices[0]}`,
      label: label.label,
      sentiment: label.sentiment, // Metadata only!
      size: nodeResponses.length,
      percentage: (nodeResponses.length / totalResponses) * 100,
      themes: label.themes,
      summary: label.summary,
      sampleResponses: nodeResponses.slice(0, 5).map((r) => r.text),
      children: [leftChild, rightChild], // Hierarchy from dendrogram!
    };
  }

  // Build root from dendrogram
  const root = await dendrogramToNode(dendrogram, 1);

  return { root };
}

/**
 * Recursively collect all leaf indices from dendrogram node
 *
 * @param node - Dendrogram node
 * @returns Array of leaf indices (response indices)
 */
function collectLeafIndices(node: any): number[] {
  // Base case: leaf node
  if (node.isLeaf || !node.children || node.children.length === 0) {
    return [node.index];
  }

  // Recursive case: collect from all children
  const indices: number[] = [];
  for (const child of node.children) {
    indices.push(...collectLeafIndices(child));
  }

  return indices;
}
