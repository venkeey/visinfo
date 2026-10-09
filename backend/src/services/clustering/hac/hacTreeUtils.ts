/**
 * HAC Tree Utilities
 *
 * Functions for manipulating and analyzing hierarchical clustering dendrograms.
 * Includes tree cutting, node traversal, merge height analysis, and k estimation.
 */

import { calculateClusterSizes } from './hacMetrics';
import {
  multiResolutionGapAnalysis,
  MultiResolutionGapOptions
} from '../multiResolutionGap';

/**
 * Get the size of a cluster node by counting its leaves
 */
export function getNodeSize(node: any): number {
  if (node.isLeaf) {
    return 1;
  }
  if (node.children) {
    return node.children.reduce((sum: number, child: any) => sum + getNodeSize(child), 0);
  }
  return 1;
}

/**
 * Enforce minimum cluster size by backing up to parent nodes in dendrogram
 * When a cluster is too small, replace it with its parent (which is larger)
 *
 * @param clusters - Initial clusters from tree cutting
 * @param tree - Full dendrogram tree
 * @param minSize - Minimum cluster size requirement
 * @returns Validated clusters all meeting minSize constraint
 */
export function enforceMinSizeByParentBackup(
  clusters: any[],
  tree: any,
  minSize: number
): any[] {
  // Build parent map: node -> parent node
  const parentMap = new Map<any, any>();

  function buildParentMap(node: any, parent: any = null) {
    if (parent) {
      parentMap.set(node, parent);
    }
    if (node.children) {
      node.children.forEach((child: any) => buildParentMap(child, node));
    }
  }

  buildParentMap(tree);

  // For each cluster, back up to parent if too small
  const validatedClusters: any[] = [];
  const usedNodes = new Set<any>(); // Track to avoid duplicates

  for (const cluster of clusters) {
    let current = cluster;

    // Back up to parent until we find one that's big enough
    while (current) {
      const size = getNodeSize(current);

      if (size >= minSize) {
        // Found a node that's big enough
        break;
      }

      // Too small, try parent
      const parent = parentMap.get(current);
      if (!parent) {
        // At root, keep current even if too small
        break;
      }
      current = parent;
    }

    // Only add if we haven't already used this node
    // (multiple small siblings may back up to same parent)
    if (!usedNodes.has(current)) {
      validatedClusters.push(current);
      usedNodes.add(current);
    }
  }

  return validatedClusters;
}

/**
 * Get k clusters from the tree by cutting at the appropriate level
 *
 * @param tree - Dendrogram tree
 * @param k - Desired number of clusters
 * @param minSize - Minimum points per cluster (kept for signature compatibility, not used)
 */
export function getClusters(tree: any, k: number, minSize: number = 1): any[] {
  if (k === 1) {
    return [tree];
  }

  // Collect all internal nodes (non-leaf nodes) with their heights
  const internalNodes: { node: any; height: number }[] = [];

  function collectInternalNodes(node: any) {
    if (!node.isLeaf) {
      internalNodes.push({ node, height: node.height });
      if (node.children) {
        node.children.forEach((child: any) => collectInternalNodes(child));
      }
    }
  }

  collectInternalNodes(tree);

  // Sort by height in descending order
  internalNodes.sort((a, b) => b.height - a.height);

  // The top k-1 nodes define k clusters
  const cutNodes = internalNodes.slice(0, k - 1).map(n => n.node);

  // Start from root and cut at these nodes
  const clusters: any[] = [];

  function traverse(node: any): boolean {
    // Check if this node is a cut point
    if (cutNodes.includes(node)) {
      // This node's children become separate clusters
      if (node.children) {
        node.children.forEach((child: any) => clusters.push(child));
      }
      return true; // Stop traversing down this branch
    }

    if (node.isLeaf) {
      // This is a leaf that hasn't been cut yet - it's its own cluster
      clusters.push(node);
      return true;
    }

    // Continue traversing
    if (node.children) {
      const cuts = node.children.map((child: any) => traverse(child));
      return cuts.every((c: boolean) => c);
    }

    return false;
  }

  // If we can't find enough cut points, use a simpler approach
  if (internalNodes.length < k - 1) {
    // Just split the children until we have k clusters
    const queue = [tree];
    const result: any[] = [];

    while (queue.length > 0 && result.length + queue.length < k) {
      const node = queue.shift()!;
      if (node.children && node.children.length > 0) {
        queue.push(...node.children);
      } else {
        result.push(node);
      }
    }

    return [...result, ...queue].slice(0, k);
  }

  traverse(tree);

  // If we didn't get enough clusters, split the largest ones
  while (clusters.length < k) {
    // Find the largest non-leaf cluster
    let largestIdx = -1;
    let largestSize = 0;

    clusters.forEach((cluster, idx) => {
      if (!cluster.isLeaf && cluster.size > largestSize) {
        largestSize = cluster.size;
        largestIdx = idx;
      }
    });

    if (largestIdx === -1) break; // All remaining are leaves

    // Split this cluster
    const largeCluster = clusters[largestIdx];
    clusters.splice(largestIdx, 1);
    if (largeCluster.children) {
      clusters.push(...largeCluster.children);
    }
  }

  return clusters.slice(0, k);
}

/**
 * Get all leaf node indices from a cluster
 */
export function getLeafIndices(node: any): number[] {
  if (node.isLeaf) {
    return [node.index];
  }

  const indices: number[] = [];
  if (node.children) {
    node.children.forEach((child: any) => {
      indices.push(...getLeafIndices(child));
    });
  }

  return indices;
}

/**
 * Extract cluster labels from dendrogram tree by cutting at k clusters
 * @param tree - Dendrogram tree
 * @param numPoints - Number of data points
 * @param k - Desired number of clusters
 * @param minSize - Minimum cluster size (optional, enforced by backing up to parents)
 */
export function extractLabelsFromTree(
  tree: any,
  numPoints: number,
  k: number,
  minSize?: number
): number[] {
  const labels = new Array(numPoints).fill(-1);

  // Get initial clusters (may include small ones)
  let clusters = getClusters(tree, k, 1); // Use minSize=1 to get all clusters initially

  // If minSize specified, enforce it by backing up to parent nodes
  if (minSize && minSize > 1) {
    clusters = enforceMinSizeByParentBackup(clusters, tree, minSize);
  }

  // Assign labels to each leaf node
  clusters.forEach((cluster, clusterId) => {
    const leafIndices = getLeafIndices(cluster);
    leafIndices.forEach(idx => {
      labels[idx] = clusterId;
    });
  });

  return labels;
}

/**
 * Extract hierarchy information from dendrogram
 */
export function extractHierarchy(tree: any, labels: number[], vectors: number[][]) {
  // The tree object from ml-hclust contains the dendrogram structure
  // This maps directly to the ClusterTree structure for visualization

  return {
    dendrogram: tree,
    mergeHeights: tree.height ? [tree.height] : [],
    clusterSizes: calculateClusterSizes(labels),
    numLevels: calculateTreeDepth(tree)
  };
}

/**
 * Calculate depth of the tree
 */
export function calculateTreeDepth(node: any): number {
  if (!node || !node.children || node.children.length === 0) {
    return 1;
  }

  const childDepths = node.children.map((child: any) => calculateTreeDepth(child));
  return 1 + Math.max(...childDepths);
}

/**
 * Merge height analysis result
 */
export interface MergeHeightAnalysis {
  optimalK: number;
  heights: number[];
  gaps: number[];
  elbowIndex: number;
}

/**
 * Analyze merge heights in dendrogram to find natural cluster boundaries
 *
 * Uses "elbow detection" to identify where merge heights jump dramatically,
 * indicating natural separations in the data structure.
 *
 * @param tree - Dendrogram tree from HAC
 * @param maxK - Maximum number of clusters to consider
 * @returns Analysis containing optimal k, heights, gaps, and elbow location
 */
export function analyzeMergeHeights(tree: any, maxK: number = 20): MergeHeightAnalysis {
  // Extract all merge heights from dendrogram
  const merges: { height: number; size: number }[] = [];

  function collectMerges(node: any) {
    if (!node.isLeaf && node.height !== undefined) {
      merges.push({ height: node.height, size: node.size || 0 });
      if (node.children) {
        node.children.forEach((child: any) => collectMerges(child));
      }
    }
  }

  collectMerges(tree);

  // Sort by height (ascending) - represents merge sequence from bottom to top
  merges.sort((a, b) => a.height - b.height);
  const heights = merges.map(m => m.height);

  if (heights.length < 2) {
    return { optimalK: 2, heights, gaps: [], elbowIndex: 0 };
  }

  // Calculate gaps between consecutive merges
  const gaps: number[] = [];
  for (let i = 1; i < heights.length; i++) {
    gaps.push(heights[i] - heights[i - 1]);
  }

  // Find elbow: largest gap indicates best cut point
  // When we cut after merge i, we prevent that merge, leaving more clusters
  let maxGapIndex = 0;
  let maxGap = gaps[0];
  for (let i = 1; i < gaps.length; i++) {
    if (gaps[i] > maxGap) {
      maxGap = gaps[i];
      maxGapIndex = i;
    }
  }

  // Optimal k: number of clusters remaining if we cut before the largest gap
  // If we have n points and perform m merges, we have (n - m) clusters
  // Cutting before merge at index maxGapIndex means we perform maxGapIndex merges
  // So we have (n - maxGapIndex) clusters, but we need to be careful with the formula
  //
  // Actually: merges.length = n - 1 (for n points)
  // After performing i merges, we have (n - i) clusters
  // We want to cut before the merge with the largest gap
  // That means we stop after maxGapIndex merges, giving us (n - maxGapIndex) clusters
  const numMerges = heights.length;
  const n = numMerges + 1; // Number of original points
  const optimalK = Math.min(maxK, Math.max(2, n - maxGapIndex));

  return {
    optimalK,
    heights,
    gaps,
    elbowIndex: maxGapIndex
  };
}

/**
 * Estimate optimal number of clusters using merge height gap analysis
 *
 * Efficient: Uses only the dendrogram structure we already computed.
 * Finds natural cluster boundaries by detecting large gaps in merge heights.
 *
 * Now supports multi-resolution gap analysis for improved accuracy.
 *
 * @param numVectors - Number of data points
 * @param tree - Dendrogram tree (required)
 * @param distanceMatrix - Pre-computed distance matrix (required for multi-resolution)
 * @param options - Configuration options
 * @returns Estimated optimal k
 */
export function estimateOptimalK(
  numVectors: number,
  tree?: any,
  distanceMatrix?: number[][],
  options?: {
    minK?: number;
    maxK?: number;
    density?: number;
    useMultiResolution?: boolean;
    multiResolutionOptions?: MultiResolutionGapOptions;
  }
): number {
  const minK = options?.minK ?? 2;
  const maxK = options?.maxK ?? numVectors - 1;
  const useMultiResolution = options?.useMultiResolution ?? true;

  // Use multi-resolution gap analysis if enabled and distance matrix available
  if (tree && distanceMatrix && useMultiResolution) {
    try {
      const analysis = multiResolutionGapAnalysis(tree, distanceMatrix, {
        minK,
        maxK,
        enableQualityPreview: true, // Default: enabled for better accuracy
        ...options?.multiResolutionOptions
      });

      const k = analysis.optimalK;

      if (k >= minK && k <= maxK) {
        console.log(`   [HAC] Multi-resolution gap analysis: k=${k} (score=${analysis.selectedCandidate.score.toFixed(3)})`);
        if (analysis.selectedCandidate.qualityPreview !== undefined) {
          console.log(`   [HAC]   Quality preview: ${analysis.selectedCandidate.qualityPreview.toFixed(3)}`);
        }
        return k;
      }
    } catch (e) {
      console.warn(`   [HAC] Multi-resolution gap analysis failed, falling back to single-gap: ${e}`);
    }
  }

  // Fallback: single-gap merge height analysis
  if (tree) {
    const analysis = analyzeMergeHeights(tree, maxK);
    const k = analysis.optimalK;

    if (k >= minK && k <= maxK) {
      console.log(`   [HAC] Single-gap merge-height analysis: k=${k} (gap at index ${analysis.elbowIndex})`);
      return k;
    }
  }

  // Final fallback: sqrt(n) heuristic (only if no tree available)
  const k = Math.round(Math.sqrt(numVectors));
  return Math.max(minK, Math.min(maxK, k));
}
