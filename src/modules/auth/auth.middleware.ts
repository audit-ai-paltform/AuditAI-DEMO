import { Request, Response, NextFunction } from 'express';
import { AuthCrypto } from './auth.crypto.js';
import { AuthRepository } from './auth.repository.js';
import { JwtPayload } from './auth.types.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { full_name?: string; status?: string };
}

/**
 * Middleware: Verifies Bearer JWT token and enforces live login controls
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    return;
  }

  const payload = AuthCrypto.verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
    return;
  }

  // Live lookup to ensure admin hasn't toggled off login or suspended user in the meantime
  const user = await AuthRepository.findById(payload.userId);
  if (!user) {
    res.status(401).json({ success: false, message: 'User account not found.' });
    return;
  }

  if (user.login_enabled === false) {
    res.status(403).json({
      success: false,
      message: 'Access revoked: Your login privileges have been disabled by the Administrator.',
    });
    return;
  }

  if (user.status !== 'ACTIVE') {
    res.status(403).json({
      success: false,
      message: `Access denied: Account status is ${user.status}. Contact your Administrator.`,
    });
    return;
  }

  req.user = {
    ...payload,
    role: user.role,
    full_name: user.full_name,
    status: user.status,
  };

  // Populate locals for downstream middleware compatibility
  res.locals.userId = user.id;
  res.locals.tenantId = user.tenant_id;
  res.locals.tenantRole = user.role;

  next();
}

/**
 * Middleware: Enforces that the authenticated user is an Administrator
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Administrative privileges required for this action.',
    });
    return;
  }
  next();
}
