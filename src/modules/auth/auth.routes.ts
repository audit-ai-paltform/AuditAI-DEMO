import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticateToken, requireAdmin } from './auth.middleware.js';

export const authRoutes = Router();

// Public authentication routes
authRoutes.post('/login', AuthController.login);
authRoutes.post('/register', AuthController.register);

// Protected user route
authRoutes.get('/me', authenticateToken, AuthController.getMe);

// Admin-only user and login controls routes
authRoutes.get('/admin/users', authenticateToken, requireAdmin, AuthController.adminListUsers);
authRoutes.post('/admin/users', authenticateToken, requireAdmin, AuthController.adminCreateUser);
authRoutes.patch('/admin/users/:id/toggle-login', authenticateToken, requireAdmin, AuthController.adminToggleUserLogin);
authRoutes.post('/admin/users/:id/reset-password', authenticateToken, requireAdmin, AuthController.adminResetPassword);
authRoutes.delete('/admin/users/:id', authenticateToken, requireAdmin, AuthController.adminDeleteUser);

authRoutes.get('/admin/login-controls', authenticateToken, requireAdmin, AuthController.adminGetControls);
authRoutes.put('/admin/login-controls', authenticateToken, requireAdmin, AuthController.adminUpdateControls);
authRoutes.get('/admin/audit-logs', authenticateToken, requireAdmin, AuthController.adminGetAuditLogs);
