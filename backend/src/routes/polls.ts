/**
 * Poll Routes
 */

import { Router } from 'express';
import { pollController } from '../controllers/pollController';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody, validateParams, validateQuery, schemas } from '../middleware/validation';
import { apiLimiter, responseLimiter, strictLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Poll routes
 */

// Create poll
router.post(
  '/',
  apiLimiter,
  validateBody(schemas.createPoll),
  asyncHandler(pollController.createPoll.bind(pollController))
);

// Get all polls
router.get(
  '/',
  apiLimiter,
  validateQuery(schemas.pagination),
  asyncHandler(pollController.getPolls.bind(pollController))
);

// Get poll by ID
router.get(
  '/:id',
  apiLimiter,
  validateParams(schemas.uuid),
  asyncHandler(pollController.getPoll.bind(pollController))
);

// Delete poll
router.delete(
  '/:id',
  apiLimiter,
  validateParams(schemas.uuid),
  asyncHandler(pollController.deletePoll.bind(pollController))
);

/**
 * Response routes
 */

// Submit response to poll
router.post(
  '/:id/responses',
  responseLimiter,
  validateParams(schemas.uuid),
  validateBody(schemas.createResponse),
  asyncHandler(pollController.submitResponse.bind(pollController))
);

// Get poll responses
router.get(
  '/:id/responses',
  apiLimiter,
  validateParams(schemas.uuid),
  asyncHandler(pollController.getResponses.bind(pollController))
);

/**
 * Processing routes
 */

// Trigger poll processing
router.post(
  '/:id/process',
  strictLimiter,
  validateParams(schemas.uuid),
  asyncHandler(pollController.processPoll.bind(pollController))
);

// Get processing status
router.get(
  '/:id/status',
  apiLimiter,
  validateParams(schemas.uuid),
  asyncHandler(pollController.getProcessingStatus.bind(pollController))
);

export default router;
