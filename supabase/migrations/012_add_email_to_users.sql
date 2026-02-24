-- Migration 012: Add email column to users table for multi-user auth linking.
-- This allows matching Supabase Auth email to the app user during account linking.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Email should be unique when set (NULL is allowed for users who haven't linked yet)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users (email)
  WHERE email IS NOT NULL;
