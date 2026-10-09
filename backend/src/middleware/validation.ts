/**
 * Validation Middleware using Zod
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from './errorHandler';

/**
 * Validate request body
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
        next(new ValidationError(messages.join(', ')));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate query params
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
        next(new ValidationError(messages.join(', ')));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate path params
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
        next(new ValidationError(messages.join(', ')));
      } else {
        next(error);
      }
    }
  };
}

// Common validation schemas
export const schemas = {
  uuid: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  pagination: z.object({
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 100)),
    offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
  }),

  createPoll: z.object({
    question: z.string().min(10, 'Question must be at least 10 characters'),
    description: z.string().optional(),
    expiresAt: z.string().datetime('Invalid datetime format'),
  }),

  createResponse: z.object({
    text: z.string().min(1, 'Response text is required').max(1000, 'Response too long'),
    userId: z.string().optional(),
  }),
};
