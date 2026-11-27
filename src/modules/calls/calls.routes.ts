import { Router } from 'express';
import { callController } from './calls.controller.js';
import { callFlagsController } from './calls-flags.controller.js';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';
import {
  validateCreateCall,
  validateUpdateCall,
  validateGetCallById,
  validateListCalls,
  validateDeleteCall,
} from './calls.validator.js';

const router = Router();

router.post('/', validateCreateCall, asyncHandler(callController.create));
router.get('/', validateListCalls, asyncHandler(callController.list));
router.get('/:id', validateGetCallById, asyncHandler(callController.getById));
router.patch('/:id', validateUpdateCall, asyncHandler(callController.update));
router.delete('/:id', validateDeleteCall, asyncHandler(callController.delete));

// Flags & audit trail as first-class call sub-resources
router.get('/events/recent', asyncHandler(callFlagsController.recentProcessingEvents));
router.get('/:id/flags', asyncHandler(callFlagsController.listForCall));
router.get('/:id/events', asyncHandler(callFlagsController.processingEvents));

// Re-evaluation workflow routes
router.post('/:id/re-evaluate', asyncHandler(callController.reEvaluate));
router.get('/:id/evaluations', asyncHandler(callController.listEvaluations));

export const callRoutes = router;
