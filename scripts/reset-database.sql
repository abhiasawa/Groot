-- Groot Database Reset Script
-- Run this in Supabase SQL Editor to wipe ALL data for a fresh start.
-- WARNING: This deletes everything including user records.
-- After running this, your first message to Groot will re-onboard you.

-- Disable triggers temporarily for clean truncation
SET session_replication_role = 'replica';

-- Truncate all data tables (order matters due to foreign keys)
TRUNCATE TABLE memory_links CASCADE;
TRUNCATE TABLE habit_checkins CASCADE;
TRUNCATE TABLE habit_streaks CASCADE;
TRUNCATE TABLE habits CASCADE;
TRUNCATE TABLE weekly_reports CASCADE;
TRUNCATE TABLE reminders CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE contacts CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE processed_messages CASCADE;
TRUNCATE TABLE api_usage CASCADE;
TRUNCATE TABLE message_queue CASCADE;
TRUNCATE TABLE user_profile CASCADE;
TRUNCATE TABLE users CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify: should return 0 rows for each
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'habits', COUNT(*) FROM habits
UNION ALL SELECT 'reminders', COUNT(*) FROM reminders
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks;
