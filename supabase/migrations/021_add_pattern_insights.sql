-- Phase 1: Pattern Engine Foundation
-- Stores SQL-computed behavioral insights surfaced by the daily analyze-patterns cron.

CREATE TABLE pattern_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    -- Types: mood_shift, silence, commitment_stale,
    --        people_frequency, topic_shift, streak_milestone
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'info',  -- info, notable, urgent
    surfaced BOOLEAN DEFAULT false,
    surfaced_by VARCHAR(50),              -- which cron surfaced it (morning, midday, evening, weekly)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_insights_user_type ON pattern_insights(user_id, insight_type, created_at DESC);
CREATE INDEX idx_pattern_insights_unsurfaced ON pattern_insights(user_id, surfaced) WHERE surfaced = false;

ALTER TABLE pattern_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on pattern_insights"
    ON pattern_insights FOR ALL
    USING (auth.role() = 'service_role');
