/**
 * Rate Limiter Utility
 * Helps manage API rate limits across different providers
 */

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay?: number;
}

export class RateLimiter {
  private requests: number[] = []; // Timestamps of requests
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if a request can be made now
   */
  canMakeRequest(): boolean {
    this.cleanOldRequests();
    const recentRequests = this.requests.length;
    return recentRequests < this.config.requestsPerMinute;
  }

  /**
   * Wait until a request can be made
   */
  async waitForSlot(): Promise<void> {
    while (!this.canMakeRequest()) {
      await this.sleep(100); // Check every 100ms
    }
    this.recordRequest();
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.requests.push(Date.now());
  }

  /**
   * Remove requests older than 1 minute
   */
  private cleanOldRequests(): void {
    const oneMinuteAgo = Date.now() - 60 * 1000;
    this.requests = this.requests.filter((timestamp) => timestamp > oneMinuteAgo);
  }

  /**
   * Get current request count
   */
  getCurrentCount(): number {
    this.cleanOldRequests();
    return this.requests.length;
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
  }

  /**
   * Helper: Sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Predefined rate limiters for common providers
export const rateLimiters = {
  openai: new RateLimiter({ requestsPerMinute: 500 }),
  gemini: new RateLimiter({ requestsPerMinute: 60 }),
  openrouter: new RateLimiter({ requestsPerMinute: 200 }),
};
