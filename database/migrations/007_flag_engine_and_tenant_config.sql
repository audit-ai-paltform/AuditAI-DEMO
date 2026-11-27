-- ====================================================================
-- AuditAI Database Migration: 007_flag_engine_and_tenant_config.sql
-- Description: Flag Intelligence Engine, SOP versioning, tenant
--              configuration state, notifications, processing events,
--              webhook idempotency.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- TABLE: tenant_config (one row per client — setup/configuration state)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_config (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  setup_state TEXT NOT NULL DEFAULT 'NOT_CONFIGURED'
    CHECK (setup_state IN ('NOT_CONFIGURED', 'SETUP_IN_PROGRESS', 'CONFIGURED', 'REQUIRES_REVIEW')),
  config_version INTEGER NOT NULL DEFAULT 0,
  active_sop_version_id UUID,
  activated_at TIMESTAMPTZ,
  activated_by TEXT,
  flag_engine_enabled BOOLEAN NOT NULL DEFAULT true,
  critical_notify BOOLEAN NOT NULL DEFAULT true,
  high_notify BOOLEAN NOT NULL DEFAULT false,
  medium_notify BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_tenant_config_updated_at ON tenant_config;
CREATE TRIGGER set_tenant_config_updated_at
  BEFORE UPDATE ON tenant_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------
-- TABLE: sop_versions (immutable SOP versions per tenant/process)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sop_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  process TEXT NOT NULL DEFAULT 'General',
  language TEXT NOT NULL DEFAULT 'English',
  version_number INTEGER NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, process, version_number)
);

DROP TRIGGER IF EXISTS set_sop_versions_updated_at ON sop_versions;
CREATE TRIGGER set_sop_versions_updated_at
  BEFORE UPDATE ON sop_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sop_versions_client_process ON sop_versions(client_id, process, status);

-- Only one ACTIVE sop version per tenant/process
CREATE UNIQUE INDEX IF NOT EXISTS idx_sop_versions_one_active
  ON sop_versions(client_id, process) WHERE status = 'ACTIVE';

-- Foreign key from tenant_config.active_sop_version_id -> sop_versions(id).
-- Added conditionally: Postgres has no "ADD CONSTRAINT IF NOT EXISTS" for
-- foreign keys, so a bare ADD CONSTRAINT raises 42710 (duplicate_object) on
-- rerun. We add it only when a constraint of this name does not already exist
-- on this table — we never drop/recreate an existing one (see the verification
-- query in the migration notes to confirm its definition is correct).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tenant_config_active_sop'
      AND conrelid = 'public.tenant_config'::regclass
  ) THEN
    ALTER TABLE tenant_config
      ADD CONSTRAINT fk_tenant_config_active_sop
      FOREIGN KEY (active_sop_version_id) REFERENCES sop_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- --------------------------------------------------------------------
-- TABLE: webhook_events (idempotency + webhook audit log)
-- --------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_webhook_events_call ON webhook_events(call_id);

-- --------------------------------------------------------------------
-- TABLE: call_processing_events (audit trail for every pipeline step)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_processing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED'
    CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED', 'SKIPPED')),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_processing_events_call ON call_processing_events(call_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_processing_events_tenant ON call_processing_events(tenant_id, created_at DESC);

-- --------------------------------------------------------------------
-- TABLE: call_flags (structured audit intelligence entity)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  agent_id TEXT,
  flag_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'OTHER',
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('DETECTED', 'OPEN', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED', 'ESCALATED')),
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  customer_statement TEXT,
  agent_statement TEXT,
  expected_information TEXT,
  actual_information TEXT,
  evidence TEXT,
  evidence_start_time INTEGER,
  evidence_end_time INTEGER,
  transcript_segment_id TEXT,
  parameter_id TEXT,
  sop_version_id UUID REFERENCES sop_versions(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'AI_VERIFIED'
    CHECK (source IN ('RULE', 'AI_VERIFIED', 'AI_ONLY', 'MANUAL')),
  ai_reasoning TEXT,
  recommended_action TEXT,
  requires_manager_attention BOOLEAN NOT NULL DEFAULT false,
  dedup_key TEXT,
  resolution_type TEXT
    CHECK (resolution_type IN ('CONFIRMED_ISSUE', 'FALSE_POSITIVE', 'TRANSCRIPTION_ISSUE', 'ESCALATED', 'OTHER')),
  resolution_note TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_call_flags_updated_at ON call_flags;
CREATE TRIGGER set_call_flags_updated_at
  BEFORE UPDATE ON call_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_call_flags_tenant_created ON call_flags(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_flags_call ON call_flags(call_id);
CREATE INDEX IF NOT EXISTS idx_call_flags_agent ON call_flags(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_flags_severity ON call_flags(severity);
CREATE INDEX IF NOT EXISTS idx_call_flags_status ON call_flags(status);
CREATE INDEX IF NOT EXISTS idx_call_flags_requires_attention ON call_flags(requires_manager_attention) WHERE requires_manager_attention = true;
CREATE INDEX IF NOT EXISTS idx_call_flags_type ON call_flags(flag_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_call_flags_dedup ON call_flags(call_id, dedup_key) WHERE dedup_key IS NOT NULL;

-- --------------------------------------------------------------------
-- TABLE: flag_events (flag lifecycle history — learning/calibration)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flag_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES call_flags(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('CREATED', 'STATUS_CHANGED', 'CONFIRMED', 'DISMISSED', 'ESCALATED', 'MARKED_TRANSCRIPTION_ISSUE', 'NOTE_ADDED')),
  actor TEXT,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flag_events_flag ON flag_events(flag_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flag_events_tenant ON flag_events(tenant_id, event_type, created_at DESC);

-- --------------------------------------------------------------------
-- TABLE: notifications (internal dashboard notifications)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL DEFAULT 'MANAGER'
    CHECK (recipient_role IN ('MANAGER', 'QA', 'CLIENT_ADMIN', 'SUPER_ADMIN')),
  channel TEXT NOT NULL DEFAULT 'DASHBOARD'
    CHECK (channel IN ('DASHBOARD', 'EMAIL', 'SLACK', 'TEAMS', 'SMS', 'WHATSAPP', 'WEBHOOK')),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  severity TEXT,
  flag_id UUID REFERENCES call_flags(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  dedup_key TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created ON notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(tenant_id, read) WHERE read = false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup ON notifications(tenant_id, dedup_key) WHERE dedup_key IS NOT NULL;

-- --------------------------------------------------------------------
-- Calls table additions: SOP traceability + processing metadata
-- --------------------------------------------------------------------
ALTER TABLE calls ADD COLUMN IF NOT EXISTS sop_version_id UUID REFERENCES sop_versions(id) ON DELETE SET NULL;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS config_version INTEGER;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS processing_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS correlation_id TEXT;

CREATE INDEX IF NOT EXISTS idx_calls_sop_version ON calls(sop_version_id);
CREATE INDEX IF NOT EXISTS idx_calls_client_status ON calls(client_id, status);

-- Add flags + notifications to the realtime publication.
-- Each table is added in its own guarded check: a single shared
-- EXCEPTION/duplicate_object handler would swallow the error from the FIRST
-- already-present table and skip adding the SECOND one entirely.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_flags'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE call_flags;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
  END IF;
END $$;

-- RLS: tables are consumed via backend service-role; keep consistent with
-- existing migrations (003) which manage RLS at the project level.
ALTER TABLE IF EXISTS sop_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_flags DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS flag_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_processing_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhook_events DISABLE ROW LEVEL SECURITY;
