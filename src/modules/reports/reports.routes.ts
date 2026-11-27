import { Router } from 'express';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';
import { reportsController } from './reports.controller.js';
export const reportsRoutes = Router();
reportsRoutes.get('/', asyncHandler(reportsController.list));
reportsRoutes.post('/', asyncHandler(reportsController.generate));
reportsRoutes.post('/:id/regenerate', asyncHandler(reportsController.regenerate));
reportsRoutes.get('/:id/download', asyncHandler(reportsController.download));
