/**
 * Job Queue Configuration (Bull + Redis)
 */

import Queue from 'bull';
import Redis from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create Redis clients
export const redisClient = new Redis(redisConfig);
export const redisSubscriber = new Redis(redisConfig);

// Handle Redis connection errors
redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

redisClient.on('connect', () => {
  console.log('✓ Redis client connected');
});

redisSubscriber.on('error', (err) => {
  console.error('Redis subscriber error:', err);
});

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redisClient.ping();
    console.log('✓ Redis connection successful');
    return true;
  } catch (error) {
    console.error('✗ Redis connection failed:', error);
    return false;
  }
}

/**
 * Close Redis connections
 */
export async function closeRedisConnections(): Promise<void> {
  await redisClient.quit();
  await redisSubscriber.quit();
  console.log('Redis connections closed');
}

// Default queue options
export const defaultQueueOptions: Queue.QueueOptions = {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
};
