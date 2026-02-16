-- Add explicit Supabase Auth linkage to internal users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
ON users(auth_user_id);

-- Remove permissive catch-all policies from initial bootstrap
DROP POLICY IF EXISTS "Service role full access" ON users;
DROP POLICY IF EXISTS "Service role full access" ON user_profile;
DROP POLICY IF EXISTS "Service role full access" ON messages;
DROP POLICY IF EXISTS "Service role full access" ON sessions;
DROP POLICY IF EXISTS "Service role full access" ON habits;
DROP POLICY IF EXISTS "Service role full access" ON habit_checkins;
DROP POLICY IF EXISTS "Service role full access" ON habit_streaks;
DROP POLICY IF EXISTS "Service role full access" ON weekly_reports;
DROP POLICY IF EXISTS "Service role full access" ON contacts;
DROP POLICY IF EXISTS "Service role full access" ON tasks;
DROP POLICY IF EXISTS "Service role full access" ON reminders;
DROP POLICY IF EXISTS "Service role full access" ON processed_messages;
DROP POLICY IF EXISTS "Service role full access" ON api_usage;
DROP POLICY IF EXISTS "Service role full access" ON message_queue;

-- Users can only read/update their linked row
CREATE POLICY "users_select_own"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

CREATE POLICY "users_update_own"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- User profile
CREATE POLICY "user_profile_all_own"
ON user_profile
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

-- Messages
CREATE POLICY "messages_all_own"
ON messages
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

-- Sessions
CREATE POLICY "sessions_all_own"
ON sessions
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

-- Habits
CREATE POLICY "habits_all_own"
ON habits
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

-- Habit check-ins
CREATE POLICY "habit_checkins_all_own"
ON habit_checkins
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

-- Habit streaks
CREATE POLICY "habit_streaks_all_own"
ON habit_streaks
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

-- Weekly reports
CREATE POLICY "weekly_reports_all_own"
ON weekly_reports
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

-- Contacts
CREATE POLICY "contacts_all_own"
ON contacts
FOR ALL
TO authenticated
USING (
  owner_user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  owner_user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

-- Tasks
CREATE POLICY "tasks_all_own"
ON tasks
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

-- Reminders
CREATE POLICY "reminders_all_own"
ON reminders
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);
