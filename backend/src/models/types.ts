/**
 * Database Model Types
 */

export enum PollStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export interface Poll {
  id: string;
  question: string;
  description?: string;
  createdAt: Date;
  expiresAt: Date;
  status: PollStatus;
  responseCount: number;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  createdBy?: string;
}

export interface Response {
  id: string;
  pollId: string;
  userId?: string;
  text: string;
  embedding?: number[];
  clusterId?: string;
  submittedAt: Date;
}

export interface Cluster {
  id: string;
  pollId: string;
  label: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  themes: string[];
  summary: string;
  confidence?: number;
  size: number;
  percentage: number;
  parentClusterId?: string;
  createdAt: Date;
}

export interface ClassificationResult {
  id: string;
  pollId: string;
  tree: ClusterTree;
  metadata: {
    totalResponses: number;
    clusterCount: number;
    processingTime: number;
    cost: number;
  };
  generatedAt: Date;
}

export interface ClusterTree {
  root: ClusterNode;
}

export interface ClusterNode {
  id: string;
  label: string;
  /** Sentiment is metadata only - NOT used for tree grouping. Tree structure comes from semantic similarity (HAC dendrogram). */
  sentiment: 'positive' | 'negative' | 'neutral';
  size: number;
  percentage: number;
  themes: string[];
  summary: string;
  sampleResponses: string[];
  children?: ClusterNode[];
}

export interface ProcessingJob {
  id: string;
  pollId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStage?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
