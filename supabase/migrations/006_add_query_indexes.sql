-- Additional indexes for Garden portal query performance

-- Messages: filtered by direction in /api/memories, /api/graph
CREATE INDEX IF NOT EXISTS idx_messages_user_direction_created
  ON messages(user_id, direction, created_at DESC);

-- User profile: filtered by category+key in /api/profile, /api/people, /api/settings
CREATE INDEX IF NOT EXISTS idx_user_profile_user_category_key
  ON user_profile(user_id, category, key);

-- Reminders: filtered by user + pending in /api/garden/home
CREATE INDEX IF NOT EXISTS idx_reminders_user_pending
  ON reminders(user_id, is_sent, remind_at)
  WHERE is_sent = false;

-- Habit streaks: joined by habit_id but also filtered by user
CREATE INDEX IF NOT EXISTS idx_habit_streaks_user_habit
  ON habit_streaks(user_id, habit_id);
