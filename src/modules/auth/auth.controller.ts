import { Response } from 'express';
import { AuthService } from './auth.service.js';
import { AuthenticatedRequest } from './auth.middleware.js';

export class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Browser';

      const session = await AuthService.login(email, password, ip, userAgent);
      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: session,
      });
    } catch (err: any) {
      const status = err.message.includes('disabled') || err.message.includes('suspended') || err.message.includes('Pending') ? 403 : 401;
      res.status(status).json({
        success: false,
        message: err.message || 'Login failed',
      });
    }
  }

  /**
   * POST /api/v1/auth/register
   */
  static async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, full_name, company, phone, role } = req.body;
      const result = await AuthService.register({
        email,
        password,
        full_name,
        company,
        phone,
        role: role === 'admin' ? 'admin' : 'client',
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.user,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Registration failed',
      });
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }
    res.status(200).json({
      success: true,
      data: req.user,
    });
  }

  /* ------------------------------------------------------------------ */
  /* ADMIN USER & LOGIN MANAGEMENT ENDPOINTS                            */
  /* ------------------------------------------------------------------ */

  /**
   * GET /api/v1/auth/admin/users
   */
  static async adminListUsers(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const users = await AuthService.adminListUsers();
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/v1/auth/admin/users
   */
  static async adminCreateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
      const user = await AuthService.adminCreateUser(adminId, req.body);
      res.status(201).json({
        success: true,
        message: 'User created successfully under administrative control',
        data: user,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * PATCH /api/v1/auth/admin/users/:id/toggle-login
   * Allows admin to enable/disable login or suspend client
   */
  static async adminToggleUserLogin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
      const targetUserId = req.params.id || '';
      const { login_enabled, status, role } = req.body;

      const updated = await AuthService.adminToggleUserLogin(adminId, targetUserId, {
        login_enabled,
        status,
        role,
      });

      res.status(200).json({
        success: true,
        message: `Login controls for user updated successfully. Login is now ${updated.login_enabled ? 'ENABLED' : 'DISABLED'}`,
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/v1/auth/admin/users/:id/reset-password
   */
  static async adminResetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
      const targetUserId = req.params.id || '';
      const { password } = req.body;

      await AuthService.adminResetPassword(adminId, targetUserId, password);
      res.status(200).json({
        success: true,
        message: 'User password reset by administrator successfully',
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * DELETE /api/v1/auth/admin/users/:id
   */
  static async adminDeleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
      const targetUserId = req.params.id || '';

      await AuthService.adminDeleteUser(adminId, targetUserId);
      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/auth/admin/login-controls
   */
  static async adminGetControls(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const controls = await AuthService.adminGetControls();
      res.status(200).json({ success: true, data: controls });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * PUT /api/v1/auth/admin/login-controls
   */
  static async adminUpdateControls(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user?.userId || '00000000-0000-0000-0000-000000000001';
      const controls = await AuthService.adminUpdateControls(adminId, req.body);
      res.status(200).json({
        success: true,
        message: 'System login policies updated successfully',
        data: controls,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/auth/admin/audit-logs
   */
  static async adminGetAuditLogs(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const logs = await AuthService.adminGetAuditLogs();
      res.status(200).json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
