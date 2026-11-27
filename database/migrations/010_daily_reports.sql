-- Daily, tenant-scoped immutable report metadata. Storage bucket `reports` must be private.
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','GENERATING','READY','FAILED','EXPIRED')),
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_key TEXT,
  checksum TEXT,
  generated_at TIMESTAMPTZ,
  report_delete_at TIMESTAMPTZ,
  failure_reason TEXT,
  generation_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, business_date)
);
ALTER TABLE tenant_retention_policies ADD COLUMN IF NOT EXISTS business_timezone TEXT NOT NULL DEFAULT 'UTC';
CREATE INDEX IF NOT EXISTS idx_daily_reports_tenant_date ON daily_reports(tenant_id, business_date DESC);
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON daily_reports;
CREATE POLICY tenant_isolation ON daily_reports FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));

-- Private report objects: reports/<tenant UUID>/<report UUID>.pdf
DROP POLICY IF EXISTS reports_tenant_read ON storage.objects;
CREATE POLICY reports_tenant_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND is_tenant_member((storage.foldername(name))[1]::uuid));
