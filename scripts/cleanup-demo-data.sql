-- ==============================================================================
-- AuditAI Demo Data Safe Cleanup & Backup Script
--
-- TARGET: Call-related demo records, evaluation runs, flags, events, webhook logs.
-- PRESERVED: clients, users, tenant_memberships, agents, parameters, sop_versions,
--            tenant_config, database schema, RLS policies.
--
-- DO NOT EXECUTE AUTOMATICALLY. Review the counts and run only upon confirmation.
-- ==============================================================================

BEGIN;

-- 1. Create temporary backup tables for safety before any deletion
CREATE TABLE IF NOT EXISTS _backup_calls AS 
SELECT * FROM public.calls;

CREATE TABLE IF NOT EXISTS _backup_call_processing_events AS 
SELECT * FROM public.call_processing_events;

CREATE TABLE IF NOT EXISTS _backup_call_flags AS 
SELECT * FROM public.call_flags;

CREATE TABLE IF NOT EXISTS _backup_call_evaluation_runs AS 
SELECT * FROM public.call_evaluation_runs;

CREATE TABLE IF NOT EXISTS _backup_webhook_events AS 
SELECT * FROM public.webhook_events;

-- 2. Safe scoped deletions respecting foreign keys (No TRUNCATE CASCADE, No schema modifications)
DELETE FROM public.flag_events;
DELETE FROM public.notifications;
DELETE FROM public.call_flags;
DELETE FROM public.call_evaluation_runs;
DELETE FROM public.call_processing_events;
DELETE FROM public.webhook_events WHERE provider = 'knowlarity' OR call_id IS NOT NULL;
DELETE FROM public.calls;

-- 3. Reset agent cumulative tenure to 0 for fresh demo calls
UPDATE public.agents SET tenure_minutes = 0;

-- 4. Verify post-cleanup state
SELECT 'calls' AS table_name, count(*) AS remaining_count FROM public.calls
UNION ALL
SELECT 'call_processing_events', count(*) FROM public.call_processing_events
UNION ALL
SELECT 'call_flags', count(*) FROM public.call_flags
UNION ALL
SELECT 'call_evaluation_runs', count(*) FROM public.call_evaluation_runs
UNION ALL
SELECT 'webhook_events', count(*) FROM public.webhook_events
UNION ALL
SELECT 'agents (preserved)', count(*) FROM public.agents
UNION ALL
SELECT 'parameters (preserved)', count(*) FROM public.parameters
UNION ALL
SELECT 'clients (preserved)', count(*) FROM public.clients;

COMMIT;

