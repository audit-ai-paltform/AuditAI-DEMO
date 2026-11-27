import { Router } from 'express';
import { TeamController } from './team.controller.js';

export const teamRoutes = Router();

// Public endpoint for home page
teamRoutes.get('/public/team', TeamController.getPublicTeam);

// Admin portal endpoints
teamRoutes.get('/admin/v1/team', TeamController.getAdminTeam);
teamRoutes.post('/admin/v1/team', TeamController.createMember);
teamRoutes.put('/admin/v1/team/:id', TeamController.updateMember);
teamRoutes.delete('/admin/v1/team/:id', TeamController.deleteMember);
