export type UserRole = 'admin' | 'client';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  company?: string;
  phone?: string;
  status: UserStatus;
  login_enabled: boolean;
  failed_login_attempts: number;
  locked_until?: string | null;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  must_change_password?: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface AdminLoginControls {
  id: string;
  require_admin_approval: boolean;
  max_login_attempts: number;
  lockout_minutes: number;
  session_timeout_hours: number;
  allow_client_self_registration: boolean;
  enforce_password_complexity: boolean;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  target_user_id?: string;
  action: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
  iat?: number;
  exp?: number;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
    company?: string;
    tenant_id: string;
    status: UserStatus;
    login_enabled: boolean;
  };
  expiresIn: number;
}
