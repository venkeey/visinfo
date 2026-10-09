/**
 * Server Entry Point
 * Initializes and starts the VisInfo backend server
 */

import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { setupWebSocket } from './websocket';
import { startWorker } from './queue/worker';
import { testConnection, closePool } from './database/config';
import { testRedisConnection, closeRedisConnections } from './queue/config';
import { validateAIConfig } from './ai/config/aiConfig';
import { closeQueue } from './queue/pollQueue';

const PORT = process.env.PORT || 3000;

/**
 * Bootstrap the application
 */
async function bootstrap() {
  try {
    console.log('🚀 Starting VisInfo Backend Server...\n');

    // 1. Validate configurations
    console.log('1. Validating configurations...');
    validateAIConfig();

    // 2. Test database connection
    console.log('\n2. Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // 3. Test Redis connection
    console.log('\n3. Testing Redis connection...');
    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      console.error('Failed to connect to Redis. Exiting...');
      process.exit(1);
    }

    // 4. Create HTTP server
    console.log('\n4. Creating HTTP server...');
    const httpServer = createServer(app);

    // 5. Setup WebSocket
    console.log('\n5. Setting up WebSocket...');
    setupWebSocket(httpServer);

    // 6. Start queue worker
    console.log('\n6. Starting queue worker...');
    startWorker();

    // 7. Start HTTP server
    console.log('\n7. Starting HTTP server...');
    httpServer.listen(PORT, () => {
      console.log(`\n✓ Server is running on port ${PORT}`);
      console.log(`  - API: http://localhost:${PORT}/api/v1`);
      console.log(`  - Health: http://localhost:${PORT}/api/v1/health`);
      console.log(`  - WebSocket: ws://localhost:${PORT}\n`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(httpServer));
    process.on('SIGINT', () => gracefulShutdown(httpServer));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(server: any) {
  console.log('\n⏳ Gracefully shutting down...');

  // Stop accepting new connections
  server.close(() => {
    console.log('✓ HTTP server closed');
  });

  try {
    // Close queue
    await closeQueue();

    // Close Redis connections
    await closeRedisConnections();

    // Close database pool
    await closePool();

    console.log('✓ All connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();

