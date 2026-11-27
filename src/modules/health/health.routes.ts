import { Router } from 'express';
import { healthController } from './health.controller.js';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';

const router = Router();

router.get('/health', asyncHandler(healthController.getLive));
router.get('/health/live', asyncHandler(healthController.getLive));
router.get('/health/ready', asyncHandler(healthController.getReady));

export const healthRoutes = router;
