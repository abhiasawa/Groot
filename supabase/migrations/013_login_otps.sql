-- ============================================================
-- Migration 013: Login OTPs table for WhatsApp-based authentication
-- ============================================================

CREATE TABLE login_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR NOT NULL,
  code VARCHAR(6) NOT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fast lookup for verification: phone + code combo
CREATE INDEX idx_login_otps_phone_code
  ON login_otps(phone_number, code)
  WHERE verified_at IS NULL;

-- Cleanup expired OTPs
CREATE INDEX idx_login_otps_cleanup
  ON login_otps(expires_at)
  WHERE verified_at IS NULL;

-- Rate limiting: recent OTPs per phone number
CREATE INDEX idx_login_otps_rate_limit
  ON login_otps(phone_number, created_at DESC);
