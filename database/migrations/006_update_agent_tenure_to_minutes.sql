-- ====================================================================
-- AuditAI Migration 006: Update Agent Tenure to Minutes (Total Call Minutes)
-- ====================================================================

-- 1. Rename column tenure_months to tenure_minutes if tenure_months exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'tenure_months'
  ) THEN
    ALTER TABLE agents RENAME COLUMN tenure_months TO tenure_minutes;
  END IF;
END $$;

-- 2. Set default value of tenure_minutes to 0
ALTER TABLE agents ALTER COLUMN tenure_minutes SET DEFAULT 0;

-- 3. Reset existing tenure_minutes to 0 if null or uncalculated
UPDATE agents SET tenure_minutes = 0 WHERE tenure_minutes IS NULL;
