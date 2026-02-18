-- Persistent bidirectional links between memories.
-- source_id < target_id is enforced by the application to prevent duplicate A↔B entries.

CREATE TABLE memory_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL DEFAULT 'related',
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, target_id)
);

ALTER TABLE memory_links ADD CONSTRAINT chk_no_self_link
  CHECK (source_id != target_id);

CREATE INDEX idx_memory_links_source ON memory_links(source_id);
CREATE INDEX idx_memory_links_target ON memory_links(target_id);

ALTER TABLE memory_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON memory_links FOR ALL USING (true);
