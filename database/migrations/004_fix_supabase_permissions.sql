-- ====================================================================
-- AuditAI Complete Supabase Table Permissions & RLS Fix
-- Copy and paste this ENTIRE script into Supabase SQL Editor and click RUN
-- URL: https://supabase.com/dashboard/project/ixuutllrfapiawzumvvl/sql/new
-- ====================================================================

-- 1. Disable Row Level Security on all AuditAI tables
ALTER TABLE IF EXISTS scripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS parameters DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Allow public full access on scripts" ON scripts;
DROP POLICY IF EXISTS "Allow public full access on parameters" ON parameters;
DROP POLICY IF EXISTS "Allow public full access on agents" ON agents;
DROP POLICY IF EXISTS "Allow public full access on calls" ON calls;
DROP POLICY IF EXISTS "Allow public full access on clients" ON clients;

-- 3. Grant full permissions on all tables to anon, authenticated, and service_role
GRANT ALL ON TABLE scripts TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE parameters TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE agents TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE calls TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE clients TO anon, authenticated, service_role, postgres;

-- 4. Grant usage on all sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 5. Create open fallback policies in case RLS is manually enabled later
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access on scripts" ON scripts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE parameters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access on parameters" ON parameters FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access on agents" ON agents FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access on calls" ON calls FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
