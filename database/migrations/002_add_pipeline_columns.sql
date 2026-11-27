-- ====================================================================
-- AuditAI Database Migration: 002_add_pipeline_columns.sql
-- Description: Add pipeline status and metadata columns to calls table
-- ====================================================================

ALTER TABLE calls ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS utterances JSONB DEFAULT '[]'::jsonb;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS confidence NUMERIC;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS transcript_id TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS raw_evaluation JSONB DEFAULT '{}'::jsonb;
