import { Router } from 'express';
import { UserActivityController } from './user-activity.controller.js';

export const userActivityRoutes = Router();

// Heartbeat ping from frontend active tab
userActivityRoutes.post('/auth/heartbeat', UserActivityController.heartbeat);
userActivityRoutes.post('/auth/logout-activity', UserActivityController.logout);

// Admin portal user session activity list
userActivityRoutes.get('/admin/v1/users/activity', UserActivityController.getAll);
