import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';

/// The "Liquid Glass" Progress Bar from the Glass-Bento Design System.
///
/// Features:
/// - **Electric Indigo** primary color (0xFF6366F1).
/// - **Glassmorphism** container with blur and transparency.
/// - **Liquid Physics**: Double sine wave animation that "sloshes" based on progress.
/// - **Glow**: Subtle inner glow on the liquid surface.
class LiquidProgressBar extends StatefulWidget {
  final double progress; // 0.0 to 1.0
  final double height;
  final Duration duration;

  const LiquidProgressBar({
    Key? key,
    required this.progress,
    this.height = 20.0,
    this.duration = const Duration(milliseconds: 1500),
  }) : super(key: key);

  @override
  State<LiquidProgressBar> createState() => _LiquidProgressBarState();
}

class _LiquidProgressBarState extends State<LiquidProgressBar>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  // Glass-Bento Token: Electric Indigo
  static const Color electricIndigo = Color(0xFF6366F1);
  // Glass-Bento Token: Surface (Glass)
  static const Color glassSurface = Color(0x0DFFFFFF); // White with 5% opacity
  static const Color glassBorder = Color(0x1AFFFFFF); // White with 10% opacity

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(widget.height / 2),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          height: widget.height,
          decoration: BoxDecoration(
            color: glassSurface,
            borderRadius: BorderRadius.circular(widget.height / 2),
            border: Border.all(color: glassBorder, width: 1),
          ),
          child: Stack(
            children: [
              // The Liquid Fill
              AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return CustomPaint(
                    painter: _LiquidPainter(
                      progress: widget.progress,
                      animationValue: _controller.value,
                      color: electricIndigo,
                    ),
                    size: Size.infinite,
                  );
                },
              ),
              // Optional: Glare/Reflection overlay for extra "Glass" effect
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.white.withOpacity(0.1),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.4],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LiquidPainter extends CustomPainter {
  final double progress;
  final double animationValue;
  final Color color;

  _LiquidPainter({
    required this.progress,
    required this.animationValue,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final Path path = Path();
    
    // Wave parameters
    // We limit the wave height so it doesn't look too chaotic at 0% or 100%
    final double waveHeight = size.height * 0.3 * (1 - (progress - 0.5).abs() * 2); 
    final double waveLength = size.width * 0.5;
    final double currentWidth = size.width * progress;

    if (progress == 0) return;

    path.moveTo(0, size.height);
    path.lineTo(0, size.height / 2); // Start somewhere

    // Draw the top wave surface
    for (double x = 0; x <= currentWidth; x++) {
      // Two sine waves combined for a more organic "liquid" feel
      // Animated by animationValue
      final double y = 
          sin((x / waveLength * 2 * pi) + (animationValue * 2 * pi)) * waveHeight * 0.5 +
          sin((x / (waveLength * 0.5) * 2 * pi) + (animationValue * 4 * pi)) * waveHeight * 0.3;
      
      // Map to vertical center
      path.lineTo(x, size.height / 2 + y);
    }

    // Close the shape
    path.lineTo(currentWidth, size.height);
    path.lineTo(0, size.height);
    path.close();
    
    // Gradient for depth (Darker at bottom)
    final Rect rect = Rect.fromLTWH(0, 0, currentWidth, size.height);
    paint.shader = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        color,
        color.withOpacity(0.7), // Slightly transparent at bottom for depth
      ],
    ).createShader(rect);

    // Apply clip to keep it inside the rounded bounds is handled by parent ClipRRect
    // But we need to make sure we don't draw outside the "progress" width
    // Actually, the loop handles the width.
    
    canvas.drawPath(path, paint);
    
    // Optional: Add a "foam" line at the top
    final Paint foamPaint = Paint()
      ..color = Colors.white.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
      
    canvas.drawPath(path, foamPaint);
  }

  @override
  bool shouldRepaint(covariant _LiquidPainter oldDelegate) {
    return oldDelegate.progress != progress || 
           oldDelegate.animationValue != animationValue;
  }
}
