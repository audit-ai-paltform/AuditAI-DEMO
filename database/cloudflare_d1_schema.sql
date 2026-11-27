-- ====================================================================
-- AUDITAI QALYZER v2.0 - CLOUDFLARE D1 (SQLITE) EDGE DATABASE SCHEMA
-- Target Engine: Cloudflare D1 (Serverless Distributed SQLite at the Edge)
-- Instruction: Apply via Wrangler CLI:
--   npx wrangler d1 execute auditai-d1-prod --remote --file=database/cloudflare_d1_schema.sql
-- ====================================================================

-- 1. Tenants & Organizations
CREATE TABLE IF NOT EXISTS tenants (
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

INSERT OR IGNORE INTO tenants (id, name, legal_name, billing_email, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme BPO & Telephony Enterprise',
  'Acme Telephony Solutions India Pvt Ltd',
  'billing@acmetelephony.in',
  'ACTIVE'
);

-- 2. Telephony Calls (Edge Relational Index)
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  agent_id TEXT,
  agent_name TEXT,
  caller_number TEXT,
  direction TEXT DEFAULT 'inbound',
  duration TEXT DEFAULT '00:00',
  duration_seconds INTEGER DEFAULT 0,
  recording_path TEXT,
  audio_url TEXT,
  r2_key TEXT,
  transcript TEXT DEFAULT '[]', -- JSON string of speaker turns
  sentiment TEXT DEFAULT 'Neutral',
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  flags TEXT DEFAULT '{}',      -- JSON string of detected flags
  parameter_scores TEXT DEFAULT '[]', -- JSON string of scored parameters
  correlation_id TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_calls_client_created ON calls(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_d1_calls_agent ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_d1_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_d1_calls_score ON calls(score);

-- 3. Detailed QA Evaluations & Scoring Breakdown
CREATE TABLE IF NOT EXISTS call_evaluations (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  parameter_id TEXT,
  parameter_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  weight INTEGER NOT NULL DEFAULT 10,
  defect INTEGER NOT NULL DEFAULT 0, -- 0 = Pass, 1 = Defect
  explanation TEXT,
  root_cause TEXT,
  ai_confidence REAL DEFAULT 1.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_evaluations_call ON call_evaluations(call_id);
CREATE INDEX IF NOT EXISTS idx_d1_evaluations_defect ON call_evaluations(defect);

-- 4. Compliance & Risk Flags
CREATE TABLE IF NOT EXISTS call_flags (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'OPEN',
  description TEXT,
  detected_text TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  resolution_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_flags_call ON call_flags(call_id);
CREATE INDEX IF NOT EXISTS idx_d1_flags_status ON call_flags(tenant_id, status);

-- 5. Agents Roster
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  process TEXT NOT NULL DEFAULT 'Inbound Support',
  email TEXT,
  tenure_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  quality_score REAL DEFAULT 85.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_d1_agents_code ON agents(code);

-- 6. QA Parameters & Scoring Rules
CREATE TABLE IF NOT EXISTS parameters (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Compliance',
  weight INTEGER NOT NULL DEFAULT 10,
  enabled INTEGER NOT NULL DEFAULT 1,
  criteria TEXT,
  ai_suggested INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_parameters_tenant ON parameters(tenant_id, enabled);

-- 7. Call Scripts & Guidelines
CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  process TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  sections TEXT NOT NULL DEFAULT '[]', -- JSON string
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 8. SaaS Subscription Plans
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
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO plans (id, code, name, price_paise, currency, interval, call_limit, overage_paise, features, is_public, active)
VALUES
  ('plan_starter', 'starter', 'Starter Pilot', 499900, 'INR', 'MONTH', 2500, 150, '["100% Automated QA Scoring", "Knowlarity Webhook Ingestion", "Standard SOP Rules Engine", "Daily Digest PDF Reports", "Cloudflare D1 & Supabase SQL", "Standard Email Support (24h SLA)"]', 1, 1),
  ('plan_growth', 'growth', 'Growth Professional', 999900, 'INR', 'MONTH', 10000, 120, '["Includes everything in Starter", "Multilingual Speech AI (Hindi/Tamil/Eng)", "Predictive Deal Conversion Scoring", "Automated RCA & Coaching Rewrites", "Zero-Tolerance Auto-Fail Flags", "Priority Queue & 4h SLA Escalations"]', 1, 1),
  ('plan_enterprise', 'enterprise', 'Enterprise Ultra', 2499900, 'INR', 'MONTH', 50000, 90, '["Includes everything in Growth", "Unlimited Custom SOP Rulesets", "Dedicated LLM Pipeline & Custom Audio Vault", "Two-Party Consent Auditing", "Custom CRM & Webhook Bidirectional Sync", "Dedicated Account Executive & ISO Lead Auditor", "99.99% Cloudflare Edge SLA Uptime"]', 1, 1);

-- 9. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  current_period_start TEXT NOT NULL DEFAULT (datetime('now')),
  current_period_end TEXT NOT NULL DEFAULT (datetime('now', '+30 days')),
  gateway TEXT DEFAULT 'payu',
  gateway_subscription_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- 10. Payment Transactions Ledger (PayU & Razorpay)
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
  mode TEXT,
  verified_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_payments_txnid ON payments(txnid);

-- 11. Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO team_members (id, name, role, bio, avatar_url, linkedin_url, display_order, active)
VALUES
  ('tm_001', 'Dr. Aris Thorne', 'Chief Executive Officer & Co-Founder', 'Former VP of Conversational AI at Global Telco. 15+ years scaling enterprise speech recognition and natural language architectures.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', 'https://linkedin.com', 1, 1),
  ('tm_002', 'Marcus Vance', 'Chief Technology Officer', 'Speech ML pioneer with deep expertise in Hindi/Indic acoustic models, low-latency DSP, and distributed Cloudflare D1/R2 pipelines.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 'https://linkedin.com', 2, 1),
  ('tm_003', 'Elena Rostova', 'Head of Product & QA Governance', 'Certified ISO 9001/27001 Lead Auditor. Specialized in translating corporate operational playbooks into mathematical AI scoring logic.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', 'https://linkedin.com', 3, 1),
  ('tm_004', 'David Sterling', 'Head of Enterprise Solutions & Customer Success', 'Architected 500+ seat contact center transformations across North America, EMEA, and APAC fintech & telecom ecosystems.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 'https://linkedin.com', 4, 1);

-- 12. Inbound Consultation Enquiries
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

CREATE INDEX IF NOT EXISTS idx_d1_enquiries_status ON enquiries(status);
