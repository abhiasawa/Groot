-- Migration 015: Add Google Auth support and access control
--
-- 1. Add google_id and avatar_url to users table
-- 2. Make whatsapp_number nullable (Google-first users won't have one)
-- 3. Create allowed_users table for invite-only access control

-- ── Add Google identity columns ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Unique index on google_id (when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique
  ON users (google_id)
  WHERE google_id IS NOT NULL;

-- ── Make whatsapp_number nullable ──
-- Google-first users won't have a WhatsApp number initially
ALTER TABLE users ALTER COLUMN whatsapp_number DROP NOT NULL;

-- ── Access control: who can use this Groot instance ──
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  access_level VARCHAR(20) DEFAULT 'friend',  -- 'owner' | 'friend'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on allowed_users: only service role can read/write
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- No public access policies — only service_role key can manage this table
