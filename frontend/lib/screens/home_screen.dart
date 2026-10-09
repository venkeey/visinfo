import 'package:flutter/material.dart';
import '../widgets/sidebar.dart';
import '../widgets/header.dart';
import '../widgets/dashboard_content.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1a1a1a),
      body: LayoutBuilder(
        builder: (context, constraints) {
          // Responsive breakpoint
          final bool isMobile = constraints.maxWidth < 768;
          final bool isTablet = constraints.maxWidth >= 768 && constraints.maxWidth < 1024;

          if (isMobile) {
            // Mobile layout: Hide sidebar, show drawer
            return Column(
              children: [
                _MobileHeader(),
                const Expanded(
                  child: DashboardContent(),
                ),
              ],
            );
          } else {
            // Desktop/Tablet layout: Show sidebar
            return Row(
              children: [
                if (!isTablet) const DashboardSidebar(),
                Expanded(
                  child: Column(
                    children: [
                      const DashboardHeader(),
                      const Expanded(
                        child: DashboardContent(),
                      ),
                    ],
                  ),
                ),
              ],
            );
          }
        },
      ),
      // Mobile drawer
      drawer: MediaQuery.of(context).size.width < 768
          ? const Drawer(
              backgroundColor: Color(0xFF252525),
              child: DashboardSidebar(),
            )
          : null,
    );
  }
}

class _MobileHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: Color(0xFF252525),
        border: Border(
          bottom: BorderSide(
            color: Color(0xFF333333),
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu, color: Colors.white),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ),
          const SizedBox(width: 12),
          const Text(
            'VisInfo',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
