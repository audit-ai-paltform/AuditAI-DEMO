import { Router } from 'express';
import { settingsController } from './settings.controller.js';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';

const router = Router();

router.get('/', asyncHandler(settingsController.getConfig));
router.post('/sop-versions', asyncHandler(settingsController.uploadSop));
router.post('/sop-versions/:id/activate', asyncHandler(settingsController.activateSop));
router.post('/sop/process', asyncHandler(settingsController.processSop));
router.post('/sop/parameters/approve', asyncHandler(settingsController.approveParameters));
router.post('/activate', asyncHandler(settingsController.activateConfiguration));
router.patch('/preferences', asyncHandler(settingsController.updatePreferences));

export const settingsRoutes = router;
