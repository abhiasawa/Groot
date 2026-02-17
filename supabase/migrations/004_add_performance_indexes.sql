-- Performance indexes for Garden portal queries

-- Contacts: queried by owner_user_id in /api/people
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_user_id);

-- Habits: queried by user_id + is_active in /api/habits
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, is_active);
