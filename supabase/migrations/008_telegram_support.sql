-- Telegram bot support: multi-platform user identity + column renames

-- 1. Add telegram_chat_id to users
ALTER TABLE users ADD COLUMN telegram_chat_id BIGINT UNIQUE;
CREATE INDEX idx_users_telegram_chat_id ON users(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- 2. Make whatsapp_number nullable (all existing users have it, so safe)
ALTER TABLE users ALTER COLUMN whatsapp_number DROP NOT NULL;

-- 3. Ensure at least one platform identifier exists
ALTER TABLE users ADD CONSTRAINT chk_at_least_one_platform
  CHECK (whatsapp_number IS NOT NULL OR telegram_chat_id IS NOT NULL);

-- 4. Rename whatsapp_message_id → platform_message_id
ALTER TABLE messages RENAME COLUMN whatsapp_message_id TO platform_message_id;
ALTER TABLE processed_messages RENAME COLUMN whatsapp_message_id TO platform_message_id;

-- 5. Add platform column to messages
ALTER TABLE messages ADD COLUMN platform VARCHAR(20) DEFAULT 'whatsapp';

-- 6. Rebuild indexes with new column names
DROP INDEX IF EXISTS idx_messages_whatsapp_id;
CREATE INDEX idx_messages_platform_id ON messages(platform_message_id);

DROP INDEX IF EXISTS idx_processed_messages_wa_id;
CREATE INDEX idx_processed_messages_platform_id ON processed_messages(platform_message_id);
