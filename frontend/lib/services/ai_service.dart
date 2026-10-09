import 'dart:async';
import '../models/question_analysis.dart';

class AIService {
  // Mock AI service for question analysis
  static Future<QuestionAnalysis> analyzeQuestion(String question) async {
    // Simulate API delay
    await Future.delayed(const Duration(milliseconds: 800));

    // Mock analysis based on question length and content
    final wordCount = question.trim().split(' ').length;
    final hasQuestionMark = question.contains('?');
    final isOpen = !question.toLowerCase().contains(RegExp(r'\b(yes|no|true|false)\b'));

    int groupabilityScore = 5;
    List<String> issues = [];
    List<String> suggestions = [];
    List<String> expectedCategories = [];

    // Calculate groupability score
    if (hasQuestionMark) groupabilityScore += 1;
    if (isOpen) groupabilityScore += 2;
    if (wordCount >= 5) groupabilityScore += 1;
    if (wordCount <= 15) groupabilityScore += 1;

    // Add issues
    if (!hasQuestionMark) {
      issues.add('Question doesn\'t end with a question mark');
    }
    if (wordCount < 3) {
      issues.add('Question is too short - add more context');
    }
    if (wordCount > 30) {
      issues.add('Question is too long - consider simplifying');
    }
    if (!isOpen) {
      issues.add('Question seems to be yes/no - consider making it open-ended');
    }

    // Add suggestions
    if (groupabilityScore < 7) {
      suggestions.add('Make the question more specific to get better groupable responses');
      suggestions.add('Add context about what you\'re trying to learn');
    }
    if (!question.toLowerCase().contains('what') &&
        !question.toLowerCase().contains('how') &&
        !question.toLowerCase().contains('why')) {
      suggestions.add('Consider starting with "What", "How", or "Why" for open-ended responses');
    }

    // Generate expected categories (mock)
    if (question.toLowerCase().contains('improve') || question.toLowerCase().contains('feature')) {
      expectedCategories = ['UI/UX Improvements', 'Performance', 'New Features', 'Bug Fixes', 'Documentation'];
    } else if (question.toLowerCase().contains('like') || question.toLowerCase().contains('favorite')) {
      expectedCategories = ['Positive Feedback', 'Neutral Feedback', 'Negative Feedback', 'Suggestions'];
    } else {
      expectedCategories = ['Category A', 'Category B', 'Category C', 'Other'];
    }

    return QuestionAnalysis(
      groupabilityScore: groupabilityScore.clamp(0, 10),
      issues: issues,
      suggestions: suggestions,
      expectedCategories: expectedCategories,
      confidence: groupabilityScore >= 7 ? 'High' : groupabilityScore >= 4 ? 'Medium' : 'Low',
    );
  }

  // Debounced analysis
  static Timer? _debounceTimer;
  static Future<QuestionAnalysis?> analyzeQuestionDebounced(
    String question,
    Function(QuestionAnalysis) onResult,
  ) async {
    _debounceTimer?.cancel();

    if (question.trim().isEmpty) {
      return null;
    }

    final completer = Completer<QuestionAnalysis?>();

    _debounceTimer = Timer(const Duration(milliseconds: 500), () async {
      try {
        final analysis = await analyzeQuestion(question);
        onResult(analysis);
        completer.complete(analysis);
      } catch (e) {
        completer.completeError(e);
      }
    });

    return completer.future;
  }
}
