import { Router } from 'express';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';
import { integrationsController } from './integrations.controller.js';

export const integrationsRoutes = Router();
integrationsRoutes.get('/', asyncHandler(integrationsController.list));
integrationsRoutes.post('/test', asyncHandler(integrationsController.test));
integrationsRoutes.put('/', asyncHandler(integrationsController.save));
integrationsRoutes.delete('/:provider', asyncHandler(integrationsController.remove));
