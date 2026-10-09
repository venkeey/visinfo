import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import 'package:go_router/go_router.dart';
import '../utils/dummy_data.dart';
import 'poll_list_item.dart';

// UI Constants
class _UIConstants {
  static const double statusColumnWidth = 80.0;
  static const double responseColumnWidth = 120.0;
  static const double actionsColumnWidth = 100.0;
}

class DashboardContent extends StatefulWidget {
  const DashboardContent({super.key});

  @override
  State<DashboardContent> createState() => _DashboardContentState();
}

class _DashboardContentState extends State<DashboardContent> {
  String _selectedTab = 'All';
  String? _sortBy; // 'lastEdited', 'favorites', 'responses'
  bool _isLoading = false;
  List<Poll> _polls = [];

  @override
  void initState() {
    super.initState();
    _loadPolls();
  }

  Future<void> _loadPolls() async {
    setState(() => _isLoading = true);
    // Simulate API call
    await Future.delayed(const Duration(milliseconds: 300));
    setState(() {
      _polls = DummyData.getPolls();
      _isLoading = false;
    });
  }

  void _handleSortChange(String? value) {
    setState(() {
      _sortBy = value;
    });
  }

  void _handleFavoriteToggle(Poll poll) {
    setState(() {
      final index = _polls.indexWhere((p) => p.id == poll.id);
      if (index != -1) {
        _polls[index] = poll.copyWith(isFavorite: !poll.isFavorite);
      }
    });
  }

  List<Poll> _getFilteredPolls() {
    if (_selectedTab == 'All') {
      return _polls;
    }
    return _polls.where((poll) => poll.type == _selectedTab).toList();
  }

  List<Poll> _getSortedPolls(List<Poll> polls) {
    if (_sortBy == null) return polls;

    final sorted = List<Poll>.from(polls);
    sorted.sort((a, b) {
      int comparison = 0;
      switch (_sortBy) {
        case 'lastEdited':
          comparison = b.createdAt.compareTo(a.createdAt); // Most recent first
          break;
        case 'favorites':
          // Primary sort by favorite
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          // Secondary sort by date
          comparison = b.createdAt.compareTo(a.createdAt);
          break;
        case 'responses':
          // Primary sort by response count
          comparison = b.responseCount.compareTo(a.responseCount);
          // Secondary sort by date if same count
          if (comparison == 0) {
            comparison = b.createdAt.compareTo(a.createdAt);
          }
          break;
      }
      return comparison;
    });
    return sorted;
  }

  int _getTabCount(String tab) {
    if (tab == 'All') return _polls.length;
    return _polls.where((poll) => poll.type == tab).length;
  }

  @override
  Widget build(BuildContext context) {
    final filteredPolls = _getFilteredPolls();
    final sortedPolls = _getSortedPolls(filteredPolls);
    final screenHeight = MediaQuery.of(context).size.height;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Greeting section
          Text(
            '${DummyData.getGreeting()}, ${DummyData.userName}! 👋',
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Welcome back to your dashboard. Ready to create something amazing?',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 32),
          // Filter tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildTab('All', _selectedTab == 'All', _getTabCount('All')),
                const SizedBox(width: 24),
                _buildTab('Polls', _selectedTab == 'Polls', _getTabCount('Polls')),
                const SizedBox(width: 24),
                _buildTab('Pages', _selectedTab == 'Pages', _getTabCount('Pages')),
                const SizedBox(width: 24),
                _buildTab('Funnels', _selectedTab == 'Funnels', _getTabCount('Funnels')),
              ],
            ),
          ),
          const SizedBox(height: 24),
          // All Items section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text(
                    'All Items',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ShadBadge(
                    child: const Text('Free'),
                  ),
                ],
              ),
              ShadButton(
                onPressed: () => context.go('/create-poll'),
                child: const Row(
                  children: [
                    Icon(Icons.add, size: 16),
                    SizedBox(width: 4),
                    Text('New Poll'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Projects section - All polls
          const Text(
            'Recent Polls',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 16),
          // Poll list table view
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1a1a1a),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: Colors.grey.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Column(
              children: [
                // Table header
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: Colors.grey.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      // Status column header
                      const SizedBox(
                        width: _UIConstants.statusColumnWidth,
                        child: Text(
                          'Status',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Title column header
                      const Expanded(
                        child: Text(
                          'Title',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Sort by dropdown
                      SizedBox(
                        width: 160,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            const Text(
                              'Sort by:',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                            const SizedBox(width: 8),
                            DropdownButton<String>(
                              value: _sortBy,
                              hint: const Text(
                                'Select',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                              underline: Container(),
                              icon: const Icon(
                                Icons.arrow_drop_down,
                                size: 18,
                                color: Colors.grey,
                              ),
                              dropdownColor: const Color(0xFF2a2a2a),
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.white,
                              ),
                              items: const [
                                DropdownMenuItem<String>(
                                  value: 'lastEdited',
                                  child: Text('Last Edited'),
                                ),
                                DropdownMenuItem<String>(
                                  value: 'favorites',
                                  child: Text('Favorites'),
                                ),
                                DropdownMenuItem<String>(
                                  value: 'responses',
                                  child: Text('Responses'),
                                ),
                              ],
                              onChanged: _handleSortChange,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                // Table rows
                if (_isLoading)
                  const Padding(
                    padding: EdgeInsets.all(48),
                    child: Center(
                      child: CircularProgressIndicator(),
                    ),
                  )
                else if (sortedPolls.isEmpty)
                  _buildEmptyState()
                else
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: screenHeight * 0.6,
                    ),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: sortedPolls.length,
                      itemBuilder: (context, index) {
                        final poll = sortedPolls[index];
                        return PollListItem(
                          key: ValueKey(poll.id),
                          poll: poll,
                          onFavoriteToggle: () => _handleFavoriteToggle(poll),
                          onTap: () {
                            // Navigate to poll details
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Opening "${poll.title}"'),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTab(String label, bool isActive, int count) {
    return InkWell(
      onTap: () {
        setState(() {
          _selectedTab = label;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 0),
        decoration: BoxDecoration(
          border: isActive
              ? const Border(
                  bottom: BorderSide(color: Colors.white, width: 2),
                )
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 16,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                color: isActive ? Colors.white : Colors.grey,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isActive ? Colors.white.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                count.toString(),
                style: TextStyle(
                  fontSize: 12,
                  color: isActive ? Colors.white : Colors.grey,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    String message;
    if (_selectedTab == 'All') {
      message = 'No items yet. Create your first poll!';
    } else {
      message = 'No $_selectedTab found. Try a different filter.';
    }

    return Padding(
      padding: const EdgeInsets.all(64),
      child: Column(
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 64,
            color: Colors.grey.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: const TextStyle(
              fontSize: 16,
              color: Colors.grey,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ShadButton(
            onPressed: () => context.go('/create-poll'),
            child: const Text('Create Poll'),
          ),
        ],
      ),
    );
  }
}
