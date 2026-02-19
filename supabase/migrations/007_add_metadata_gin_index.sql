-- GIN index for querying memoryTags inside messages.metadata JSONB
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin
  ON messages USING GIN (metadata jsonb_path_ops);
