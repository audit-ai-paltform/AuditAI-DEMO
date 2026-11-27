import { Router } from 'express';
import { notificationController } from './notifications.controller.js';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';

const router = Router();

router.get('/', asyncHandler(notificationController.list));
router.patch('/:id/read', asyncHandler(notificationController.markRead));
router.post('/read-all', asyncHandler(notificationController.markAllRead));

export const notificationRoutes = router;
