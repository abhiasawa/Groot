-- ============================================================
-- Migration 019: Enable RLS on login_otps
-- OTP table should never be client-accessible.
-- All OTP operations happen server-side via the service role key.
-- ============================================================

ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;

-- No permissive policies = only service_role can access this table.
