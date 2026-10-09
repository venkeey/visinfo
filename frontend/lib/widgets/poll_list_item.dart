import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import '../utils/dummy_data.dart';

// UI Constants
class _UIConstants {
  static const double statusColumnWidth = 80.0;
  static const double responseColumnWidth = 120.0;
}

class PollListItem extends StatefulWidget {
  final Poll poll;
  final VoidCallback? onTap;
  final VoidCallback? onFavoriteToggle;

  const PollListItem({
    super.key,
    required this.poll,
    this.onTap,
    this.onFavoriteToggle,
  });

  @override
  State<PollListItem> createState() => _PollListItemState();
}

class _PollListItemState extends State<PollListItem> {
  bool _isHovered = false;

  void _showMoreMenu(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF2a2a2a),
          title: const Text(
            'Poll Actions',
            style: TextStyle(color: Colors.white),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildMenuItem(Icons.edit, 'Edit', () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Edit poll - Coming soon')),
                );
              }),
              _buildMenuItem(Icons.copy, 'Duplicate', () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Duplicate poll - Coming soon')),
                );
              }),
              _buildMenuItem(Icons.share, 'Share', () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Share poll - Coming soon')),
                );
              }),
              _buildMenuItem(Icons.archive, 'Archive', () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Archive poll - Coming soon')),
                );
              }),
              _buildMenuItem(Icons.delete, 'Delete', () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Delete poll - Coming soon')),
                );
              }, isDestructive: true),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildMenuItem(IconData icon, String label, VoidCallback onTap, {bool isDestructive = false}) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Row(
          children: [
            Icon(
              icon,
              size: 18,
              color: isDestructive ? Colors.red : Colors.white,
            ),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: isDestructive ? Colors.red : Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: InkWell(
        onTap: widget.onTap,
        hoverColor: const Color(0xFF252525),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: _isHovered ? const Color(0xFF252525) : Colors.transparent,
            border: Border(
              bottom: BorderSide(
                color: Colors.grey.withOpacity(0.1),
                width: 1,
              ),
            ),
          ),
          child: Row(
            children: [
              // Status badge
              SizedBox(
                width: _UIConstants.statusColumnWidth,
                child: ShadBadge(
                  backgroundColor: _getStatusColor(widget.poll.status),
                  child: Text(
                    widget.poll.status,
                    style: const TextStyle(fontSize: 11),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // Title
              Expanded(
                child: Text(
                  widget.poll.title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Colors.white,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 16),
              // Response count
              SizedBox(
                width: _UIConstants.responseColumnWidth,
                child: Text(
                  widget.poll.responseCount == 0
                      ? 'No responses'
                      : '${widget.poll.responseCount} ${widget.poll.responseCount == 1 ? 'response' : 'responses'}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                  textAlign: TextAlign.right,
                ),
              ),
              const SizedBox(width: 16),
              // Actions
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ShadButton.ghost(
                    onPressed: widget.onFavoriteToggle,
                    child: Icon(
                      widget.poll.isFavorite ? Icons.star : Icons.star_border,
                      size: 18,
                      color: widget.poll.isFavorite ? Colors.amber : Colors.grey,
                    ),
                  ),
                  ShadButton.ghost(
                    onPressed: () => _showMoreMenu(context),
                    child: const Icon(Icons.more_vert, size: 18),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return Colors.green.withOpacity(0.2);
      case 'draft':
        return Colors.orange.withOpacity(0.2);
      case 'closed':
        return Colors.grey.withOpacity(0.2);
      default:
        return Colors.blue.withOpacity(0.2);
    }
  }
}
