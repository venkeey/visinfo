/**
 * Authentication Middleware
 * Simple API key-based authentication for now
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from './errorHandler';

/**
 * Optional: API key authentication
 * Set API_KEY in environment variable to enable
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.API_KEY;

  // If no API_KEY set, skip authentication
  if (!apiKey) {
    return next();
  }

  const requestApiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!requestApiKey) {
    return next(new UnauthorizedError('API key required'));
  }

  if (requestApiKey !== apiKey) {
    return next(new UnauthorizedError('Invalid API key'));
  }

  next();
}

/**
 * Extract user ID from request (for future JWT implementation)
 */
export function extractUserId(req: Request): string | undefined {
  // For now, accept from header or body
  return (req.headers['x-user-id'] as string) || req.body.userId;
}
