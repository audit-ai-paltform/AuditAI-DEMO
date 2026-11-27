-- ====================================================================
-- AUDITAI QALYZER v2.0 - UNIFIED SUPABASE POSTGRESQL MASTER SCHEMA
-- Target Database: PostgreSQL 15+ (Supabase)
-- Instruction: Run this script directly in the Supabase SQL Editor.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function: Generic updated_at Trigger
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------
-- 1. MULTI-TENANT ORGANIZATIONS (tenants)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  gstin TEXT,
  billing_email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility view if clients table doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') THEN
    CREATE VIEW clients AS SELECT id, name, status, created_at FROM tenants;
  END IF;
END $$;

-- Seed Default Production Tenant
INSERT INTO tenants (id, name, legal_name, billing_email, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme BPO & Telephony Enterprise',
  'Acme Telephony Solutions India Pvt Ltd',
  'billing@acmetelephony.in',
  'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 2. DEDICATED AUTHENTICATION & ACCESS GOVERNANCE (auth_users)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client', 'analyst', 'manager')),
  full_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL')),
  login_enabled BOOLEAN NOT NULL DEFAULT true,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_tenant ON auth_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_status_login ON auth_users(status, login_enabled);

-- Seed Default Admin & Client (Pass: Admin@12345 / Client@12345)
INSERT INTO auth_users (id, email, password_hash, salt, role, full_name, company, tenant_id, status, login_enabled)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@auditai.io',
    'c2c1a84f3eb7ebaafead31fa383180b7c3d25ff114099b2bb12caefca23055da3c22adfd5128cf6489bbbb2cf607759a7213bb1640a4611593efd9a26ce5a420',
    'auditai_static_salt_admin_2026',
    'admin',
    'Master Administrator',
    'AuditAI Enterprise Governance',
    '00000000-0000-0000-0000-000000000001',
    'ACTIVE',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'client@auditai.io',
    '1522f18fe84cb80ca238a221f7db1a1b1a7fe92e7c4f4d262ff4a68fc725fa19ea3fc80d60d3d5f8bfd46698642a8a1eb3d52718e87d853e5ffdae5bbba50b0b',
    'auditai_static_salt_client_2026',
    'client',
    'Enterprise Client Partner',
    'Acme Telephony Solutions',
    '00000000-0000-0000-0000-000000000001',
    'ACTIVE',
    true
  )
ON CONFLICT (email) DO NOTHING;

-- Admin Global Login & Security Policies
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

INSERT INTO admin_login_controls (id, require_admin_approval, max_login_attempts, lockout_minutes, session_timeout_hours, allow_client_self_registration)
VALUES ('00000000-0000-0000-0000-000000000001', false, 5, 15, 24, true)
ON CONFLICT (id) DO NOTHING;

-- User Sessions (Revocable JWT Tokens)
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

-- User Login Activity & Heartbeat Tracking (last login, total active time)
CREATE TABLE IF NOT EXISTS user_login_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_active_seconds INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOGGED_OUT', 'TIMEOUT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_login_activity_user ON user_login_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_activity_tenant ON user_login_activity(tenant_id);

-- --------------------------------------------------------------------
-- 3. AGENTS ROSTER (agents)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  process TEXT NOT NULL DEFAULT 'Inbound Support',
  email TEXT,
  tenure_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Training', 'Suspended')),
  quality_score NUMERIC(5,2) DEFAULT 85.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_code ON agents(code);

-- Seed Agents
INSERT INTO agents (id, tenant_id, name, code, process, tenure_minutes, status, quality_score)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Rahul Sharma', 'AGT-101', 'Collections & Billing', 1420, 'Active', 92.5),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Priya Patel', 'AGT-102', 'Customer Retention', 2180, 'Active', 96.0),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Amit Verma', 'AGT-103', 'Technical Support', 950, 'Active', 88.0),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Sneha Reddy', 'AGT-104', 'Sales & KYC', 3120, 'Active', 94.5),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Vikram Singh', 'AGT-105', 'Inbound Support', 640, 'Active', 82.0)
ON CONFLICT (code) DO NOTHING;

-- --------------------------------------------------------------------
-- 4. QA EVALUATION PARAMETERS (parameters)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Compliance',
  weight INTEGER NOT NULL DEFAULT 10,
  enabled BOOLEAN NOT NULL DEFAULT true,
  criteria TEXT,
  ai_suggested BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parameters_tenant ON parameters(tenant_id, enabled);

-- Seed 7 Default QA Parameters
INSERT INTO parameters (tenant_id, name, category, weight, criteria)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Standard Greeting & Identity Verification', 'Communication', 10, 'Agent greeted customer with company standard branding and verified caller identity.'),
  ('00000000-0000-0000-0000-000000000001', 'Mandatory Regulatory Disclosure', 'Compliance', 20, 'Agent recited statutory disclaimer and consent notices before taking financial details.'),
  ('00000000-0000-0000-0000-000000000001', 'Active Listening & Empathy', 'Soft Skills', 15, 'Agent listened without interrupting and acknowledged customer frustration empathetically.'),
  ('00000000-0000-0000-0000-000000000001', 'Resolution Accuracy & SOP Adherence', 'Technical', 25, 'Provided 100% accurate product/billing info matching current SOP playbook.'),
  ('00000000-0000-0000-0000-000000000001', 'Prohibited Language & Tone Guardrail', 'Compliance', 15, 'Zero profanity, defensive arguing, unverified commitments, or misleading claims.'),
  ('00000000-0000-0000-0000-000000000001', 'Hold Time & Dead-Air Management', 'Efficiency', 5, 'Hold duration was under 60 seconds with proper permission and check-ins every 30s.'),
  ('00000000-0000-0000-0000-000000000001', 'Professional Call Closing & Next Steps', 'Communication', 10, 'Summarized agreed actions and offered additional assistance before disconnect.')
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------
-- 5. CALL SCRIPTS & SOP VERSIONS (scripts)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  process TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scripts_tenant ON scripts(tenant_id, process);

-- --------------------------------------------------------------------
-- 6. TELEPHONY CALLS AUDIT LOG (calls)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id TEXT,
  caller_number TEXT,
  direction TEXT DEFAULT 'inbound',
  duration TEXT DEFAULT '00:00',
  duration_seconds INTEGER DEFAULT 0,
  recording_path TEXT,
  audio_url TEXT,
  transcript JSONB DEFAULT '[]'::jsonb,
  sentiment TEXT DEFAULT 'Neutral',
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'TRANSCRIBED', 'PROCESSED', 'FAILED', 'REVALUATED')),
  flags JSONB DEFAULT '{}'::jsonb,
  parameter_scores JSONB DEFAULT '[]'::jsonb,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_client_created ON calls(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_score ON calls(score);

-- --------------------------------------------------------------------
-- 7. DETAILED EVALUATIONS & PARAMETER SCORES (call_evaluations)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parameter_id UUID,
  parameter_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  weight INTEGER NOT NULL DEFAULT 10,
  defect BOOLEAN NOT NULL DEFAULT false,
  explanation TEXT,
  root_cause TEXT,
  ai_confidence NUMERIC(4,3) DEFAULT 1.000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_evaluations_call ON call_evaluations(call_id);
CREATE INDEX IF NOT EXISTS idx_call_evaluations_defect ON call_evaluations(defect);

-- --------------------------------------------------------------------
-- 8. COMPLIANCE & RISK FLAGS (call_flags)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED', 'ESCALATED')),
  description TEXT,
  detected_text TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_flags_call ON call_flags(call_id);
CREATE INDEX IF NOT EXISTS idx_call_flags_status ON call_flags(tenant_id, status);

-- --------------------------------------------------------------------
-- 9. SAAS PLANS, SUBSCRIPTIONS & DUAL PAYMENT GATEWAYS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_paise BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  interval TEXT NOT NULL DEFAULT 'MONTH' CHECK (interval IN ('MONTH', 'YEAR')),
  call_limit INTEGER NOT NULL DEFAULT 5000,
  overage_paise INTEGER DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plans (id, code, name, price_paise, currency, interval, call_limit, overage_paise, features, is_public, version, active)
VALUES
  (
    '00000000-0000-0000-0000-000000000101',
    'starter',
    'Starter Pilot',
    499900,
    'INR',
    'MONTH',
    2500,
    150,
    '["100% Automated QA Scoring", "Knowlarity Webhook Ingestion", "Standard SOP Rules Engine", "Daily Digest PDF Reports", "Cloudflare D1 & Supabase SQL", "Standard Email Support (24h SLA)"]'::jsonb,
    true,
    1,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'growth',
    'Growth Professional',
    999900,
    'INR',
    'MONTH',
    10000,
    120,
    '["Includes everything in Starter", "Multilingual Speech AI (Hindi/Tamil/Eng)", "Predictive Deal Conversion Scoring", "Automated RCA & Coaching Rewrites", "Zero-Tolerance Auto-Fail Flags", "Priority Queue & 4h SLA Escalations"]'::jsonb,
    true,
    1,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    'enterprise',
    'Enterprise Ultra',
    2499900,
    'INR',
    'MONTH',
    50000,
    90,
    '["Includes everything in Growth", "Unlimited Custom SOP Rulesets", "Dedicated LLM Pipeline & Custom Audio Vault", "Two-Party Consent Auditing", "Custom CRM & Webhook Bidirectional Sync", "Dedicated Account Executive & ISO Lead Auditor", "99.99% Cloudflare Edge SLA Uptime"]'::jsonb,
    true,
    1,
    true
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_paise = EXCLUDED.price_paise,
  call_limit = EXCLUDED.call_limit,
  features = EXCLUDED.features;

-- Active Tenant Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'REFUNDED')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  grace_until TIMESTAMPTZ,
  gateway TEXT DEFAULT 'payu' CHECK (gateway IN ('payu', 'razorpay')),
  gateway_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end, gateway)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000102',
  'ACTIVE',
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '25 days',
  'payu'
) ON CONFLICT (id) DO NOTHING;

-- Payment Orders & Verification
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  subscription_id UUID,
  txnid TEXT NOT NULL UNIQUE,
  amount_paise BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  gateway TEXT NOT NULL DEFAULT 'payu' CHECK (gateway IN ('payu', 'razorpay')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED')),
  udf JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES payment_orders(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL DEFAULT 'payu' CHECK (gateway IN ('payu', 'razorpay')),
  gateway_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
  amount_paise BIGINT NOT NULL,
  mode TEXT,
  bank_ref_num TEXT,
  error_message TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  raw_verify JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gateway Credentials (PayU & Razorpay configured by Admin)
CREATE TABLE IF NOT EXISTS gateway_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL UNIQUE CHECK (gateway IN ('payu', 'razorpay')),
  key_id TEXT NOT NULL,
  key_secret TEXT NOT NULL,
  is_test_mode BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  webhook_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO gateway_configs (gateway, key_id, key_secret, is_test_mode, is_active, webhook_secret)
VALUES
  ('payu', '4oEfiS', 'OquTGAxW4hVnBxTb8lBVjMQeHU37qMcc', true, true, 'payu_webhook_secret_2026'),
  ('razorpay', 'sample_razorpay_key_id', 'sample_razorpay_key_secret', true, true, 'razorpay_webhook_secret_2026')
ON CONFLICT (gateway) DO UPDATE SET
  key_id = EXCLUDED.key_id,
  key_secret = EXCLUDED.key_secret,
  is_test_mode = EXCLUDED.is_test_mode,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------------------
-- 10. AUTOMATED EMAIL CONFIGURATIONS & LOGS (Resend & Brevo)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('resend', 'brevo')),
  api_key TEXT NOT NULL,
  from_email TEXT NOT NULL DEFAULT 'billing@acmetelephony.in',
  from_name TEXT NOT NULL DEFAULT 'AuditAI Qalyzer Billing',
  reply_to TEXT DEFAULT 'support@auditai.in',
  is_active BOOLEAN NOT NULL DEFAULT false,
  templates JSONB NOT NULL DEFAULT '{
    "welcome": {"enabled": true, "subject": "Welcome to AuditAI Qalyzer"},
    "payment_receipt": {"enabled": true, "subject": "Payment Receipt & Tax Invoice - AuditAI"},
    "payment_reminder": {"enabled": true, "subject": "Subscription Renewal Notice - AuditAI"},
    "team_invite": {"enabled": true, "subject": "Team Member Workspace Invitation - AuditAI"}
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO email_configs (provider, api_key, from_email, from_name, is_active)
VALUES
  ('resend', 're_sample_resend_api_key', 'billing@acmetelephony.in', 'AuditAI Qalyzer Billing', true),
  ('brevo', 'xkeysib-sample_brevo_api_key', 'billing@acmetelephony.in', 'AuditAI Qalyzer Billing', false)
ON CONFLICT (provider) DO NOTHING;

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED', 'QUEUED')),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 11. LEADERSHIP TEAM BEHIND PROFILES (team_members)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  github_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO team_members (id, name, role, bio, avatar_url, linkedin_url, display_order, active)
VALUES
  (
    '00000000-0000-0000-0000-000000000301',
    'Dr. Aris Thorne',
    'Chief Executive Officer & Co-Founder',
    'Former VP of Conversational AI at Global Telco. 15+ years scaling enterprise speech recognition and natural language architectures.',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    'https://linkedin.com',
    1,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000302',
    'Marcus Vance',
    'Chief Technology Officer',
    'Speech ML pioneer with deep expertise in Hindi/Indic acoustic models, low-latency DSP, and distributed Cloudflare D1/R2 pipelines.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://linkedin.com',
    2,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000303',
    'Elena Rostova',
    'Head of Product & QA Governance',
    'Certified ISO 9001/27001 Lead Auditor. Specialized in translating corporate operational playbooks into mathematical AI scoring logic.',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    'https://linkedin.com',
    3,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000304',
    'David Sterling',
    'Head of Enterprise Solutions & Customer Success',
    'Architected 500+ seat contact center transformations across North America, EMEA, and APAC fintech & telecom ecosystems.',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    'https://linkedin.com',
    4,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url;

-- --------------------------------------------------------------------
-- 12. INBOUND CONSULTATION ENQUIRIES (enquiries)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  team_size TEXT,
  selected_plan TEXT,
  message TEXT,
  preferred_schedule TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at DESC);

-- --------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY (RLS) & ACCESS PERMISSIONS
-- --------------------------------------------------------------------
-- Enable RLS on core tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

-- Allow public read access to public resources (plans, team, etc.)
CREATE POLICY "Public plans are viewable by anyone" ON plans FOR SELECT USING (is_public = true);
CREATE POLICY "Public team members are viewable by anyone" ON team_members FOR SELECT USING (active = true);
CREATE POLICY "Anyone can submit an enquiry" ON enquiries FOR INSERT WITH CHECK (true);

-- Allow service_role full access to all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
