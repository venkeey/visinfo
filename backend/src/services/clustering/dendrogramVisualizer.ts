/**
 * Dendrogram ASCII Visualization Utility
 *
 * Renders hierarchical clustering dendrograms in ASCII format
 */

export interface DendrogramNode {
  isLeaf: boolean;
  index?: number;
  children?: DendrogramNode[];
  height: number;
  size: number;
}

export interface VisualizationOptions {
  maxWidth?: number;        // Maximum width of the visualization (default: 80)
  showHeights?: boolean;    // Show merge heights (default: true)
  showSizes?: boolean;      // Show cluster sizes (default: true)
  labelMap?: Map<number, string>;  // Map leaf indices to labels
}

/**
 * Generate ASCII dendrogram visualization
 */
export function generateAsciiDendrogram(
  tree: DendrogramNode,
  labels?: number[],
  options: VisualizationOptions = {}
): string {
  const {
    maxWidth = 80,
    showHeights = true,
    showSizes = true,
    labelMap
  } = options;

  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    DENDROGRAM VISUALIZATION');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Calculate scale for horizontal positioning
  const maxHeight = tree.height || 1;
  const scale = Math.min(40, maxWidth - 40) / maxHeight;

  // Build the tree recursively
  const treeLines = buildTreeLines(tree, 0, scale, labels, labelMap, showHeights, showSizes);
  lines.push(...treeLines);

  lines.push('');
  lines.push('─────────────────────────────────────────────────────────────');
  if (showHeights) {
    lines.push(`Max Height: ${maxHeight.toFixed(3)}`);
  }
  lines.push(`Total Leaves: ${countLeaves(tree)}`);
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

/**
 * Build tree lines recursively
 */
function buildTreeLines(
  node: DendrogramNode,
  depth: number,
  scale: number,
  labels?: number[],
  labelMap?: Map<number, string>,
  showHeights: boolean = true,
  showSizes: boolean = true
): string[] {
  const lines: string[] = [];
  const indent = '  '.repeat(depth);

  if (node.isLeaf) {
    // Leaf node - show the item
    const leafIndex = node.index ?? -1;
    let label = `Item-${leafIndex}`;

    if (labels && leafIndex >= 0 && leafIndex < labels.length) {
      const clusterId = labels[leafIndex];
      label = labelMap?.get(clusterId) || `Cluster-${clusterId}`;
    }

    lines.push(`${indent}└── ${label}`);
  } else {
    // Internal node - show merge
    const heightStr = showHeights ? ` [h=${node.height.toFixed(2)}]` : '';
    const sizeStr = showSizes ? ` (n=${node.size})` : '';
    lines.push(`${indent}├── Merge${heightStr}${sizeStr}`);

    // Recursively render children
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, idx) => {
        const childLines = buildTreeLines(
          child,
          depth + 1,
          scale,
          labels,
          labelMap,
          showHeights,
          showSizes
        );
        lines.push(...childLines);
      });
    }
  }

  return lines;
}

/**
 * Generate compact cluster summary visualization
 */
export function generateClusterSummary(
  clusters: Array<{ id: string; label: string; responseIds: string[] }>,
  maxItemsPerCluster: number = 3
): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    CLUSTER SUMMARY');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  clusters.forEach((cluster, idx) => {
    const size = cluster.responseIds.length;
    const label = cluster.label || 'UNLABELED';

    lines.push(`${idx + 1}. ${cluster.id} (${size} items)`);
    lines.push(`   Label: ${label}`);

    // Show first few items
    const itemsToShow = cluster.responseIds.slice(0, maxItemsPerCluster);
    itemsToShow.forEach(id => {
      lines.push(`   ├─ ${id}`);
    });

    if (size > maxItemsPerCluster) {
      lines.push(`   └─ ... and ${size - maxItemsPerCluster} more`);
    }

    lines.push('');
  });

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}


/**
 * Count total leaves in tree
 */
function countLeaves(node: DendrogramNode): number {
  if (node.isLeaf) {
    return 1;
  }

  if (!node.children || node.children.length === 0) {
    return 0;
  }

  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

/**
 * Collect all leaf nodes in order
 */
function collectLeaves(node: DendrogramNode): DendrogramNode[] {
  if (node.isLeaf) {
    return [node];
  }

  if (!node.children || node.children.length === 0) {
    return [];
  }

  const leaves: DendrogramNode[] = [];
  node.children.forEach(child => {
    leaves.push(...collectLeaves(child));
  });

  return leaves;
}


/**
 * Generate compact hierarchical text view
 * Shows merge hierarchy with cluster labels
 */
export function generateCompactHierarchy(
  tree: DendrogramNode,
  labels?: number[],
  clusterLabels?: Map<number, string>
): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                 CLUSTER HIERARCHY VIEW');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Group leaves by cluster
  const clusterGroups = new Map<number, number[]>();
  const leaves = collectLeaves(tree);

  leaves.forEach(leaf => {
    const leafIndex = leaf.index ?? -1;
    if (labels && leafIndex >= 0 && leafIndex < labels.length) {
      const clusterId = labels[leafIndex];
      if (!clusterGroups.has(clusterId)) {
        clusterGroups.set(clusterId, []);
      }
      clusterGroups.get(clusterId)!.push(leafIndex);
    }
  });

  // Sort clusters by size (descending)
  const sortedClusters = Array.from(clusterGroups.entries())
    .sort((a, b) => b[1].length - a[1].length);

  sortedClusters.forEach(([clusterId, items], idx) => {
    const label = clusterLabels?.get(clusterId) || `Cluster-${clusterId}`;
    lines.push(`${idx + 1}. ${label}`);
    lines.push(`   Size: ${items.length} items`);
    lines.push(`   Items: ${items.slice(0, 5).map(i => `#${i}`).join(', ')}${items.length > 5 ? ' ...' : ''}`);
    lines.push('');
  });

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

