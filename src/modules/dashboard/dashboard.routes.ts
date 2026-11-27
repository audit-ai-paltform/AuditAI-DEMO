import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';

const router = Router();

router.get('/kpis', asyncHandler(dashboardController.kpis));
router.get('/alerts', asyncHandler(dashboardController.alerts));

export const dashboardRoutes = router;
