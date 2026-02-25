-- Migration 016: Fix missing columns and constraints for Google Auth
--
-- Fixes:
-- 1. Add email column to users (was in migration 012 but never applied)
-- 2. Make whatsapp_number nullable (was in migration 015 but may not have applied)
-- 3. Update check constraint to allow Google-only users
-- 4. Create allowed_users table if missing (from migration 015)

-- ── 1. Add email column ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users (email)
  WHERE email IS NOT NULL;

-- ── 2. Add google_id and avatar_url if missing ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique
  ON users (google_id)
  WHERE google_id IS NOT NULL;

-- ── 3. Make whatsapp_number nullable ──
ALTER TABLE users ALTER COLUMN whatsapp_number DROP NOT NULL;

-- ── 4. Fix the platform check constraint to include google_id ──
-- Drop the old constraint (if it exists) and create a new one that allows google_id
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_at_least_one_platform;
ALTER TABLE users ADD CONSTRAINT chk_at_least_one_platform
  CHECK (
    whatsapp_number IS NOT NULL
    OR telegram_chat_id IS NOT NULL
    OR google_id IS NOT NULL
  );

-- ── 5. Create allowed_users table if missing ──
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  access_level VARCHAR(20) DEFAULT 'friend',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- ── 6. Reload PostgREST schema cache ──
NOTIFY pgrst, 'reload schema';
