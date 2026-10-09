/**
 * Poll Model - Phase 1 Feature #1: Basic Poll Creation & Configuration
 *
 * Dart model for Poll with all configuration options
 */

// TODO: Define ResponseType enum
// enum ResponseType {
//   multipleChoice,
//   freeForm,
//   combined,
// }

// TODO: Define PollStatus enum
// enum PollStatus {
//   draft,
//   active,
//   closed,
// }

// TODO: Define SelectionType enum for multiple choice
// enum SelectionType {
//   single,    // Radio buttons
//   multiple,  // Checkboxes
// }

// TODO: Define MultipleChoiceConfig class
// class MultipleChoiceConfig {
//   final List<String> options;
//   final SelectionType selectionType;
//   final int? minSelections;
//   final int? maxSelections;
//
//   MultipleChoiceConfig({
//     required this.options,
//     required this.selectionType,
//     this.minSelections,
//     this.maxSelections,
//   });
//
//   factory MultipleChoiceConfig.fromJson(Map<String, dynamic> json) {
//     // TODO: Implement fromJson
//   }
//
//   Map<String, dynamic> toJson() {
//     // TODO: Implement toJson
//   }
// }

// TODO: Define FreeFormConfig class
// class FreeFormConfig {
//   final int characterLimit;
//   final int? minLength;
//   final bool enableContentFilter;
//
//   FreeFormConfig({
//     required this.characterLimit,
//     this.minLength,
//     this.enableContentFilter = false,
//   });
//
//   factory FreeFormConfig.fromJson(Map<String, dynamic> json) {
//     // TODO: Implement fromJson
//   }
//
//   Map<String, dynamic> toJson() {
//     // TODO: Implement toJson
//   }
// }

// TODO: Define CombinedConfig class
// class CombinedConfig {
//   final MultipleChoiceConfig multipleChoice;
//   final FreeFormConfig freeForm;
//   final bool requireBoth;
//
//   CombinedConfig({
//     required this.multipleChoice,
//     required this.freeForm,
//     required this.requireBoth,
//   });
//
//   factory CombinedConfig.fromJson(Map<String, dynamic> json) {
//     // TODO: Implement fromJson
//   }
//
//   Map<String, dynamic> toJson() {
//     // TODO: Implement toJson
//   }
// }

// TODO: Define Poll class
// class Poll {
//   final String id;
//   final String title;
//   final String? description;
//   final String questionText;
//   final String createdBy;
//
//   // Response type configuration
//   final ResponseType responseType;
//   final MultipleChoiceConfig? multipleChoiceConfig;
//   final FreeFormConfig? freeFormConfig;
//   final CombinedConfig? combinedConfig;
//
//   // Settings
//   final int? duration;
//   final DateTime? endDate;
//   final bool isPublic;
//   final bool allowAnonymous;
//   final bool allowMultipleResponses;
//
//   // Status
//   final PollStatus status;
//
//   // Metadata
//   final DateTime createdAt;
//   final DateTime updatedAt;
//   final DateTime? publishedAt;
//   final DateTime? closedAt;
//
//   // Analytics (cached)
//   final int responseCount;
//   final int uniqueRespondents;
//   final String? processingStatus;
//
//   Poll({
//     required this.id,
//     required this.title,
//     this.description,
//     required this.questionText,
//     required this.createdBy,
//     required this.responseType,
//     this.multipleChoiceConfig,
//     this.freeFormConfig,
//     this.combinedConfig,
//     this.duration,
//     this.endDate,
//     this.isPublic = true,
//     this.allowAnonymous = false,
//     this.allowMultipleResponses = false,
//     this.status = PollStatus.draft,
//     required this.createdAt,
//     required this.updatedAt,
//     this.publishedAt,
//     this.closedAt,
//     this.responseCount = 0,
//     this.uniqueRespondents = 0,
//     this.processingStatus,
//   });
//
//   // TODO: Implement fromJson factory
//   factory Poll.fromJson(Map<String, dynamic> json) {
//     // Parse all fields from JSON
//     // Convert date strings to DateTime
//     // Parse nested configs
//   }
//
//   // TODO: Implement toJson method
//   Map<String, dynamic> toJson() {
//     // Convert all fields to JSON
//     // Convert DateTime to ISO strings
//     // Serialize nested configs
//   }
//
//   // TODO: Implement copyWith method for immutable updates
//   Poll copyWith({
//     String? title,
//     String? description,
//     String? questionText,
//     PollStatus? status,
//     // ... other fields
//   }) {
//     // Return new Poll instance with updated fields
//   }
//
//   // TODO: Implement isExpired getter
//   bool get isExpired {
//     // Check if status is closed OR endDate has passed
//   }
// }
