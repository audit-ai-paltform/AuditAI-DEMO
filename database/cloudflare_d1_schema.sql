-- ====================================================================
-- AUDITAI QALYZER v2.0 — COMPLETE CLOUDFLARE D1 (SQLITE) EDGE SCHEMA
-- Single-File Master Setup Script for Cloudflare D1 + R2 Vault Metadata
--
-- Instructions:
--   npx wrangler d1 execute auditai-d1-prod --remote --file=database/cloudflare_d1_schema.sql
-- ====================================================================

-- 1. Tenants / Clients
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  gstin TEXT,
  billing_email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO clients (id, name, legal_name, billing_email, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme BPO & Telephony Enterprise',
  'Acme Telephony Solutions India Pvt Ltd',
  'billing@acmetelephony.in',
  'ACTIVE'
);

-- 2. Calls & Audio Recordings Index (links directly to Cloudflare R2 keys)
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  agent_id TEXT,
  agent_name TEXT,
  direction TEXT DEFAULT 'inbound',
  duration TEXT DEFAULT '00:00',
  duration_seconds INTEGER DEFAULT 0,
  caller_number TEXT,
  audio_url TEXT,
  r2_audio_key TEXT,
  recording_path TEXT,
  transcript TEXT DEFAULT '[]', -- JSON array of dialogue turns
  sentiment TEXT DEFAULT 'Neutral',
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  flags TEXT DEFAULT '{}',      -- JSON object
  parameter_scores TEXT DEFAULT '[]', -- JSON array
  processing_metadata TEXT DEFAULT '{}',
  sop_version_id TEXT,
  correlation_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_calls_client_created ON calls(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_d1_calls_agent ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_d1_calls_status ON calls(status);

-- 3. Cloudflare R2 Audio & File Storage Metadata Ledger
CREATE TABLE IF NOT EXISTS r2_storage_objects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  call_id TEXT,
  bucket_name TEXT NOT NULL DEFAULT 'auditai-recordings-storage',
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL DEFAULT 'audio/mpeg',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  etag TEXT,
  public_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_d1_r2_call ON r2_storage_objects(call_id);
CREATE INDEX IF NOT EXISTS idx_d1_r2_tenant ON r2_storage_objects(tenant_id);

-- 4. Call Evaluations & Parameter Scores
CREATE TABLE IF NOT EXISTS call_evaluations (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  parameter_id TEXT,
  parameter_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  weight INTEGER NOT NULL DEFAULT 10,
  defect INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  root_cause TEXT,
  ai_confidence REAL DEFAULT 1.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS call_evaluation_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  call_id TEXT NOT NULL,
  run_number INTEGER NOT NULL DEFAULT 1,
  sop_version_id TEXT,
  overall_score INTEGER,
  parameter_scores TEXT DEFAULT '[]',
  ai_provider TEXT,
  ai_model TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  triggered_by TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

-- 5. Compliance & Risk Flags + Notifications
CREATE TABLE IF NOT EXISTS call_flags (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  call_id TEXT NOT NULL,
  agent_id TEXT,
  flag_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'OTHER',
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'OPEN',
  confidence REAL NOT NULL DEFAULT 0.9,
  confidence_level TEXT NOT NULL DEFAULT 'HIGH',
  title TEXT NOT NULL,
  description TEXT,
  customer_statement TEXT,
  agent_statement TEXT,
  expected_information TEXT,
  actual_information TEXT,
  evidence TEXT,
  recommended_action TEXT,
  requires_manager_attention INTEGER NOT NULL DEFAULT 0,
  dedup_key TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  resolution_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_flags_call ON call_flags(call_id);
CREATE INDEX IF NOT EXISTS idx_d1_flags_status ON call_flags(tenant_id, status);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  call_id TEXT,
  flag_id TEXT,
  type TEXT NOT NULL DEFAULT 'CRITICAL_FLAG',
  severity TEXT NOT NULL DEFAULT 'HIGH',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Agents, Parameters, Scripts & SOP Versions
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  process TEXT NOT NULL DEFAULT 'Inbound Support',
  email TEXT,
  tenure_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  quality_score REAL DEFAULT 85.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS parameters (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Compliance',
  weight INTEGER NOT NULL DEFAULT 10,
  enabled INTEGER NOT NULL DEFAULT 1,
  criteria TEXT,
  ai_suggested INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  process TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  sections TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sop_versions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  process TEXT NOT NULL DEFAULT 'General',
  language TEXT NOT NULL DEFAULT 'English',
  version_number INTEGER NOT NULL,
  sections TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Daily Reports & Processing Events
CREATE TABLE IF NOT EXISTS daily_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  business_date TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  summary TEXT NOT NULL DEFAULT '{}',
  pdf_r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS call_processing_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  call_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  detail TEXT NOT NULL DEFAULT '{}',
  correlation_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Plans, Subscriptions & Payments (PayU & Razorpay)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  interval TEXT NOT NULL DEFAULT 'MONTH',
  call_limit INTEGER NOT NULL DEFAULT 5000,
  overage_paise INTEGER DEFAULT 0,
  features TEXT NOT NULL DEFAULT '[]',
  is_public INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO plans (id, code, name, price_paise, currency, interval, call_limit, overage_paise, features, is_public, active)
VALUES
  ('plan_starter', 'starter', 'Starter Pilot', 499900, 'INR', 'MONTH', 2500, 150, '["100% Automated QA Scoring", "Knowlarity Webhook Ingestion", "Standard SOP Rules Engine", "Daily Digest PDF Reports"]', 1, 1),
  ('plan_growth', 'growth', 'Growth Professional', 999900, 'INR', 'MONTH', 10000, 120, '["Includes everything in Starter", "Multilingual Speech AI", "Predictive Deal Conversion Scoring", "Zero-Tolerance Auto-Fail Flags"]', 1, 1),
  ('plan_enterprise', 'enterprise', 'Enterprise Ultra', 2499900, 'INR', 'MONTH', 50000, 90, '["Includes everything in Growth", "Unlimited Custom SOP Rulesets", "Dedicated Audio Vault", "99.99% Cloudflare Edge SLA"]', 1, 1);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  current_period_start TEXT NOT NULL DEFAULT (datetime('now')),
  current_period_end TEXT NOT NULL DEFAULT (datetime('now', '+30 days')),
  gateway TEXT DEFAULT 'payu',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  txnid TEXT NOT NULL UNIQUE,
  gateway TEXT NOT NULL DEFAULT 'payu',
  gateway_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  bank_ref_num TEXT,
  verified_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. Email Automation Logs, Team Members, CMS & Enquiries
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  recipient TEXT NOT NULL,
  cc TEXT,
  bcc TEXT,
  from_email TEXT,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SENT',
  provider_message_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS home_cms (
  id TEXT PRIMARY KEY DEFAULT 'default_home_cms',
  content TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  team_size TEXT,
  selected_plan TEXT,
  message TEXT,
  preferred_schedule TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
