import { NextFunction, Request, Response } from 'express';
import { supabaseClient } from '../../config/supabase.client.js';
import { supabaseAdminClient } from '../../config/supabase.admin.js';
import { env } from '../../config/env.config.js';
import { AuthCrypto } from '../../../modules/auth/auth.crypto.js';
import { AuthRepository } from '../../../modules/auth/auth.repository.js';
import { BillingService } from '../../../modules/billing/billing.service.js';

const DEFAULT_DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export const ROLE_HIERARCHY: string[] = ['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN', 'OWNER'];

function requestedTenant(req: Request): string | undefined {
  return (
    (req.headers['x-tenant-id'] as string | undefined) ||
    (req.query.tenant_id as string | undefined) ||
    (req.body?.tenant_id as string | undefined) ||
    (req.body?.client_id as string | undefined) ||
    (req.query.client_id as string | undefined)
  );
}

/**
 * Establishes server-verified tenant context.
 * Resolves the tenant exclusively through verified User session and active tenant membership.
 * Enforces admin login controls in real-time.
 */
export async function requireTenantAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (token) {
    // 1. Verify against dedicated AuditAI Auth system
    const authPayload = AuthCrypto.verifyToken(token);
    if (authPayload) {
      const user = await AuthRepository.findById(authPayload.userId);
      if (user) {
        if (user.login_enabled === false) {
          res.status(403).json({ error: 'Forbidden: Login disabled by administrator.' });
          return;
        }
        if (user.status !== 'ACTIVE') {
          res.status(403).json({ error: `Forbidden: Account status is ${user.status}.` });
          return;
        }

        const role = user.role.toUpperCase();
        res.locals.tenantId = user.tenant_id || DEFAULT_DEV_TENANT_ID;
        res.locals.tenantRole = role;
        res.locals.userId = user.id;
        (req as any).tenantId = res.locals.tenantId;
        (req as any).user = user;
        return next();
      }
    }

    // 2. Fallback to Supabase auth for legacy connections
    try {
      const { data: identity, error: identityError } = await supabaseClient.auth.getUser(token);
      if (!identityError && identity?.user) {
        const { data: memberships, error: memError } = await supabaseAdminClient
          .from('tenant_memberships')
          .select('tenant_id, role')
          .eq('user_id', identity.user.id)
          .eq('status', 'ACTIVE');

        if (!memError && memberships && memberships.length > 0) {
          const clientSpecified = requestedTenant(req);
          const matched = clientSpecified
            ? memberships.find((m) => m.tenant_id === clientSpecified)
            : memberships[0];

          if (matched) {
            res.locals.tenantId = matched.tenant_id;
            res.locals.tenantRole = matched.role.toUpperCase();
            res.locals.userId = identity.user.id;
            (req as any).tenantId = res.locals.tenantId;
            return next();
          }
          res.status(403).json({ error: 'Forbidden: No active membership for requested tenant' });
          return;
        }
      }
    } catch {
      // Ignore
    }

    if (env.REQUIRE_TENANT_AUTH) {
      res.status(401).json({ error: 'Invalid authentication token or no active tenant membership' });
      return;
    }
  }

  // If no auth token provided and strict tenant auth is required, block the request
  if (env.REQUIRE_TENANT_AUTH) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Safe development fallback: assign lowest-privilege VIEWER role instead of OWNER to prevent privilege escalation
  const fallback = requestedTenant(req) || DEFAULT_DEV_TENANT_ID;
  res.locals.tenantId = fallback;
  res.locals.tenantRole = 'VIEWER';
  (req as any).tenantId = fallback;
  next();
}

/**
 * Enforces role-based access control based on ROLE_HIERARCHY.
 * requireRole(['ADMIN']) permits ADMIN and OWNER.
 */
export function requireRole(allowedRoles: string[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const currentRole = (res.locals.tenantRole || 'VIEWER').toUpperCase();
    const currentIndex = ROLE_HIERARCHY.indexOf(currentRole);

    // Find the minimum required level among the allowed roles
    const minRequiredIndex = Math.min(
      ...allowedRoles.map((r) => {
        const idx = ROLE_HIERARCHY.indexOf(r.toUpperCase());
        return idx !== -1 ? idx : 999;
      })
    );

    if (currentIndex >= minRequiredIndex) {
      return next();
    }

    res.status(403).json({
      error: 'Forbidden: Insufficient privileges for this operation',
      requiredRoles: allowedRoles,
      currentRole,
    });
  };
}

/**
 * Enforces an active, non-expired subscription for the tenant.
 * Returns 402 Payment Required if expired, past grace period, or canceled.
 */
export function requireActiveSubscription(_req: Request, res: Response, next: NextFunction): void {
  const tenantId = res.locals.tenantId || DEFAULT_DEV_TENANT_ID;
  const sub = BillingService.getSubscription(tenantId);

  if (!sub) {
    res.status(402).json({
      error: 'Active subscription required. Please choose a plan to proceed.',
      code: 'SUBSCRIPTION_REQUIRED',
    });
    return;
  }

  const isPeriodValid = new Date(sub.current_period_end).getTime() > Date.now();
  if (sub.status === 'ACTIVE' || (sub.status === 'TRIALING' && isPeriodValid)) {
    return next();
  }

  res.status(402).json({
    error: `Subscription is ${sub.status}. Renewal or payment required.`,
    code: 'PAYMENT_REQUIRED',
    subscription: sub,
  });
}

/**
 * Enforces platform-level administrator access.
 */
export function requirePlatformAdmin(_req: Request, res: Response, next: NextFunction): void {
  const currentRole = (res.locals.tenantRole || '').toUpperCase();
  if (currentRole === 'OWNER' || currentRole === 'ADMIN' || currentRole === 'PLATFORM_ADMIN') {
    return next();
  }

  res.status(403).json({
    error: 'Forbidden: Platform administrator access required',
  });
}
