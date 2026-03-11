-- Add card_category column to messages for AI-detected content classification
ALTER TABLE messages ADD COLUMN IF NOT EXISTS card_category VARCHAR(50);

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_messages_card_category ON messages(card_category) WHERE card_category IS NOT NULL;
