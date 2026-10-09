import { hacCluster } from '../services/clustering/hac';

// Two tight, well separated groups of 2-D "embeddings".
const groupA = [[0.0, 0.1], [0.1, 0.0], [0.05, 0.05], [0.0, 0.0]];
const groupB = [[5.0, 5.1], [5.1, 5.0], [5.05, 5.05], [5.0, 5.0]];
const vectors = [...groupA, ...groupB];

describe('hacCluster', () => {
  it('separates two well separated groups when asked for 2 clusters', async () => {
    const result = await hacCluster(vectors, { numClusters: 2, linkage: 'average', metric: 'euclidean' });

    expect(result.numClusters).toBe(2);
    expect(new Set(result.labels.slice(0, 4)).size).toBe(1);
    expect(new Set(result.labels.slice(4)).size).toBe(1);
    expect(result.labels[0]).not.toBe(result.labels[4]);
  });

  it('returns a dendrogram that covers every point', async () => {
    const result = await hacCluster(vectors, { numClusters: 2, linkage: 'average', metric: 'euclidean' });

    expect(result.labels).toHaveLength(vectors.length);
    expect(result.hierarchy?.dendrogram).toBeDefined();
  });
});
