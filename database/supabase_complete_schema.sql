-- ====================================================================
-- AUDITAI QALYZER v2.0 — COMPLETE UNIFIED SUPABASE POSTGRESQL SCHEMA
-- Single-File Master Setup Script for the Entire Project
--
-- Instructions:
--   1. Open Supabase SQL Editor
--   2. Paste this entire file and click RUN
--   3. Safe to re-run (idempotent: uses IF NOT EXISTS / ON CONFLICT)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 1. MULTI-TENANT ORGANIZATIONS (tenants & clients)
-- ====================================================================
CREATE TABLE IF NOT EXISTS clients (
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

-- Tenants table (for multi-tenant billing / SaaS modules)
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

INSERT INTO clients (id, name, legal_name, billing_email, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme BPO & Telephony Enterprise',
  'Acme Telephony Solutions India Pvt Ltd',
  'billing@acmetelephony.in',
  'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO tenants (id, name, legal_name, billing_email, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme BPO & Telephony Enterprise',
  'Acme Telephony Solutions India Pvt Ltd',
  'billing@acmetelephony.in',
  'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 2. AUTHENTICATION, SESSIONS, ACCESS CONTROL & ACTIVITY TRACKING
-- ====================================================================
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
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_tenant ON auth_users(tenant_id);

-- Seed Default Master Admin & Enterprise Client (Admin@12345 / Client@12345)
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

INSERT INTO admin_login_controls (id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;

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

CREATE TABLE IF NOT EXISTS tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('OWNER', 'ADMIN', 'MANAGER', 'ANALYST', 'VIEWER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INVITED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS tenant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ANALYST',
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id UUID PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'SUPERADMIN',
  mfa_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 3. CORE QA ENTITIES (Agents, Parameters, Scripts, SOP Versions)
-- ====================================================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
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

INSERT INTO agents (id, client_id, name, code, process, tenure_minutes, status, quality_score)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Rahul Sharma', 'AGT-101', 'Collections & Billing', 1420, 'Active', 92.5),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Priya Patel', 'AGT-102', 'Customer Retention', 2180, 'Active', 96.0),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Amit Verma', 'AGT-103', 'Technical Support', 950, 'Active', 88.0),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Sneha Reddy', 'AGT-104', 'Sales & KYC', 3120, 'Active', 94.5),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Vikram Singh', 'AGT-105', 'Inbound Support', 640, 'Active', 82.0)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Compliance',
  weight INTEGER NOT NULL DEFAULT 10,
  enabled BOOLEAN NOT NULL DEFAULT true,
  criteria TEXT,
  ai_suggested BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO parameters (client_id, name, category, weight, criteria)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Standard Greeting & Identity Verification', 'Communication', 10, 'Agent greeted customer with company branding and verified caller identity.'),
  ('00000000-0000-0000-0000-000000000001', 'Mandatory Regulatory Disclosure', 'Compliance', 20, 'Agent recited statutory disclaimer and consent notices before taking financial details.'),
  ('00000000-0000-0000-0000-000000000001', 'Active Listening & Empathy', 'Soft Skills', 15, 'Agent listened without interrupting and acknowledged customer concerns empathetically.'),
  ('00000000-0000-0000-0000-000000000001', 'Resolution Accuracy & SOP Adherence', 'Technical', 25, 'Provided 100% accurate product/billing information matching current SOP playbook.'),
  ('00000000-0000-0000-0000-000000000001', 'Prohibited Language & Tone Guardrail', 'Compliance', 15, 'Zero profanity, defensive arguing, or misleading commitments.'),
  ('00000000-0000-0000-0000-000000000001', 'Hold Time & Dead-Air Management', 'Efficiency', 5, 'Hold duration under 60 seconds with proper permission and check-ins.'),
  ('00000000-0000-0000-0000-000000000001', 'Professional Call Closing & Next Steps', 'Communication', 10, 'Summarized agreed actions and offered additional assistance before disconnect.')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  process TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sop_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  process TEXT NOT NULL DEFAULT 'General',
  language TEXT NOT NULL DEFAULT 'English',
  version_number INTEGER NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, process, version_number)
);

CREATE TABLE IF NOT EXISTS tenant_config (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  setup_state TEXT NOT NULL DEFAULT 'CONFIGURED' CHECK (setup_state IN ('NOT_CONFIGURED', 'SETUP_IN_PROGRESS', 'CONFIGURED', 'REQUIRES_REVIEW')),
  config_version INTEGER NOT NULL DEFAULT 1,
  active_sop_version_id UUID REFERENCES sop_versions(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_by TEXT,
  flag_engine_enabled BOOLEAN NOT NULL DEFAULT true,
  critical_notify BOOLEAN NOT NULL DEFAULT true,
  high_notify BOOLEAN NOT NULL DEFAULT true,
  medium_notify BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tenant_config (client_id, setup_state, config_version)
VALUES ('00000000-0000-0000-0000-000000000001', 'CONFIGURED', 1)
ON CONFLICT (client_id) DO NOTHING;

-- ====================================================================
-- 4. CALLS, EVALUATIONS, FLAGS, NOTIFICATIONS & REPORTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id TEXT,
  caller_number TEXT,
  direction TEXT DEFAULT 'inbound',
  duration TEXT DEFAULT '00:00',
  duration_seconds INTEGER DEFAULT 0,
  recording_path TEXT,
  r2_audio_key TEXT,
  audio_url TEXT,
  transcript JSONB DEFAULT '[]'::jsonb,
  sentiment TEXT DEFAULT 'Neutral',
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'TRANSCRIBED', 'PROCESSED', 'FAILED', 'REVALUATED')),
  flags JSONB DEFAULT '{}'::jsonb,
  parameter_scores JSONB DEFAULT '[]'::jsonb,
  processing_metadata JSONB DEFAULT '{}'::jsonb,
  sop_version_id UUID,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_client_created ON calls(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

CREATE TABLE IF NOT EXISTS call_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL DEFAULT 1,
  sop_version_id UUID,
  overall_score INTEGER CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
  parameter_scores JSONB DEFAULT '[]'::jsonb,
  ai_provider TEXT,
  ai_model TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  triggered_by TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS call_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  agent_id TEXT,
  flag_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'OTHER',
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('DETECTED', 'OPEN', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED', 'ESCALATED', 'RESOLVED')),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.900,
  confidence_level TEXT NOT NULL DEFAULT 'HIGH' CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW')),
  title TEXT NOT NULL,
  description TEXT,
  customer_statement TEXT,
  agent_statement TEXT,
  expected_information TEXT,
  actual_information TEXT,
  evidence TEXT,
  evidence_start_time NUMERIC,
  evidence_end_time NUMERIC,
  transcript_segment_id TEXT,
  sop_version_id UUID,
  source TEXT DEFAULT 'AI_VERIFIED',
  ai_reasoning TEXT,
  recommended_action TEXT,
  requires_manager_attention BOOLEAN NOT NULL DEFAULT false,
  dedup_key TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_flags_call ON call_flags(call_id);
CREATE INDEX IF NOT EXISTS idx_call_flags_status ON call_flags(tenant_id, status);

CREATE TABLE IF NOT EXISTS flag_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES call_flags(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  call_id UUID,
  flag_id UUID,
  type TEXT NOT NULL DEFAULT 'CRITICAL_FLAG',
  severity TEXT NOT NULL DEFAULT 'HIGH',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'knowlarity',
  event_key TEXT NOT NULL,
  call_id UUID,
  client_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_key)
);

CREATE TABLE IF NOT EXISTS call_processing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED', 'SKIPPED')),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, business_date)
);

-- ====================================================================
-- 5. TENANT INTEGRATIONS, RETENTION & CLOUDFLARE R2 STORAGE LEDGER
-- ====================================================================
CREATE TABLE IF NOT EXISTS tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider)
);

CREATE TABLE IF NOT EXISTS tenant_retention_policies (
  tenant_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  audio_retention_days INTEGER NOT NULL DEFAULT 90,
  transcript_retention_days INTEGER NOT NULL DEFAULT 365,
  auto_purge_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retention_deletion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  call_id UUID,
  r2_key TEXT,
  deleted_reason TEXT,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS r2_storage_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  bucket_name TEXT NOT NULL DEFAULT 'auditai-recordings-storage',
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL DEFAULT 'audio/mpeg',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  etag TEXT,
  public_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 6. SAAS PLANS, SUBSCRIPTIONS & DUAL PAYMENT GATEWAYS (PayU & Razorpay)
-- ====================================================================
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
  ('00000000-0000-0000-0000-000000000101', 'starter', 'Starter Pilot', 499900, 'INR', 'MONTH', 2500, 150, '["100% Automated QA Scoring", "Knowlarity Webhook Ingestion", "Standard SOP Rules Engine", "Daily Digest PDF Reports", "Cloudflare D1 & Supabase SQL", "Standard Email Support (24h SLA)"]'::jsonb, true, 1, true),
  ('00000000-0000-0000-0000-000000000102', 'growth', 'Growth Professional', 999900, 'INR', 'MONTH', 10000, 120, '["Includes everything in Starter", "Multilingual Speech AI (Hindi/Tamil/Eng)", "Predictive Deal Conversion Scoring", "Automated RCA & Coaching Rewrites", "Zero-Tolerance Auto-Fail Flags", "Priority Queue & 4h SLA Escalations"]'::jsonb, true, 1, true),
  ('00000000-0000-0000-0000-000000000103', 'enterprise', 'Enterprise Ultra', 2499900, 'INR', 'MONTH', 50000, 90, '["Includes everything in Growth", "Unlimited Custom SOP Rulesets", "Dedicated LLM Pipeline & Custom Audio Vault", "Two-Party Consent Auditing", "Custom CRM & Webhook Bidirectional Sync", "Dedicated Account Executive & ISO Lead Auditor", "99.99% Cloudflare Edge SLA Uptime"]'::jsonb, true, 1, true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, price_paise = EXCLUDED.price_paise, call_limit = EXCLUDED.call_limit, features = EXCLUDED.features;

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
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

INSERT INTO subscriptions (id, tenant_id, plan_id, status, gateway)
VALUES ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 'ACTIVE', 'payu')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  actor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
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
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL,
  gateway_refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  initiated_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  number TEXT NOT NULL UNIQUE,
  subtotal_paise BIGINT NOT NULL,
  gst_paise BIGINT NOT NULL,
  total_paise BIGINT NOT NULL,
  pdf_key TEXT,
  status TEXT NOT NULL DEFAULT 'PAID',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_counters (
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
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
ON CONFLICT (gateway) DO NOTHING;

-- ====================================================================
-- 7. AUTOMATED EMAIL ENGINE (Resend & Brevo, Branding, Schedules, Logs)
-- ====================================================================
CREATE TABLE IF NOT EXISTS email_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('resend', 'brevo')),
  api_key TEXT NOT NULL,
  from_local TEXT NOT NULL DEFAULT 'notifications',
  selected_domain TEXT NOT NULL DEFAULT 'auditai.in',
  available_domains JSONB NOT NULL DEFAULT '["auditai.in", "acmetelephony.in", "mail.auditai.io"]'::jsonb,
  from_email TEXT NOT NULL DEFAULT 'notifications@auditai.in',
  from_name TEXT NOT NULL DEFAULT 'AuditAI Qalyzer Platform',
  reply_to TEXT DEFAULT 'support@auditai.in',
  admin_email TEXT DEFAULT 'admin@auditai.io',
  logo_url TEXT,
  logo_placement TEXT DEFAULT 'top-left',
  signature_html TEXT,
  signature_placement TEXT DEFAULT 'bottom-left',
  daily_report_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_report_hour_utc INTEGER NOT NULL DEFAULT 12,
  is_active BOOLEAN NOT NULL DEFAULT false,
  templates JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO email_configs (provider, api_key, from_email, from_name, is_active)
VALUES
  ('resend', 're_sample_resend_api_key', 'notifications@auditai.in', 'AuditAI Qalyzer Platform', true),
  ('brevo', 'xkeysib-sample_brevo_api_key', 'notifications@auditai.in', 'AuditAI Qalyzer Platform', false)
ON CONFLICT (provider) DO NOTHING;

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  recipient TEXT NOT NULL,
  cc TEXT,
  bcc TEXT,
  from_email TEXT,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED', 'QUEUED')),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'SENT', 'FAILED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 8. PUBLIC HOME CMS, LEADERSHIP TEAM & INBOUND ENQUIRIES
-- ====================================================================
CREATE TABLE IF NOT EXISTS home_cms (
  id TEXT PRIMARY KEY DEFAULT 'default_home_cms',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  ('00000000-0000-0000-0000-000000000301', 'Dr. Aris Thorne', 'Chief Executive Officer & Co-Founder', 'Former VP of Conversational AI at Global Telco. 15+ years scaling enterprise speech recognition and natural language architectures.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', 'https://linkedin.com', 1, true),
  ('00000000-0000-0000-0000-000000000302', 'Marcus Vance', 'Chief Technology Officer', 'Speech ML pioneer with deep expertise in Hindi/Indic acoustic models, low-latency DSP, and distributed Cloudflare D1/R2 pipelines.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 'https://linkedin.com', 2, true),
  ('00000000-0000-0000-0000-000000000303', 'Elena Rostova', 'Head of Product & QA Governance', 'Certified ISO 9001/27001 Lead Auditor. Specialized in translating corporate operational playbooks into mathematical AI scoring logic.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', 'https://linkedin.com', 3, true),
  ('00000000-0000-0000-0000-000000000304', 'David Sterling', 'Head of Enterprise Solutions & Customer Success', 'Architected 500+ seat contact center transformations across North America, EMEA, and APAC fintech & telecom ecosystems.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 'https://linkedin.com', 4, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, bio = EXCLUDED.bio, avatar_url = EXCLUDED.avatar_url;

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

-- ====================================================================
-- 9. AUDIT LOGS (Append-Only Compliance Trail)
-- ====================================================================
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
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target TEXT,
  before JSONB,
  after JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 10. SUPABASE STORAGE BUCKET (Audio Recordings Fallback Vault)
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 11. ROW LEVEL SECURITY (RLS) & ROLE GRANTS
-- ====================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
