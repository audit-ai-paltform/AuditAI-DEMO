-- ====================================================================
-- Migration 013: SaaS Multi-Tenant, Dual Payment Gateways, Automated Email,
-- Team Behind, and Auth Activity Sync
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: tenants (with alias view for legacy clients)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  gstin TEXT,
  billing_email TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default tenant if not exists
INSERT INTO tenants (id, name, legal_name, billing_email, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme BPO & Telephony Enterprise',
  'Acme Telephony Solutions India Pvt Ltd',
  'billing@acmetelephony.in',
  'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

-- Backward compatibility view if clients table doesn't already exist as a table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') THEN
    CREATE VIEW clients AS SELECT id, name, status, created_at FROM tenants;
  END IF;
END $$;

-- 2. Tenant invitations
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ANALYST' CHECK (role IN ('OWNER', 'ADMIN', 'MANAGER', 'ANALYST', 'VIEWER')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Platform Admins
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id UUID PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'SUPERADMIN' CHECK (role IN ('SUPPORT', 'BILLING', 'SUPERADMIN')),
  mfa_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Subscription Plans
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

-- Seed production-grade plans
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

-- 5. Subscriptions
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

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);

-- Seed active subscription for default tenant
INSERT INTO subscriptions (
  id, tenant_id, plan_id, status, current_period_start, current_period_end, gateway
) VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000102',
  'ACTIVE',
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '25 days',
  'payu'
) ON CONFLICT (id) DO NOTHING;

-- 6. Subscription Events Ledger
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  actor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Payment Orders
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

-- 8. Payments
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

-- 9. Payment Events (Idempotency Ledger)
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('payu', 'razorpay')),
  event_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  hash_valid BOOLEAN NOT NULL DEFAULT true,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_provider_event UNIQUE (provider, event_key)
);

-- 10. Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL,
  gateway_refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  initiated_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  number TEXT NOT NULL UNIQUE,
  subtotal_paise BIGINT NOT NULL,
  gst_paise BIGINT NOT NULL,
  total_paise BIGINT NOT NULL,
  pdf_key TEXT,
  status TEXT NOT NULL DEFAULT 'PAID',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Usage Counters
CREATE TABLE IF NOT EXISTS usage_counters (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  calls_received INTEGER NOT NULL DEFAULT 0,
  calls_processed INTEGER NOT NULL DEFAULT 0,
  calls_rejected INTEGER NOT NULL DEFAULT 0,
  audio_seconds BIGINT NOT NULL DEFAULT 0,
  llm_tokens BIGINT NOT NULL DEFAULT 0,
  cost_paise BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, period_start)
);

-- 13. Audit Logs (Append-Only)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  tenant_id UUID,
  action TEXT NOT NULL,
  target TEXT,
  before JSONB,
  after JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target TEXT,
  before JSONB,
  after JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Team Behind Information (User Requirement: Editable in Admin Panel)
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

-- Seed initial team members
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

-- 15. Dual Payment Gateway Configurations (User Requirement: PayU and Razorpay managed by Admin)
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
  ('razorpay', 'rzp_test_sample_id', 'rzp_test_sample_secret', true, true, 'razorpay_webhook_secret_2026')
ON CONFLICT (gateway) DO UPDATE SET
  key_id = EXCLUDED.key_id,
  key_secret = EXCLUDED.key_secret,
  is_test_mode = EXCLUDED.is_test_mode,
  is_active = EXCLUDED.is_active;

-- 16. Automated Email Configurations (User Requirement: Resend and Brevo)
CREATE TABLE IF NOT EXISTS email_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('resend', 'brevo')),
  api_key TEXT NOT NULL,
  from_email TEXT NOT NULL DEFAULT 'notifications@auditai.in',
  from_name TEXT NOT NULL DEFAULT 'AuditAI Qalyzer',
  reply_to TEXT DEFAULT 'support@auditai.in',
  is_active BOOLEAN NOT NULL DEFAULT false,
  templates JSONB NOT NULL DEFAULT '{
    "welcome": {"enabled": true, "subject": "Welcome to AuditAI Qalyzer Platform"},
    "payment_receipt": {"enabled": true, "subject": "Payment Receipt & Tax Invoice - AuditAI"},
    "payment_reminder": {"enabled": true, "subject": "Action Required: Upcoming Subscription Renewal - AuditAI"},
    "team_invite": {"enabled": true, "subject": "You have been invited to join your team on AuditAI"}
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO email_configs (provider, api_key, from_email, from_name, is_active)
VALUES
  ('resend', 're_sample_resend_api_key', 'notifications@auditai.in', 'AuditAI Qalyzer', true),
  ('brevo', 'xkeysib-sample_brevo_api_key', 'notifications@auditai.in', 'AuditAI Qalyzer', false)
ON CONFLICT (provider) DO UPDATE SET
  from_email = EXCLUDED.from_email,
  from_name = EXCLUDED.from_name;

-- 17. Email Notification Logs
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

-- 18. User Login & Active Session Tracking (User Requirement: last login, total active time)
CREATE TABLE IF NOT EXISTS user_login_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID,
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
