-- ====================================================================
-- AuditAI Complete Data Seeding Migration
-- Copy and paste this ENTIRE script into Supabase SQL Editor and click RUN
-- URL: https://supabase.com/dashboard/project/ixuutllrfapiawzumvvl/sql/new
-- ====================================================================

-- 1. Ensure Default Client
INSERT INTO clients (id, name, email, plan, call_limit)
VALUES ('00000000-0000-0000-0000-000000000001', 'Health Insurance Enterprise Client', 'insurance-admin@auditai.io', 'enterprise', 50000)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Default Agents (EMP001-EMP005 and EMP2200-EMP2207)
INSERT INTO agents (client_id, name, code, process, tenure_minutes, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Rahul Sharma', 'EMP001', 'Sales', 0, 'Active'),
  ('00000000-0000-0000-0000-000000000001', 'Priya Verma', 'EMP002', 'Sales', 0, 'Active'),
  ('00000000-0000-0000-0000-000000000001', 'Arjun Patel', 'EMP003', 'Customer Support', 0, 'Active'),
  ('00000000-0000-0000-0000-000000000001', 'Sneha Reddy', 'EMP004', 'Customer Support', 0, 'Active'),
  ('00000000-0000-0000-0000-000000000001', 'Aman Khan', 'EMP005', 'Retention', 0, 'Active')
ON CONFLICT (code) DO NOTHING;

-- 3. Seed Default QA Parameters (Greeting 10%, Verification 15%, Need Analysis 15%, Communication 20%, Product Knowledge 15%, Compliance 15%, Closing 10%)
INSERT INTO parameters (client_id, name, weight, enabled, ai_suggested)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Greeting', 10, true, false),
  ('00000000-0000-0000-0000-000000000001', 'Verification', 15, true, false),
  ('00000000-0000-0000-0000-000000000001', 'Need Analysis', 15, true, false),
  ('00000000-0000-0000-0000-000000000001', 'Communication', 20, true, false),
  ('00000000-0000-0000-0000-000000000001', 'Product Knowledge', 15, true, false),
  ('00000000-0000-0000-0000-000000000001', 'Compliance', 15, true, false),
  ('00000000-0000-0000-0000-000000000001', 'Closing', 10, true, false)
ON CONFLICT DO NOTHING;

-- 4. Seed Active Health Insurance Sales SOP v1.0 Script
INSERT INTO scripts (client_id, process, language, sections)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Health Insurance Sales',
  'English',
  '[
    {"title": "Greeting", "text": "Greet the customer politely. Introduce yourself with your name. Mention the company name."},
    {"title": "Verification", "text": "Verify customer identity before discussing policy. Confirm customer''s full name and registered mobile number."},
    {"title": "Need Analysis", "text": "Understand customer requirements. Ask relevant questions before suggesting a plan."},
    {"title": "Communication", "text": "Speak politely. Avoid interrupting the customer. Maintain professional tone."},
    {"title": "Product Explanation", "text": "Explain policy benefits clearly, premium amount, waiting period, and exclusions."},
    {"title": "Compliance", "text": "Do not make false promises. Do not hide important terms. Follow company compliance guidelines."},
    {"title": "Objection Handling", "text": "Listen patiently. Address concerns professionally. Offer suitable alternatives."},
    {"title": "Closing", "text": "Summarize the discussion. Ask if customer has questions. Thank the customer."}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;
