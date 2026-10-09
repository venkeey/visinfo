import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../utils/dummy_data.dart';

class DashboardSidebar extends StatefulWidget {
  const DashboardSidebar({super.key});

  @override
  State<DashboardSidebar> createState() => _DashboardSidebarState();
}

class _DashboardSidebarState extends State<DashboardSidebar> {
  bool _projectsExpanded = true;
  bool _productExpanded = true;
  bool _helpExpanded = true;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 260,
      color: const Color(0xFF252525),
      child: Column(
        children: [
          // Logo section
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
          // Navigation items
          Expanded(
            child: ListView(
              // padding: const EdgeInsets.only(left: 4, right: 8),
              children: [
                _buildNavItem(
                  icon: Icons.home,
                  label: 'Home',
                  isActive: GoRouterState.of(context).uri.path == '/',
                  onTap: () => context.go('/'),
                ),
                _buildNavItem(
                  icon: Icons.add_circle_outline,
                  label: 'Create Form',
                  onTap: () => context.go('/create-poll'),
                ),
                _buildNavItem(
                  icon: Icons.public,
                  label: 'Domains',
                  onTap: () => context.go('/domains'),
                ),
                _buildNavItem(
                  icon: Icons.settings,
                  label: 'Integrations',
                  onTap: () => context.go('/integrations'),
                ),
                _buildNavItem(
                  icon: Icons.settings,
                  label: 'Settings',
                  onTap: () => context.go('/settings'),
                ),
                const SizedBox(height: 8),
                // Projects section
                _buildCollapsibleSection(
                  title: 'Projects',
                  isExpanded: _projectsExpanded,
                  onToggle: () {
                    setState(() {
                      _projectsExpanded = !_projectsExpanded;
                    });
                  },
                  children: [
                    _buildNavItem(
                      icon: Icons.folder,
                      label: 'All Forms',
                      onTap: () => context.go('/all-forms'),
                    ),
                  ],
                ),
                // Product section
                _buildCollapsibleSection(
                  title: 'Product',
                  isExpanded: _productExpanded,
                  onToggle: () {
                    setState(() {
                      _productExpanded = !_productExpanded;
                    });
                  },
                  children: [
                    _buildNavItem(
                      icon: Icons.grid_view,
                      label: 'Templates',
                      onTap: () => context.go('/templates'),
                    ),
                  ],
                ),
                // Help section
                _buildCollapsibleSection(
                  title: 'Help',
                  isExpanded: _helpExpanded,
                  onToggle: () {
                    setState(() {
                      _helpExpanded = !_helpExpanded;
                    });
                  },
                  children: [
                    _buildNavItem(
                      icon: Icons.help_outline,
                      label: 'Help Center',
                      onTap: () => context.go('/help'),
                    ),
                    _buildNavItem(
                      icon: Icons.people,
                      label: 'Join Community',
                      onTap: () => context.go('/community'),
                    ),
                    _buildNavItem(
                      icon: Icons.chat_bubble_outline,
                      label: 'Contact Support',
                      onTap: () => context.go('/support'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Language selector
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Text(
                  'English',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_drop_down, size: 16, color: Colors.grey),
              ],
            ),
          ),
          // User profile
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: Color(0xFF333333), width: 1),
              ),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 20,
                  backgroundColor: Colors.grey,
                  child: Icon(Icons.person, color: Colors.white),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        DummyData.userName,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.expand_more, size: 16, color: Colors.grey),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool isActive = false,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 2),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFF3a3a3a) : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(6),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Icon(icon, size: 20, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: const TextStyle(
                      fontSize: 11.2,
                      color: Colors.white,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCollapsibleSection({
    required String title,
    required bool isExpanded,
    required VoidCallback onToggle,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: onToggle,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
            child: Row(
              children: [
                Icon(
                  isExpanded ? Icons.expand_more : Icons.chevron_right,
                  size: 16,
                  color: Colors.grey,
                ),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (isExpanded) ...children,
      ],
    );
  }
}

