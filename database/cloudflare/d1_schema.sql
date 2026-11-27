-- ====================================================================
-- Cloudflare D1 Relational Database Schema for AuditAI
-- Architecture: Distributed Edge Relational Database (Cloudflare D1 SQLite)
-- Purpose: All operational application datasets, evaluations, calls,
--          scripts, flags, reports, subscriptions & PayU transactions.
-- Auth & Users are stored exclusively in the dedicated Authentication DB.
-- ====================================================================

-- 1. Calls Table
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT,
  agent_name TEXT,
  direction TEXT DEFAULT 'inbound',
  duration TEXT DEFAULT '00:00',
  duration_seconds INTEGER DEFAULT 0,
  caller_number TEXT,
  audio_url TEXT,
  r2_audio_key TEXT,
  transcript TEXT DEFAULT '[]', -- JSON array of dialogue turns
  sentiment TEXT DEFAULT 'Neutral',
  overall_score INTEGER CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  flags TEXT DEFAULT '{}',      -- JSON object of flag summaries
  parameter_scores TEXT DEFAULT '[]', -- JSON array of parameter evaluations
  metadata TEXT DEFAULT '{}',   -- JSON metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_d1_calls_tenant_created ON calls(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_d1_calls_agent ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_d1_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_d1_calls_score ON calls(overall_score);

-- 2. Call Evaluations & Parameter Scores Table
CREATE TABLE IF NOT EXISTS call_evaluations (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  parameter_id TEXT NOT NULL,
  parameter_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  weight INTEGER NOT NULL DEFAULT 10,
  defect BOOLEAN NOT NULL DEFAULT 0,
  explanation TEXT,
  root_cause TEXT,
  ai_confidence REAL DEFAULT 1.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_evaluations_call_id ON call_evaluations(call_id);
CREATE INDEX IF NOT EXISTS idx_d1_evaluations_defect ON call_evaluations(defect);

-- 3. Agents Roster Table
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
  total_calls INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_d1_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_d1_agents_code ON agents(code);

-- 4. Custom QA Parameters Table
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
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_d1_parameters_tenant ON parameters(tenant_id, enabled);

-- 5. Call Scripts & Guidelines Table
CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  process TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  sections TEXT NOT NULL DEFAULT '[]', -- JSON array of script sections
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_d1_scripts_tenant ON scripts(tenant_id, process);

-- 6. Audit Flags Table (Compliance, Behavioral, Critical Defect)
CREATE TABLE IF NOT EXISTS audit_flags (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  call_id TEXT NOT NULL,
  agent_id TEXT,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
  title TEXT NOT NULL,
  description TEXT,
  evidence TEXT,
  root_cause TEXT,
  detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolved_by TEXT,
  resolution_notes TEXT,
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_flags_tenant_status ON audit_flags(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_d1_flags_severity ON audit_flags(severity);

-- 7. Notifications & Alerts Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'INFO',
  is_read INTEGER NOT NULL DEFAULT 0,
  action_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_d1_notifications_tenant ON notifications(tenant_id, is_read);

-- 8. Daily Reports & KPI Aggregates
CREATE TABLE IF NOT EXISTS daily_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  report_date TEXT NOT NULL,
  total_calls INTEGER DEFAULT 0,
  avg_score REAL DEFAULT 0.0,
  critical_flags_count INTEGER DEFAULT 0,
  high_flags_count INTEGER DEFAULT 0,
  top_defects TEXT DEFAULT '[]', -- JSON
  metrics TEXT DEFAULT '{}',      -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, report_date)
);

-- 9. Tenant Config & SOP Versions
CREATE TABLE IF NOT EXISTS tenant_config (
  tenant_id TEXT PRIMARY KEY,
  brand_name TEXT DEFAULT 'NA Enterprise',
  retention_days INTEGER DEFAULT 90,
  setup_state TEXT DEFAULT 'COMPLETED',
  custom_config TEXT DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sop_versions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  r2_document_key TEXT,
  is_current INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. Subscriptions & PayU Payment Transactions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'growth', 'enterprise')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  amount REAL NOT NULL DEFAULT 9999.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'CANCELLED', 'EXPIRED')),
  max_call_minutes INTEGER NOT NULL DEFAULT 5000,
  max_agent_seats INTEGER NOT NULL DEFAULT 5,
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  payment_gateway TEXT NOT NULL DEFAULT 'PAYU',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payu_transactions (
  id TEXT PRIMARY KEY,
  txnid TEXT NOT NULL UNIQUE,
  subscription_id TEXT,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  product_info TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  payu_hash TEXT NOT NULL,
  mihpayid TEXT,
  payu_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payu_status IN ('PENDING', 'SUCCESS', 'FAILURE', 'BOUNCED')),
  bank_ref_num TEXT,
  mode TEXT,
  error_message TEXT,
  response_payload TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payu_txnid ON payu_transactions(txnid);
CREATE INDEX IF NOT EXISTS idx_payu_tenant ON payu_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payu_status ON payu_transactions(payu_status);

-- 11. Qalyzer v2.0 AI Sales & Conversion Forecasting Table
CREATE TABLE IF NOT EXISTS call_sales_forecasts (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  lead_identifier TEXT,
  purchase_intent TEXT NOT NULL DEFAULT 'NONE' CHECK (purchase_intent IN ('HIGH', 'MEDIUM', 'LOW', 'NONE')),
  budget_confirmed INTEGER NOT NULL DEFAULT 0,
  competitor_mentions TEXT DEFAULT '[]',   -- JSON array of competitor names
  pricing_objections TEXT DEFAULT '[]',    -- JSON array of pricing concerns
  win_probability INTEGER NOT NULL DEFAULT 50 CHECK (win_probability >= 0 AND win_probability <= 100),
  forecast_category TEXT NOT NULL DEFAULT 'at_risk' CHECK (forecast_category IN ('commit', 'best_case', 'at_risk')),
  projected_revenue REAL NOT NULL DEFAULT 0.0,
  deal_stage TEXT DEFAULT 'Discovery',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_sales_tenant_cat ON call_sales_forecasts(tenant_id, forecast_category);
CREATE INDEX IF NOT EXISTS idx_d1_sales_call_id ON call_sales_forecasts(call_id);

-- 12. Qalyzer v2.0 "What Could Have Been Done Better" Coaching Engine Table
CREATE TABLE IF NOT EXISTS agent_coaching_insights (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  agent_id TEXT,
  agent_name TEXT,
  turn_index INTEGER DEFAULT 0,
  timestamp TEXT DEFAULT '00:00',
  category TEXT NOT NULL DEFAULT 'objection_mishandle' CHECK (category IN ('missed_upsell', 'objection_mishandle', 'compliance_slip', 'rapport_gap', 'closing_hesitation')),
  missed_opportunity TEXT NOT NULL,
  agent_statement TEXT NOT NULL,
  ideal_rewrite TEXT NOT NULL,
  coaching_rationale TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_coaching_tenant_agent ON agent_coaching_insights(tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_d1_coaching_call_id ON agent_coaching_insights(call_id);

-- 13. Qalyzer v2.0 Micro-Coaching Dispatches (Slack, Email, Portal)
CREATE TABLE IF NOT EXISTS agent_coaching_digests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  call_id TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'portal' CHECK (channel IN ('slack', 'email', 'portal')),
  status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  digest_title TEXT NOT NULL,
  digest_content TEXT NOT NULL,           -- Formatted markdown / text
  dispatched_by TEXT DEFAULT 'System AI',
  dispatched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_d1_digests_tenant_agent ON agent_coaching_digests(tenant_id, agent_id);

-- 14. Qalyzer v2.0 Predictive CSAT & Sentiment Progression Table
CREATE TABLE IF NOT EXISTS predictive_csat_metrics (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  predicted_csat_score REAL NOT NULL DEFAULT 4.0 CHECK (predicted_csat_score >= 1.0 AND predicted_csat_score <= 5.0),
  predicted_csat_percentage INTEGER NOT NULL DEFAULT 80 CHECK (predicted_csat_percentage >= 0 AND predicted_csat_percentage <= 100),
  sentiment_opening TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment_opening IN ('positive', 'neutral', 'negative')),
  sentiment_middle TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment_middle IN ('positive', 'neutral', 'negative')),
  sentiment_closing TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment_closing IN ('positive', 'neutral', 'negative')),
  silence_duration_seconds REAL NOT NULL DEFAULT 0.0,
  silence_percentage REAL NOT NULL DEFAULT 0.0,
  dead_air_occurrences INTEGER NOT NULL DEFAULT 0,
  longest_silence_seconds REAL NOT NULL DEFAULT 0.0,
  escalation_risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (escalation_risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  escalation_triggers TEXT DEFAULT '[]',  -- JSON array of trigger strings
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_d1_csat_tenant ON predictive_csat_metrics(tenant_id, escalation_risk_level);

-- 15. Qalyzer v2.0 Products & Processes Knowledge Hub (Versioned with Effective Dates)
CREATE TABLE IF NOT EXISTS knowledge_products_processes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'product' CHECK (category IN ('product', 'process', 'compliance', 'pricing', 'script')),
  version TEXT NOT NULL DEFAULT '1.0',
  effective_from TEXT NOT NULL,           -- ISO8601 date string (e.g. 2026-01-01)
  effective_to TEXT,                      -- NULL means indefinitely effective
  content TEXT NOT NULL,
  rules_extracted TEXT DEFAULT '[]',      -- JSON array of concrete rules
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT', 'DEPRECATED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_d1_knowledge_dates ON knowledge_products_processes(tenant_id, effective_from, effective_to);

-- 16. Qalyzer v2.0 "Data Fishing" Trend Discovery & Clusters Table
CREATE TABLE IF NOT EXISTS trend_clusters (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  cluster_type TEXT NOT NULL CHECK (cluster_type IN ('recurring_objection', 'product_bug', 'cancellation_reason', 'competitor_pressure')),
  topic_title TEXT NOT NULL,
  description TEXT NOT NULL,
  frequency_count INTEGER NOT NULL DEFAULT 1,
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  impact_score INTEGER NOT NULL DEFAULT 70 CHECK (impact_score >= 0 AND impact_score <= 100),
  sample_quotes TEXT DEFAULT '[]',        -- JSON array of verbatim customer quotes
  first_detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_detected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_d1_clusters_tenant ON trend_clusters(tenant_id, cluster_type);

-- Seed initial default configuration & subscription in Cloudflare D1
INSERT OR IGNORE INTO tenant_config (tenant_id, brand_name, retention_days, setup_state)
VALUES ('00000000-0000-0000-0000-000000000001', 'NA Enterprise', 90, 'COMPLETED');

INSERT OR IGNORE INTO subscriptions (
  id, tenant_id, user_id, plan_tier, billing_cycle, amount, currency, status,
  max_call_minutes, max_agent_seats, current_period_start, current_period_end, payment_gateway
) VALUES (
  'sub_0000000000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'enterprise',
  'monthly',
  49999.00,
  'INR',
  'ACTIVE',
  50000,
  50,
  datetime('now'),
  datetime('now', '+30 days'),
  'PAYU'
);
