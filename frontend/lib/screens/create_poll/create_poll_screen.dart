import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import '../../models/question_analysis.dart';
import '../../services/ai_service.dart';

class CreatePollScreen extends StatefulWidget {
  const CreatePollScreen({super.key});

  @override
  State<CreatePollScreen> createState() => _CreatePollScreenState();
}

class _CreatePollScreenState extends State<CreatePollScreen> {
  int _currentStep = 0;
  final _questionController = TextEditingController();
  QuestionAnalysis? _analysis;
  bool _isAnalyzing = false;

  @override
  void dispose() {
    _questionController.dispose();
    super.dispose();
  }

  void _analyzeQuestion() async {
    if (_questionController.text.trim().isEmpty) return;

    setState(() => _isAnalyzing = true);

    AIService.analyzeQuestionDebounced(
      _questionController.text,
      (analysis) {
        setState(() {
          _analysis = analysis;
          _isAnalyzing = false;
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1a1a1a),
      body: Row(
        children: [
          // Sidebar (optional - can reuse or create minimal)
          Container(
            width: 260,
            color: const Color(0xFF252525),
            child: Column(
              children: [
                Container(
                  height: 70,
                  padding: const EdgeInsets.all(16),
                  child: const Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'VisInfo',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: ListView(
                    children: [
                      _buildStepItem(0, 'Question', Icons.edit),
                      _buildStepItem(1, 'Settings', Icons.settings),
                      _buildStepItem(2, 'Preview', Icons.visibility),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Main content
          Expanded(
            child: Column(
              children: [
                // Header
                Container(
                  height: 64,
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  decoration: const BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: Color(0xFF333333),
                        width: 1,
                      ),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          ShadButton.ghost(
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Icon(Icons.arrow_back, size: 20),
                          ),
                          const SizedBox(width: 16),
                          const Text(
                            'Create New Poll',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          ShadButton.outline(
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text('Cancel'),
                          ),
                          const SizedBox(width: 12),
                          ShadButton(
                            onPressed: _currentStep < 2
                                ? () => setState(() => _currentStep++)
                                : () {
                                    // Save poll
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Poll created successfully!')),
                                    );
                                    Navigator.of(context).pop();
                                  },
                            child: Text(_currentStep < 2 ? 'Next' : 'Create Poll'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Content
                Expanded(
                  child: IndexedStack(
                    index: _currentStep,
                    children: [
                      _buildQuestionStep(),
                      _buildSettingsStep(),
                      _buildPreviewStep(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepItem(int step, String label, IconData icon) {
    final isActive = _currentStep == step;
    final isCompleted = _currentStep > step;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 2, horizontal: 8),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFF3a3a3a) : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
      ),
      child: InkWell(
        onTap: () => setState(() => _currentStep = step),
        borderRadius: BorderRadius.circular(6),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Icon(
                isCompleted ? Icons.check_circle : icon,
                size: 20,
                color: isCompleted ? Colors.green : Colors.white,
              ),
              const SizedBox(width: 12),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuestionStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Your Question',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Write your poll question. Our AI will analyze it and provide suggestions.',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 32),
          TextField(
            controller: _questionController,
            onChanged: (value) => _analyzeQuestion(),
            maxLines: 4,
            style: const TextStyle(color: Colors.white, fontSize: 16),
            decoration: InputDecoration(
              hintText: 'What features would you like us to add?',
              hintStyle: const TextStyle(color: Colors.grey),
              filled: true,
              fillColor: const Color(0xFF252525),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF333333)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF333333)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Colors.blue, width: 2),
              ),
            ),
          ),
          const SizedBox(height: 32),
          if (_isAnalyzing)
            const Center(
              child: CircularProgressIndicator(),
            )
          else if (_analysis != null) ...[
            _buildAnalysisCard(),
          ],
        ],
      ),
    );
  }

  Widget _buildAnalysisCard() {
    if (_analysis == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'AI Analysis',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 16),
        // Groupability Score
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF252525),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF333333)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Groupability Score',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _getScoreColor(_analysis!.groupabilityScore).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${_analysis!.groupabilityScore}/10',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: _getScoreColor(_analysis!.groupabilityScore),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              LinearProgressIndicator(
                value: _analysis!.groupabilityScore / 10,
                backgroundColor: const Color(0xFF333333),
                valueColor: AlwaysStoppedAnimation(_getScoreColor(_analysis!.groupabilityScore)),
                minHeight: 8,
                borderRadius: BorderRadius.circular(4),
              ),
              const SizedBox(height: 8),
              Text(
                _analysis!.confidence == 'High'
                    ? 'Excellent! This question will generate well-grouped responses.'
                    : _analysis!.confidence == 'Medium'
                        ? 'Good question, but could be improved for better grouping.'
                        : 'Consider revising the question for better AI grouping.',
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Issues
        if (_analysis!.issues.isNotEmpty) ...[
          _buildListSection('Issues Found', _analysis!.issues, Icons.warning, Colors.orange),
          const SizedBox(height: 16),
        ],
        // Suggestions
        if (_analysis!.suggestions.isNotEmpty) ...[
          _buildListSection('Suggestions', _analysis!.suggestions, Icons.lightbulb, Colors.blue),
          const SizedBox(height: 16),
        ],
        // Expected Categories
        if (_analysis!.expectedCategories.isNotEmpty) ...[
          _buildListSection(
            'Expected Categories',
            _analysis!.expectedCategories,
            Icons.category,
            Colors.green,
          ),
        ],
      ],
    );
  }

  Widget _buildListSection(String title, List<String> items, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF252525),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF333333)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      margin: const EdgeInsets.only(top: 6, right: 12),
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        item,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.white70,
                        ),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Color _getScoreColor(int score) {
    if (score >= 7) return Colors.green;
    if (score >= 4) return Colors.orange;
    return Colors.red;
  }

  Widget _buildSettingsStep() {
    return const Center(
      child: Text(
        'Settings step - Coming soon',
        style: TextStyle(color: Colors.white, fontSize: 18),
      ),
    );
  }

  Widget _buildPreviewStep() {
    return const Center(
      child: Text(
        'Preview step - Coming soon',
        style: TextStyle(color: Colors.white, fontSize: 18),
      ),
    );
  }
}
