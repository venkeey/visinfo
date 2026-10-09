/**
 * Retry Utility
 * Provides retry logic with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }

      // Check if this is the last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      } else {
        console.warn(
          `Attempt ${attempt + 1}/${maxRetries} failed: ${error.message}. Retrying in ${delay}ms...`
        );
      }

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Default retry decision logic
 */
function defaultShouldRetry(error: any): boolean {
  // Don't retry on authentication errors
  if (error.statusCode === 401 || error.status === 401) {
    return false;
  }

  // Don't retry on validation errors
  if (error.statusCode === 400 || error.status === 400) {
    return false;
  }

  // Retry on rate limits
  if (error.statusCode === 429 || error.status === 429) {
    return true;
  }

  // Retry on server errors (5xx)
  if (error.statusCode >= 500 || error.status >= 500) {
    return true;
  }

  // Retry on network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Default: retry
  return true;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with jitter (adds randomness to avoid thundering herd)
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    ...options,
    baseDelay: (options.baseDelay || 1000) * (0.5 + Math.random()),
  });
}
