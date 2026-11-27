-- ====================================================================
-- AuditAI Database Migration: 011_call_evaluations_and_runs.sql
-- Description: Call evaluation runs history, re-evaluation tracking,
--              concurrency guards and audit traceability.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- TABLE: call_evaluation_runs
-- Stores every distinct evaluation run for a call.
-- Preserves previous runs, scores, flags and evidence for auditability.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'SYSTEM',
  trigger_reason TEXT,
  sop_version_id UUID REFERENCES sop_versions(id) ON DELETE SET NULL,
  config_version INTEGER,
  score INTEGER,
  parameter_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  flags_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  failure_reason TEXT,
  retranscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (call_id, run_number)
);

CREATE INDEX IF NOT EXISTS idx_call_eval_runs_call ON call_evaluation_runs(call_id, run_number DESC);
CREATE INDEX IF NOT EXISTS idx_call_eval_runs_tenant ON call_evaluation_runs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_eval_runs_status ON call_evaluation_runs(call_id, status);

-- --------------------------------------------------------------------
-- ALTER calls: link to latest evaluation run
-- --------------------------------------------------------------------
ALTER TABLE calls ADD COLUMN IF NOT EXISTS latest_evaluation_run_id UUID REFERENCES call_evaluation_runs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_calls_latest_eval_run ON calls(latest_evaluation_run_id);

-- --------------------------------------------------------------------
-- RLS: Tenant Isolation Policy
-- --------------------------------------------------------------------
ALTER TABLE call_evaluation_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON call_evaluation_runs;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_tenant_member') THEN
    CREATE POLICY tenant_isolation ON call_evaluation_runs
      FOR ALL TO authenticated
      USING (is_tenant_member(tenant_id))
      WITH CHECK (is_tenant_member(tenant_id));
  ELSE
    CREATE POLICY tenant_isolation ON call_evaluation_runs
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- --------------------------------------------------------------------
-- Supabase Realtime Publication for evaluation runs
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_evaluation_runs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE call_evaluation_runs;
    END IF;
  END IF;
END $$;
