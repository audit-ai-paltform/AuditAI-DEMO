-- ====================================================================
-- AuditAI Database Migration: 003_disable_rls_public_tables.sql
-- Description: Allow frontend and service operations without RLS restrictions
-- Run this in Supabase Dashboard -> SQL Editor
-- ====================================================================

ALTER TABLE IF EXISTS scripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS parameters DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;
