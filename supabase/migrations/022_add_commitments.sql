-- Phase 2: Commitment Tracking
-- Stores user commitments extracted by the LLM from conversation.

CREATE TABLE commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    commitment_text TEXT NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    last_referenced_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',  -- active, stale, completed, dismissed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, commitment_text)
);

CREATE INDEX idx_commitments_user_status ON commitments(user_id, status, detected_at DESC);

ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on commitments"
    ON commitments FOR ALL
    USING (auth.role() = 'service_role');
