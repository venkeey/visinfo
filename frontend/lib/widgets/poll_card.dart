import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import '../utils/dummy_data.dart';

class PollCard extends StatelessWidget {
  final Poll poll;

  const PollCard({
    super.key,
    required this.poll,
  });

  @override
  Widget build(BuildContext context) {
    return ShadCard(
      child: Container(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Top row - Status badge and action buttons (no padding)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShadBadge(
                  child: Text(
                    poll.status,
                    style: const TextStyle(fontSize: 10),
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ShadButton.ghost(
                      onPressed: () {},
                      child: Icon(
                        poll.isFavorite ? Icons.star : Icons.star_border,
                        size: 16,
                      ),
                    ),
                    ShadButton.ghost(
                      onPressed: () {},
                      child: const Icon(Icons.more_vert, size: 16),
                    ),
                  ],
                ),
              ],
            ),
            // Middle row - Title
            Expanded(
              child: Center(
                child: Text(
                  poll.title,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            // Bottom row - Response count
            Text(
              poll.responseCount == 0
                  ? 'No responses'
                  : '${poll.responseCount} responses',
              style: const TextStyle(
                fontSize: 10,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
