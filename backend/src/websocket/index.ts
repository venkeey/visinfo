/**
 * WebSocket Server
 * Provides real-time updates for response submissions
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer;

export function setupWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Handle client connections
  io.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);

    // Subscribe to poll updates
    socket.on('subscribe:poll', (pollId: string) => {
      console.log(`Client ${socket.id} subscribed to poll ${pollId}`);
      socket.join(`poll:${pollId}`);

      socket.emit('subscribed', { pollId });
    });

    // Unsubscribe from poll updates
    socket.on('unsubscribe:poll', (pollId: string) => {
      console.log(`Client ${socket.id} unsubscribed from poll ${pollId}`);
      socket.leave(`poll:${pollId}`);

      socket.emit('unsubscribed', { pollId });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  console.log('✓ WebSocket server initialized');

  return io;
}

/**
 * Get the WebSocket server instance
 */
export function getWebSocketServer(): SocketIOServer {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
}
