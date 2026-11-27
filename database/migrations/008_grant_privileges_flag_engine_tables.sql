-- ====================================================================
-- AuditAI Database Migration: 008_grant_privileges_flag_engine_tables.sql
-- Description: Migration 004 granted table privileges to the Supabase API
--              roles (anon, authenticated, service_role) ONLY for the five
--              original tables. The tables introduced in migration 007
--              (flag engine, SOP versioning, tenant config, webhook ledger,
--              processing events, notifications) were never granted, so the
--              backend's secret-key role gets "permission denied" on them.
--              This blocks flag persistence, the audit trail, notifications,
--              SOP versioning and webhook idempotency at runtime.
--
--              This migration grants the same access pattern used in 004 to
--              the migration-007 tables. GRANT is idempotent and safe to rerun.
-- Run in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/ixuutllrfapiawzumvvl/sql/new
-- ====================================================================

GRANT ALL ON TABLE tenant_config          TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE sop_versions           TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE webhook_events         TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE call_processing_events TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE call_flags             TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE flag_events            TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE notifications          TO anon, authenticated, service_role, postgres;

-- Any sequences created for these tables (defensive — UUID PKs usually have none).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- Keep RLS disabled, consistent with migrations 003/004/007 (backend uses the
-- service-role/secret key). Tenant isolation is enforced in the application
-- layer; see the security note in the backend validation report.
ALTER TABLE IF EXISTS tenant_config          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sop_versions           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhook_events         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_processing_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_flags             DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS flag_events            DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications          DISABLE ROW LEVEL SECURITY;
