import { AuthRepository } from './auth.repository.js';
import { AuthCrypto } from './auth.crypto.js';
import { AuthUser, AdminLoginControls, AuthSession } from './auth.types.js';

export class AuthService {
  /**
   * Client & Admin Login with email and password
   * Strictly enforces admin-governed login controls.
   */
  static async login(
    email: string,
    pass: string,
    ip = '127.0.0.1',
    _userAgent = 'Web-Browser'
  ): Promise<AuthSession> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !pass) {
      throw new Error('Email and password are required');
    }

    const user = await AuthRepository.findByEmail(cleanEmail);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const controls = await AuthRepository.getControls();

    // 1. Check if user is locked due to excessive failed attempts
    if (user.locked_until) {
      const lockExpiry = new Date(user.locked_until).getTime();
      if (Date.now() < lockExpiry) {
        const remainingMinutes = Math.ceil((lockExpiry - Date.now()) / (60 * 1000));
        throw new Error(
          `Account is temporarily locked due to failed attempts. Try again in ${remainingMinutes} minute(s) or contact your Administrator.`
        );
      } else {
        // Lock expired, reset lock
        await AuthRepository.update(user.id, {
          locked_until: null,
          failed_login_attempts: 0,
        });
        user.failed_login_attempts = 0;
      }
    }

    // 2. Full Admin Login Control Check: is login_enabled toggled on?
    if (user.login_enabled === false) {
      throw new Error(
        'Access Denied: Your login access has been disabled by the Administrator. Please contact system admin for permission.'
      );
    }

    // 3. User Account Status Check
    if (user.status === 'SUSPENDED') {
      throw new Error(
        'Account Suspended: Your account has been suspended by the Administrator. Access is currently revoked.'
      );
    }

    if (user.status === 'PENDING_APPROVAL') {
      throw new Error(
        'Account Pending: Your account is awaiting review and activation by the Administrator. Please check back shortly.'
      );
    }

    // 4. Verify Password
    const passwordMatch = AuthCrypto.verifyPassword(pass, user.password_hash, user.salt);
    if (!passwordMatch) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const updates: any = { failed_login_attempts: attempts };

      if (attempts >= controls.max_login_attempts) {
        const lockDurationMs = (controls.lockout_minutes || 15) * 60 * 1000;
        updates.locked_until = new Date(Date.now() + lockDurationMs).toISOString();
      }

      await AuthRepository.update(user.id, updates);

      if (attempts >= controls.max_login_attempts) {
        throw new Error(
          `Maximum login attempts exceeded. Account is locked for ${controls.lockout_minutes} minutes.`
        );
      }

      throw new Error('Invalid email or password');
    }

    // 5. Successful login: Reset failed attempts, log timestamp and IP
    await AuthRepository.update(user.id, {
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
      last_login_ip: ip,
    });

    const token = AuthCrypto.signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        company: user.company,
        tenant_id: user.tenant_id,
        status: user.status,
        login_enabled: user.login_enabled,
      },
      expiresIn: controls.session_timeout_hours * 3600,
    };
  }

  /**
   * Client Self-Registration (Controlled by Admin policy)
   */
  static async register(data: {
    email: string;
    password: string;
    full_name: string;
    company?: string;
    phone?: string;
    role?: 'admin' | 'client';
  }): Promise<{ user: AuthUser; message: string }> {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const existing = await AuthRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new Error('A user with this email address already exists');
    }

    const controls = await AuthRepository.getControls();
    if (!controls.allow_client_self_registration && data.role !== 'admin') {
      throw new Error('User self-registration is currently disabled by the Administrator');
    }

    // If admin approval is required, default to PENDING_APPROVAL and login_enabled: false
    const requireApproval = controls.require_admin_approval;
    const status = requireApproval ? 'PENDING_APPROVAL' : 'ACTIVE';
    const login_enabled = !requireApproval;

    const { hash, salt } = AuthCrypto.hashPassword(data.password);

    const user = await AuthRepository.create({
      email: cleanEmail,
      password_hash: hash,
      salt,
      role: data.role === 'admin' ? 'admin' : 'client',
      full_name: data.full_name,
      company: data.company,
      phone: data.phone,
      status,
      login_enabled,
    });

    const message = requireApproval
      ? 'Registration successful. Your account is pending administrator approval before you can log in.'
      : 'Account created successfully. You may now log in.';

    return { user, message };
  }

  /* ------------------------------------------------------------------ */
  /* ADMIN-ONLY USER & LOGIN MANAGEMENT METHODS                         */
  /* ------------------------------------------------------------------ */

  /**
   * Admin lists all users across the system
   */
  static async adminListUsers(): Promise<AuthUser[]> {
    return AuthRepository.listAll();
  }

  /**
   * Admin creates a new client or admin user directly
   */
  static async adminCreateUser(
    adminId: string,
    data: {
      email: string;
      password: string;
      full_name: string;
      role: 'admin' | 'client';
      company?: string;
      phone?: string;
      login_enabled?: boolean;
      status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
    }
  ): Promise<AuthUser> {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const existing = await AuthRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const { hash, salt } = AuthCrypto.hashPassword(data.password);
    const user = await AuthRepository.create({
      email: cleanEmail,
      password_hash: hash,
      salt,
      role: data.role || 'client',
      full_name: data.full_name,
      company: data.company,
      phone: data.phone,
      status: data.status || 'ACTIVE',
      login_enabled: data.login_enabled !== undefined ? data.login_enabled : true,
    });

    await AuthRepository.recordLog({
      admin_id: adminId,
      target_user_id: user.id,
      action: 'USER_CREATED_BY_ADMIN',
      details: { email: user.email, role: user.role, status: user.status },
    });

    return user;
  }

  /**
   * Admin toggles user login control and status
   */
  static async adminToggleUserLogin(
    adminId: string,
    targetUserId: string,
    params: {
      login_enabled?: boolean;
      status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
      role?: 'admin' | 'client';
    }
  ): Promise<AuthUser> {
    const user = await AuthRepository.findById(targetUserId);
    if (!user) throw new Error('User not found');

    const updates: any = {};
    if (params.login_enabled !== undefined) updates.login_enabled = Boolean(params.login_enabled);
    if (params.status) updates.status = params.status;
    if (params.role) updates.role = params.role;

    const updated = await AuthRepository.update(targetUserId, updates);
    if (!updated) throw new Error('Failed to update user login controls');

    await AuthRepository.recordLog({
      admin_id: adminId,
      target_user_id: targetUserId,
      action: 'LOGIN_CONTROLS_UPDATED',
      details: params,
    });

    return updated;
  }

  /**
   * Admin resets user password
   */
  static async adminResetPassword(
    adminId: string,
    targetUserId: string,
    newPass: string
  ): Promise<void> {
    if (!newPass || newPass.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    const { hash, salt } = AuthCrypto.hashPassword(newPass);
    await AuthRepository.update(targetUserId, {
      password_hash: hash,
      salt,
      failed_login_attempts: 0,
      locked_until: null,
    });

    await AuthRepository.recordLog({
      admin_id: adminId,
      target_user_id: targetUserId,
      action: 'PASSWORD_RESET_BY_ADMIN',
      details: { timestamp: new Date().toISOString() },
    });
  }

  /**
   * Admin deletes or deactivates user
   */
  static async adminDeleteUser(adminId: string, targetUserId: string): Promise<void> {
    await AuthRepository.delete(targetUserId);
    await AuthRepository.recordLog({
      admin_id: adminId,
      target_user_id: targetUserId,
      action: 'USER_DELETED_BY_ADMIN',
      details: { deletedAt: new Date().toISOString() },
    });
  }

  /**
   * Get global login security policies
   */
  static async adminGetControls(): Promise<AdminLoginControls> {
    return AuthRepository.getControls();
  }

  /**
   * Update global login policies
   */
  static async adminUpdateControls(
    adminId: string,
    updates: Partial<AdminLoginControls>
  ): Promise<AdminLoginControls> {
    const controls = await AuthRepository.updateControls(updates);
    await AuthRepository.recordLog({
      admin_id: adminId,
      action: 'SYSTEM_LOGIN_POLICY_UPDATED',
      details: updates,
    });
    return controls;
  }

  /**
   * Get audit logs
   */
  static async adminGetAuditLogs() {
    return AuthRepository.getLogs();
  }
}
