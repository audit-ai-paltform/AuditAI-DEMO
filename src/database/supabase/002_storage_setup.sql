-- ====================================================================
-- AuditAI Supabase Setup: 002_storage_setup.sql
-- Description: Private Storage Bucket setup for call audio recordings
-- Bucket: recordings (Private, 100MB limit, audio mime-types)
-- ====================================================================

-- 1. Create Private Storage Bucket for Call Audio Recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  false,
  104857600, -- 100 MB Limit per audio recording file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Enable Row Level Security on Storage Objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
