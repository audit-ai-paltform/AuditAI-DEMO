-- Security hardening: tenant membership, encrypted provider credentials and retention metadata.
-- Apply after 008. This migration intentionally does not delete existing data.

CREATE TABLE IF NOT EXISTS tenant_memberships (
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MANAGER', 'ANALYST', 'VIEWER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS tenant_integrations (
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('assemblyai', 'gemini', 'knowlarity')),
  encrypted_secret TEXT NOT NULL,
  key_last4 TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (status IN ('UNVERIFIED', 'VALID', 'INVALID', 'DISABLED')),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, provider)
);

CREATE TABLE IF NOT EXISTS tenant_retention_policies (
  tenant_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  temporary_data_days INTEGER NOT NULL DEFAULT 1 CHECK (temporary_data_days BETWEEN 1 AND 3650),
  evidence_days INTEGER NOT NULL DEFAULT 30 CHECK (evidence_days BETWEEN 1 AND 3650),
  reports_days INTEGER NOT NULL DEFAULT 365 CHECK (reports_days BETWEEN 1 AND 3650),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retention_deletion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED', 'SKIPPED')),
  reason TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE calls ADD COLUMN IF NOT EXISTS temporary_data_delete_at TIMESTAMPTZ;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS evidence_delete_at TIMESTAMPTZ;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS retention_state TEXT NOT NULL DEFAULT 'ACTIVE'
  CHECK (retention_state IN ('ACTIVE', 'PENDING', 'DELETED', 'FAILED'));
CREATE INDEX IF NOT EXISTS idx_calls_retention_due ON calls (temporary_data_delete_at) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.is_tenant_member(target_tenant UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM tenant_memberships m WHERE m.tenant_id = target_tenant AND m.user_id = auth.uid() AND m.status = 'ACTIVE');
$$;

REVOKE ALL ON FUNCTION public.is_tenant_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(UUID) TO authenticated;

-- Direct browser access is denied by default; authenticated users only see their membership tenant.
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE flag_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_processing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_deletion_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['clients','agents','parameters','scripts','calls','tenant_config','sop_versions','call_flags','flag_events','notifications','call_processing_events','webhook_events','tenant_memberships','tenant_integrations','tenant_retention_policies','retention_deletion_events'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public access on %s" ON public.%I', table_name, table_name);
  END LOOP;
END $$;

CREATE POLICY tenant_isolation ON clients FOR SELECT TO authenticated USING (is_tenant_member(id));
CREATE POLICY tenant_isolation ON agents FOR ALL TO authenticated USING (is_tenant_member(client_id)) WITH CHECK (is_tenant_member(client_id));
CREATE POLICY tenant_isolation ON parameters FOR ALL TO authenticated USING (is_tenant_member(client_id)) WITH CHECK (is_tenant_member(client_id));
CREATE POLICY tenant_isolation ON scripts FOR ALL TO authenticated USING (is_tenant_member(client_id)) WITH CHECK (is_tenant_member(client_id));
CREATE POLICY tenant_isolation ON calls FOR ALL TO authenticated USING (is_tenant_member(client_id)) WITH CHECK (is_tenant_member(client_id));
CREATE POLICY tenant_isolation ON tenant_config FOR ALL TO authenticated USING (is_tenant_member(client_id)) WITH CHECK (is_tenant_member(client_id));
CREATE POLICY tenant_isolation ON sop_versions FOR ALL TO authenticated USING (is_tenant_member(client_id)) WITH CHECK (is_tenant_member(client_id));
CREATE POLICY tenant_isolation ON call_flags FOR ALL TO authenticated USING (is_tenant_member(tenant_id)) WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation ON flag_events FOR ALL TO authenticated USING (is_tenant_member(tenant_id)) WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation ON notifications FOR ALL TO authenticated USING (is_tenant_member(tenant_id)) WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation ON call_processing_events FOR ALL TO authenticated USING (is_tenant_member(tenant_id)) WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation ON webhook_events FOR SELECT TO authenticated USING (is_tenant_member(client_id));
CREATE POLICY tenant_isolation ON tenant_memberships FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY tenant_isolation ON tenant_integrations FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation ON tenant_retention_policies FOR ALL TO authenticated USING (is_tenant_member(tenant_id)) WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY tenant_isolation ON retention_deletion_events FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));

-- Storage objects use the first path component as tenant_id: recordings/<tenant>/<call>.mp3.
DO $$
BEGIN
  BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS recordings_tenant_read ON storage.objects;
    CREATE POLICY recordings_tenant_read ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'recordings' AND is_tenant_member((storage.foldername(name))[1]::uuid));
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage.objects RLS alteration: insufficient privilege (managed by Supabase Storage Admin)';
  END;
END $$;

-- service_role is used only by server workers and bypasses RLS; do not grant anon write access.
REVOKE ALL ON tenant_integrations FROM anon, authenticated;
GRANT SELECT ON tenant_integrations TO authenticated;
