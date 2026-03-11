-- Add bookmarked flag to messages for user-saved entries
ALTER TABLE messages ADD COLUMN bookmarked BOOLEAN NOT NULL DEFAULT false;
