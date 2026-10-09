import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

class DashboardHeader extends StatefulWidget {
  const DashboardHeader({super.key});

  @override
  State<DashboardHeader> createState() => _DashboardHeaderState();
}

class _DashboardHeaderState extends State<DashboardHeader> {
  bool _isGridView = false;

  void _toggleView() {
    setState(() {
      _isGridView = !_isGridView;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _isGridView ? 'Switched to grid view (coming soon)' : 'Switched to list view',
        ),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
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
          const Text(
            'Dashboard',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          Row(
            children: [
              // Search button (placeholder)
              ShadButton.ghost(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Search - Coming soon'),
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
                child: const Icon(Icons.search, size: 20),
              ),
              const SizedBox(width: 8),
              // View toggle button
              ShadButton.ghost(
                onPressed: _toggleView,
                child: Icon(
                  _isGridView ? Icons.view_list : Icons.grid_view,
                  size: 20,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
