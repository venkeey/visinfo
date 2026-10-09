/**
 * HierarchyNode Model - Phase 1 Features #4, #7: Hierarchical Classification & Results View
 *
 * Dart model for hierarchy tree nodes
 */

// TODO: Define NodeLevel enum
// enum NodeLevel {
//   category,     // Level 1
//   subcategory,  // Level 2
//   cluster,      // Level 3
//   response,     // Level 4
// }

// TODO: Define HierarchyNode class
// class HierarchyNode {
//   final String id;
//   final String pollId;
//
//   // Hierarchy structure
//   final NodeLevel level;
//   final int depth;  // 1, 2, 3, or 4
//   final String? parentId;
//   final List<String> path;  // Full path for breadcrumb navigation
//
//   // Node content
//   final String label;
//   final String? description;
//
//   // Metrics
//   final int responseCount;
//   final int directResponseCount;
//
//   // AI Classification metadata
//   final double? confidenceScore;
//   final List<double>? semanticCentroid;
//   final double? averageSimilarity;
//
//   // Response references
//   final List<String>? responseIds;
//
//   // Status
//   final bool? isOutlierGroup;
//
//   // Metadata
//   final DateTime createdAt;
//   final DateTime updatedAt;
//
//   // Children (loaded when expanded)
//   final List<HierarchyNode>? children;
//
//   HierarchyNode({
//     required this.id,
//     required this.pollId,
//     required this.level,
//     required this.depth,
//     this.parentId,
//     required this.path,
//     required this.label,
//     this.description,
//     required this.responseCount,
//     required this.directResponseCount,
//     this.confidenceScore,
//     this.semanticCentroid,
//     this.averageSimilarity,
//     this.responseIds,
//     this.isOutlierGroup,
//     required this.createdAt,
//     required this.updatedAt,
//     this.children,
//   });
//
//   // TODO: Implement fromJson factory
//   factory HierarchyNode.fromJson(Map<String, dynamic> json) {
//     // Parse all fields from JSON
//     // Recursively parse children if present
//   }
//
//   // TODO: Implement toJson method
//   Map<String, dynamic> toJson() {
//     // Convert all fields to JSON
//     // Recursively serialize children if present
//   }
//
//   // TODO: Implement copyWith for updating children
//   HierarchyNode copyWith({
//     List<HierarchyNode>? children,
//     // ... other fields
//   }) {
//     // Return new instance with updated fields
//   }
//
//   // TODO: Implement percentage getter
//   double getPercentage(int totalResponses) {
//     // Calculate percentage: (responseCount / totalResponses) * 100
//   }
//
//   // TODO: Implement confidence level getter
//   String get confidenceLevel {
//     // Return 'high', 'medium', or 'low' based on confidenceScore
//     // High: 0.80-1.00
//     // Medium: 0.60-0.79
//     // Low: 0.00-0.59
//   }
// }
