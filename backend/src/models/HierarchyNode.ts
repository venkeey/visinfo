/**
 * HierarchyNode Model - Phase 1 Features #4, #5, #6, #7: Hierarchical Classification
 *
 * Represents nodes in the hierarchical classification tree:
 * - Level 1: Top-level categories (e.g., "Performance Issues", "Feature Requests")
 * - Level 2: Subcategories (e.g., "Loading Speed", "Crashes")
 * - Level 3: Clusters (e.g., "Slow Startup", "Page Transitions")
 * - Level 4: Individual responses (raw text)
 */

// TODO: Import required dependencies
// import mongoose, { Schema, Document } from 'mongoose';

/**
 * Node type enum
 */
// TODO: Define NodeLevel enum or type
// export type NodeLevel = 'category' | 'subcategory' | 'cluster' | 'response';

/**
 * HierarchyNode document interface
 */

// TODO: Define IHierarchyNode interface
// export interface IHierarchyNode extends Document {
//   id: string;
//   pollId: string;           // Reference to Poll
//
//   // Hierarchy structure
//   level: NodeLevel;
//   depth: number;            // 1, 2, 3, or 4
//   parentId?: string;        // Reference to parent node (null for level 1)
//   path: string[];           // Full path from root (for breadcrumb navigation)
//
//   // Node content
//   label: string;            // Category/subcategory/cluster name or response text
//   description?: string;     // Optional description
//
//   // Metrics
//   responseCount: number;    // Number of responses in this node and children
//   directResponseCount: number; // Number of responses directly in this node
//
//   // AI Classification metadata
//   confidenceScore?: number;      // AI confidence (0-1) for this grouping
//   semanticCentroid?: number[];   // Centroid embedding for this cluster/category
//   averageSimilarity?: number;    // Average similarity within this group
//
//   // Response references (for leaf nodes/clusters)
//   responseIds?: string[];   // References to Response documents
//
//   // Status
//   isOutlierGroup?: boolean; // True if this is an "Other" category
//
//   // Metadata
//   createdAt: Date;
//   updatedAt: Date;
// }

/**
 * HierarchyNode Schema Definition
 */

// TODO: Create HierarchyNodeSchema
// const HierarchyNodeSchema: Schema = new Schema({
//   id: { type: String, required: true, unique: true },
//   pollId: { type: String, required: true, index: true },
//
//   // Hierarchy
//   level: {
//     type: String,
//     enum: ['category', 'subcategory', 'cluster', 'response'],
//     required: true
//   },
//   depth: { type: Number, required: true, min: 1, max: 4 },
//   parentId: { type: String, index: true },
//   path: [String],
//
//   // Content
//   label: { type: String, required: true },
//   description: String,
//
//   // Metrics
//   responseCount: { type: Number, default: 0 },
//   directResponseCount: { type: Number, default: 0 },
//
//   // AI metadata
//   confidenceScore: { type: Number, min: 0, max: 1 },
//   semanticCentroid: [Number],
//   averageSimilarity: Number,
//
//   // Response references
//   responseIds: [String],
//
//   // Status
//   isOutlierGroup: Boolean,
//
//   // Metadata
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now }
// });

// TODO: Add compound index for efficient tree queries
// HierarchyNodeSchema.index({ pollId: 1, level: 1 });
// HierarchyNodeSchema.index({ pollId: 1, parentId: 1 });
// HierarchyNodeSchema.index({ pollId: 1, depth: 1 });

// TODO: Add method to get children
// HierarchyNodeSchema.methods.getChildren = async function() {
//   return mongoose.model('HierarchyNode').find({ parentId: this.id });
// };

// TODO: Add method to get all descendant response IDs
// HierarchyNodeSchema.methods.getAllResponseIds = async function(): Promise<string[]> {
//   // Recursively collect all response IDs from this node and descendants
//   // This is used for drill-down from any level to see raw responses
// };

// TODO: Add static method to build tree for a poll
// HierarchyNodeSchema.statics.buildTreeForPoll = async function(pollId: string) {
//   // Get all nodes for this poll
//   // Build hierarchical structure
//   // Return root nodes with nested children
// };

// TODO: Export the HierarchyNode model
// export default mongoose.model<IHierarchyNode>('HierarchyNode', HierarchyNodeSchema);
