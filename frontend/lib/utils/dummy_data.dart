class Poll {
  final String id;
  final String title;
  final String type; // 'Poll', 'Page', 'Funnel'
  final String status; // 'Draft', 'Active', 'Closed'
  final int responseCount;
  final bool isFavorite;
  final DateTime createdAt;

  Poll({
    required this.id,
    required this.title,
    required this.type,
    required this.status,
    required this.responseCount,
    this.isFavorite = false,
    required this.createdAt,
  });

  Poll copyWith({
    String? id,
    String? title,
    String? type,
    String? status,
    int? responseCount,
    bool? isFavorite,
    DateTime? createdAt,
  }) {
    return Poll(
      id: id ?? this.id,
      title: title ?? this.title,
      type: type ?? this.type,
      status: status ?? this.status,
      responseCount: responseCount ?? this.responseCount,
      isFavorite: isFavorite ?? this.isFavorite,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class DummyData {
  static const String userName = 'Pratap Venkatesh';

  static List<Poll> getPolls() {
    return [
      Poll(
        id: '1',
        title: 'YouTube Video Voting Poll',
        type: 'Poll',
        status: 'Draft',
        responseCount: 0,
        isFavorite: false,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
      ),
      Poll(
        id: '2',
        title: 'Product Feature Request',
        type: 'Poll',
        status: 'Active',
        responseCount: 15,
        isFavorite: true,
        createdAt: DateTime.now().subtract(const Duration(days: 5)),
      ),
      Poll(
        id: '3',
        title: 'Team Meeting Time Preference',
        type: 'Poll',
        status: 'Active',
        responseCount: 8,
        isFavorite: false,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
      Poll(
        id: '4',
        title: 'Office Lunch Preferences',
        type: 'Page',
        status: 'Closed',
        responseCount: 23,
        isFavorite: true,
        createdAt: DateTime.now().subtract(const Duration(days: 10)),
      ),
      Poll(
        id: '5',
        title: 'Holiday Party Theme Ideas',
        type: 'Funnel',
        status: 'Active',
        responseCount: 12,
        isFavorite: false,
        createdAt: DateTime.now().subtract(const Duration(days: 3)),
      ),
      Poll(
        id: '6',
        title: 'Workshop Topic Suggestions',
        type: 'Poll',
        status: 'Draft',
        responseCount: 0,
        isFavorite: false,
        createdAt: DateTime.now().subtract(const Duration(hours: 5)),
      ),
    ];
  }

  static String getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) {
      return 'Good morning';
    } else if (hour < 17) {
      return 'Good afternoon';
    } else if (hour < 21) {
      return 'Good evening';
    } else {
      return 'Good night';
    }
  }
}

