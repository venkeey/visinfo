import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/home_screen.dart';
import '../screens/create_poll/create_poll_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/create-poll',
      name: 'create-poll',
      builder: (context, state) => const CreatePollScreen(),
    ),
    GoRoute(
      path: '/domains',
      name: 'domains',
      builder: (context, state) => const PlaceholderScreen(title: 'Domains'),
    ),
    GoRoute(
      path: '/integrations',
      name: 'integrations',
      builder: (context, state) => const PlaceholderScreen(title: 'Integrations'),
    ),
    GoRoute(
      path: '/settings',
      name: 'settings',
      builder: (context, state) => const PlaceholderScreen(title: 'Settings'),
    ),
    GoRoute(
      path: '/all-forms',
      name: 'all-forms',
      builder: (context, state) => const PlaceholderScreen(title: 'All Forms'),
    ),
    GoRoute(
      path: '/templates',
      name: 'templates',
      builder: (context, state) => const PlaceholderScreen(title: 'Templates'),
    ),
    GoRoute(
      path: '/whats-new',
      name: 'whats-new',
      builder: (context, state) => const PlaceholderScreen(title: "What's New"),
    ),
    GoRoute(
      path: '/roadmap',
      name: 'roadmap',
      builder: (context, state) => const PlaceholderScreen(title: 'Product Roadmap'),
    ),
    GoRoute(
      path: '/feature-requests',
      name: 'feature-requests',
      builder: (context, state) => const PlaceholderScreen(title: 'Feature Requests'),
    ),
    GoRoute(
      path: '/trash',
      name: 'trash',
      builder: (context, state) => const PlaceholderScreen(title: 'Trash'),
    ),
    GoRoute(
      path: '/help',
      name: 'help',
      builder: (context, state) => const PlaceholderScreen(title: 'Help Center'),
    ),
    GoRoute(
      path: '/community',
      name: 'community',
      builder: (context, state) => const PlaceholderScreen(title: 'Join Community'),
    ),
    GoRoute(
      path: '/support',
      name: 'support',
      builder: (context, state) => const PlaceholderScreen(title: 'Contact Support'),
    ),
  ],
);

// Placeholder screen for routes not yet implemented
class PlaceholderScreen extends StatelessWidget {
  final String title;

  const PlaceholderScreen({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1a1a1a),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.construction, size: 64, color: Colors.white54),
            const SizedBox(height: 24),
            Text(
              title,
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Coming soon...',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
