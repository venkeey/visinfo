class QuestionAnalysis {
  final int groupabilityScore; // 0-10
  final List<String> issues;
  final List<String> suggestions;
  final List<String> expectedCategories;
  final String? confidence;

  QuestionAnalysis({
    required this.groupabilityScore,
    required this.issues,
    required this.suggestions,
    required this.expectedCategories,
    this.confidence,
  });

  factory QuestionAnalysis.fromJson(Map<String, dynamic> json) {
    return QuestionAnalysis(
      groupabilityScore: json['groupabilityScore'] as int,
      issues: List<String>.from(json['issues'] ?? []),
      suggestions: List<String>.from(json['suggestions'] ?? []),
      expectedCategories: List<String>.from(json['expectedCategories'] ?? []),
      confidence: json['confidence'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'groupabilityScore': groupabilityScore,
      'issues': issues,
      'suggestions': suggestions,
      'expectedCategories': expectedCategories,
      'confidence': confidence,
    };
  }
}
