-- ====================================================================
-- AuditAI Architecture Separation: Phase 1
-- Dedicated Authentication & User Information Database Schema
--
-- Note: As per architecture requirements, the primary PostgreSQL / Supabase
-- database is now designated EXCLUSIVELY for Authentication, User Credentials,
-- Role-Based Access Control, Sessions, and Admin Login Controls.
-- All operational application data (calls, evaluations, scripts, parameters,
-- audit flags, reports) is migrated to Cloudflare D1 (SQL) and R2 (Storage).
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function: Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION update_auth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------
-- TABLE: auth_users
-- Core identity and login control repository managed by Administrator
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  full_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  
  -- Admin Login Controls
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL')),
  login_enabled BOOLEAN NOT NULL DEFAULT true,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  locked_until TIMESTAMPTZ,
  
  -- Audit and session tracking
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_auth_users_updated_at ON auth_users;
CREATE TRIGGER set_auth_users_updated_at
  BEFORE UPDATE ON auth_users
  FOR EACH ROW
  EXECUTE FUNCTION update_auth_updated_at();

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role);
CREATE INDEX IF NOT EXISTS idx_auth_users_status_login ON auth_users(status, login_enabled);

-- --------------------------------------------------------------------
-- TABLE: admin_login_controls
-- Global login and security controls configured by Admin
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_login_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  require_admin_approval BOOLEAN NOT NULL DEFAULT false,
  max_login_attempts INTEGER NOT NULL DEFAULT 5,
  lockout_minutes INTEGER NOT NULL DEFAULT 15,
  session_timeout_hours INTEGER NOT NULL DEFAULT 24,
  allow_client_self_registration BOOLEAN NOT NULL DEFAULT true,
  enforce_password_complexity BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default admin login controls
INSERT INTO admin_login_controls (
  id, require_admin_approval, max_login_attempts, lockout_minutes, session_timeout_hours, allow_client_self_registration
) VALUES (
  '00000000-0000-0000-0000-000000000001', false, 5, 15, 24, true
) ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- TABLE: user_sessions
-- Active access tokens and revocable sessions
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);

-- --------------------------------------------------------------------
-- TABLE: admin_audit_logs
-- Immutable audit log of administrative actions and login overrides
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

-- --------------------------------------------------------------------
-- SEED DEFAULT USERS (Admin and Client)
-- Passwords:
-- Admin:  admin@auditai.io  /  Admin@12345
-- Client: client@auditai.io /  Client@12345
-- --------------------------------------------------------------------
INSERT INTO auth_users (
  id, email, password_hash, salt, role, full_name, company, status, login_enabled, tenant_id
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@auditai.io',
  'e6c2763f0442385b03517de658c148c36ec3b9343be529641e428ae4785420e7', -- SHA-256 with salt
  'auditai_system_salt_admin_2026',
  'admin',
  'Master Administrator',
  'AuditAI Global Operations',
  'ACTIVE',
  true,
  '00000000-0000-0000-0000-000000000001'
),
(
  '00000000-0000-0000-0000-000000000002',
  'client@auditai.io',
  '55aa1a017992be7e1b9b940984ee49479e09d5718dfd73b5ee45b9b657497ecb',
  'auditai_system_salt_client_2026',
  'client',
  'Enterprise Quality Auditor',
  'NA Enterprise Call Center',
  'ACTIVE',
  true,
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  login_enabled = EXCLUDED.login_enabled;

-- Grant permissions for service roles
GRANT ALL ON TABLE auth_users, admin_login_controls, user_sessions, admin_audit_logs TO anon, authenticated, service_role, postgres;
