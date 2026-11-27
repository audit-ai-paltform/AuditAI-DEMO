-- ====================================================================
-- AuditAI Database Migration: 001_initial_schema.sql
-- Description: Complete production schema for AuditAI platform
-- Tables: clients, agents, parameters, scripts, calls
-- Features: RLS, Triggers, Foreign Keys, Indexes, Constraints, Realtime
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Automatic updated_at Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------
-- TABLE: clients
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'enterprise')),
  call_limit INTEGER NOT NULL DEFAULT 1000 CHECK (call_limit >= 0),
  razorpay_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for clients updated_at
DROP TRIGGER IF EXISTS set_clients_updated_at ON clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------
-- TABLE: agents
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  process TEXT NOT NULL,
  tenure_months INTEGER NOT NULL DEFAULT 0 CHECK (tenure_months >= 0),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Training', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for agents updated_at
DROP TRIGGER IF EXISTS set_agents_updated_at ON agents;
CREATE TRIGGER set_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------
-- TABLE: parameters
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 10 CHECK (weight >= 0 AND weight <= 100),
  enabled BOOLEAN NOT NULL DEFAULT true,
  ai_suggested BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for parameters updated_at
DROP TRIGGER IF EXISTS set_parameters_updated_at ON parameters;
CREATE TRIGGER set_parameters_updated_at
  BEFORE UPDATE ON parameters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------
-- TABLE: scripts
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  process TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for scripts updated_at
DROP TRIGGER IF EXISTS set_scripts_updated_at ON scripts;
CREATE TRIGGER set_scripts_updated_at
  BEFORE UPDATE ON scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------
-- TABLE: calls
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(code) ON DELETE SET NULL,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  duration TEXT,
  caller_number TEXT,
  flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  parameter_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  recording_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for calls updated_at
DROP TRIGGER IF EXISTS set_calls_updated_at ON calls;
CREATE TRIGGER set_calls_updated_at
  BEFORE UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------
-- INDEX OPTIMIZATIONS
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agents_client_id ON agents(client_id);
CREATE INDEX IF NOT EXISTS idx_agents_code ON agents(code);

CREATE INDEX IF NOT EXISTS idx_parameters_client_enabled ON parameters(client_id, enabled);

CREATE INDEX IF NOT EXISTS idx_scripts_client_process ON scripts(client_id, process);

CREATE INDEX IF NOT EXISTS idx_calls_client_created ON calls(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- --------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) PREPARATION
-- Enable RLS on all business tables
-- --------------------------------------------------------------------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- REALTIME PREPARATION
-- Enable Supabase Realtime for calls table
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE calls;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
