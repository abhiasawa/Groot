-- Proactive message history — tracks questions sent to users and engagement.
-- Used for deduplication (avoid asking same question twice) and measuring reply rates.

CREATE TABLE IF NOT EXISTS proactive_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,  -- 'evening_reflection', 'morning_checkin', 'midday_nudge', 'weekly_report'
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replied_at TIMESTAMPTZ,
  reply_message_id UUID
);

CREATE INDEX idx_proactive_history_user_type
  ON proactive_history(user_id, message_type, sent_at DESC);

-- RLS: service role only (cron jobs + backend)
ALTER TABLE proactive_history ENABLE ROW LEVEL SECURITY;
