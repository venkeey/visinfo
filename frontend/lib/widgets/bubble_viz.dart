import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';

/// Data model for a single bubble in the visualization.
class BubbleNode {
  final String id;
  final String label;
  final double value;
  final Color color;
  final List<BubbleNode> children; // For drill-down hierarchy

  // Physics state
  Offset position;
  Offset velocity;
  double radius;
  bool isDragging;

  BubbleNode({
    required this.id,
    required this.label,
    required this.value,
    required this.color,
    this.children = const [],
    this.position = Offset.zero,
    this.velocity = Offset.zero,
    this.radius = 40.0, // Base radius, scales with value
    this.isDragging = false,
  });
}

/// A Force-Directed Graph visualization where nodes are "Bubbles".
///
/// Features:
/// - **Glass-Bento Styling**: Frosted glass effect with 3D-like shading.
/// - **Physics**: Repulsion, Center Gravity, and Drag elasticity.
/// - **Shatter Interaction**: On tap, the bubble "shatters" (callback).
/// - **Jelly Effect**: Simulated organic movement.
class BubbleViz extends StatefulWidget {
  final List<BubbleNode> nodes;
  final Function(BubbleNode) onNodeTap;
  final double width;
  final double height;

  const BubbleViz({
    Key? key,
    required this.nodes,
    required this.onNodeTap,
    this.width = 400,
    this.height = 400,
  }) : super(key: key);

  @override
  State<BubbleViz> createState() => _BubbleVizState();
}

class _BubbleVizState extends State<BubbleViz> with SingleTickerProviderStateMixin {
  late Ticker _ticker;
  final Random _random = Random();

  // Physics Parameters
  static const double repulsionForce = 1500.0;
  static const double centerGravity = 0.05;
  static const double damping = 0.92;
  static const double maxVelocity = 15.0;

  @override
  void initState() {
    super.initState();
    _initializePositions();
    _ticker = createTicker(_onTick)..start();
  }

  void _initializePositions() {
    final center = Offset(widget.width / 2, widget.height / 2);
    for (var node in widget.nodes) {
      // Scale radius based on value (mock logic for now)
      node.radius = 40.0 + (node.value * 2); 
      // Scatter randomly around center initially
      node.position = center + Offset(
        (_random.nextDouble() - 0.5) * 100, 
        (_random.nextDouble() - 0.5) * 100
      );
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  void _onTick(Duration elapsed) {
    if (!mounted) return;
    
    final center = Offset(widget.width / 2, widget.height / 2);

    setState(() {
      // 1. Apply Forces
      for (int i = 0; i < widget.nodes.length; i++) {
        var node = widget.nodes[i];
        if (node.isDragging) continue; // Skip physics for dragged nodes

        Offset force = Offset.zero;

        // A. Repulsion (Inter-bubble)
        for (int j = 0; j < widget.nodes.length; j++) {
          if (i == j) continue;
          var other = widget.nodes[j];
          
          var delta = node.position - other.position;
          var distance = delta.distance;
          var minDistance = node.radius + other.radius + 10; // +10 padding

          if (distance < minDistance) {
            // Strong repulsion if overlapping
            var strength = repulsionForce / (distance * distance + 0.1);
            force += delta.normalize() * strength * 5.0; 
          }
        }

        // B. Attraction to Center (Gravity)
        var toCenter = center - node.position;
        force += toCenter * centerGravity;

        // C. Wall Repulsion (Keep inside bounds)
        if (node.position.dx < node.radius) force += Offset(5.0, 0);
        if (node.position.dx > widget.width - node.radius) force -= Offset(5.0, 0);
        if (node.position.dy < node.radius) force += Offset(0, 5.0);
        if (node.position.dy > widget.height - node.radius) force -= Offset(0, 5.0);

        // 2. Apply Velocity
        node.velocity += force;
        node.velocity *= damping; // Friction

        // Cap velocity
        if (node.velocity.distance > maxVelocity) {
          node.velocity = node.velocity.normalize() * maxVelocity;
        }

        // 3. Move Node
        node.position += node.velocity;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: widget.width,
      height: widget.height,
      // Debug border or background if needed
      // color: Colors.blue.withOpacity(0.05), 
      child: Stack(
        children: widget.nodes.map((node) => _buildBubble(node)).toList(),
      ),
    );
  }

  Widget _buildBubble(BubbleNode node) {
    return Positioned(
      left: node.position.dx - node.radius,
      top: node.position.dy - node.radius,
      child: GestureDetector(
        onPanStart: (_) => node.isDragging = true,
        onPanUpdate: (details) {
          setState(() {
            node.position += details.delta;
            // Add some velocity to simulate "throw" on release could be cool
            node.velocity = details.delta; 
          });
        },
        onPanEnd: (_) => node.isDragging = false,
        onTap: () => widget.onNodeTap(node),
        child: _GlassBubble(node: node),
      ),
    );
  }
}

class _GlassBubble extends StatelessWidget {
  final BubbleNode node;

  const _GlassBubble({Key? key, required this.node}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          width: node.radius * 2,
          height: node.radius * 2,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            // Glass Gradient
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                node.color.withOpacity(0.4),
                node.color.withOpacity(0.1),
              ],
            ),
            // Light Reflection Border
            border: Border.all(
              color: Colors.white.withOpacity(0.2),
              width: 1.5,
            ),
            // Shadow for depth
            boxShadow: [
              BoxShadow(
                color: node.color.withOpacity(0.2),
                blurRadius: 15,
                spreadRadius: -5,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Shine Effect (Top Left)
              Positioned(
                top: node.radius * 0.2,
                left: node.radius * 0.2,
                child: Container(
                  width: node.radius * 0.4,
                  height: node.radius * 0.2,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.all(Radius.elliptical(node.radius, node.radius/2)),
                  ),
                ),
              ),
              // Content
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      node.label,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        shadows: [
                          Shadow(color: Colors.black26, blurRadius: 4),
                        ],
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      node.value.toStringAsFixed(0),
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 12,
                        fontFamily: 'JetBrains Mono', // If available
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
