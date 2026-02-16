-- Groot AI Second Brain - Initial Schema
-- Phase 1: Foundation tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users table ───
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whatsapp_number VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    onboarding_step SMALLINT DEFAULT 0,
    onboarding_completed_at TIMESTAMPTZ,
    proactive_preference VARCHAR(20) DEFAULT 'daily',
    last_responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── User Profile (Living Profile) ───
CREATE TABLE user_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    confidence FLOAT DEFAULT 1.0,
    source VARCHAR(50),
    last_mentioned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category, key)
);

-- ─── Messages table (short-term memory) ───
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    content TEXT,
    media_url TEXT,
    media_description TEXT,
    metadata JSONB DEFAULT '{}',
    whatsapp_message_id VARCHAR(100),
    synced_to_supermemory BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sessions table ───
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    message_count INT DEFAULT 0,
    summary TEXT,
    is_active BOOLEAN DEFAULT true
);

-- ─── Habits ───
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    frequency VARCHAR(20) DEFAULT 'daily',
    target_value FLOAT,
    target_unit VARCHAR(50),
    reminder_time TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Habit Check-ins ───
CREATE TABLE habit_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    value FLOAT,
    note TEXT,
    mood VARCHAR(20),
    checked_in_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Habit Streaks ───
CREATE TABLE habit_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_checkin_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Weekly Reports ───
CREATE TABLE weekly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    summary TEXT NOT NULL,
    key_topics JSONB DEFAULT '[]',
    mood_trend JSONB DEFAULT '{}',
    habit_summary JSONB DEFAULT '{}',
    insights JSONB DEFAULT '[]',
    memories_count INT DEFAULT 0,
    messages_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- ─── Contacts (send on behalf) ───
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    is_approved BOOLEAN DEFAULT true,
    last_messaged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_user_id, whatsapp_number)
);

-- ─── Tasks (quick capture) ───
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'todo',
    is_completed BOOLEAN DEFAULT false,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reminders ───
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    context TEXT,
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Operational: Deduplication ───
CREATE TABLE processed_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whatsapp_message_id VARCHAR(100) UNIQUE NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Operational: API Usage Tracking ───
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    call_count INT DEFAULT 0,
    total_cost_cents INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date, provider)
);

-- ─── Operational: Message Queue ───
CREATE TABLE message_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    attempts INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ─── Indexes ───
CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_whatsapp_id ON messages(whatsapp_message_id);
CREATE INDEX idx_messages_sync_status ON messages(synced_to_supermemory) WHERE synced_to_supermemory = false;
CREATE INDEX idx_profile_user_category ON user_profile(user_id, category);
CREATE INDEX idx_sessions_user_active ON sessions(user_id, is_active);
CREATE INDEX idx_checkins_habit_date ON habit_checkins(habit_id, checked_in_at DESC);
CREATE INDEX idx_checkins_user_date ON habit_checkins(user_id, checked_in_at DESC);
CREATE INDEX idx_streaks_habit ON habit_streaks(habit_id);
CREATE INDEX idx_reports_user_week ON weekly_reports(user_id, week_start DESC);
CREATE INDEX idx_tasks_user ON tasks(user_id, is_completed, created_at DESC);
CREATE INDEX idx_reminders_upcoming ON reminders(remind_at, is_sent) WHERE is_sent = false;
CREATE INDEX idx_processed_messages_wa_id ON processed_messages(whatsapp_message_id);
CREATE INDEX idx_message_queue_status ON message_queue(status) WHERE status = 'pending';

-- ─── Row Level Security ───
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;

-- Service role policies (our backend uses service role key which bypasses RLS,
-- but these exist as a safety net for any direct client access)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON user_profile FOR ALL USING (true);
CREATE POLICY "Service role full access" ON messages FOR ALL USING (true);
CREATE POLICY "Service role full access" ON sessions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON habits FOR ALL USING (true);
CREATE POLICY "Service role full access" ON habit_checkins FOR ALL USING (true);
CREATE POLICY "Service role full access" ON habit_streaks FOR ALL USING (true);
CREATE POLICY "Service role full access" ON weekly_reports FOR ALL USING (true);
CREATE POLICY "Service role full access" ON contacts FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tasks FOR ALL USING (true);
CREATE POLICY "Service role full access" ON reminders FOR ALL USING (true);
CREATE POLICY "Service role full access" ON processed_messages FOR ALL USING (true);
CREATE POLICY "Service role full access" ON api_usage FOR ALL USING (true);
CREATE POLICY "Service role full access" ON message_queue FOR ALL USING (true);
