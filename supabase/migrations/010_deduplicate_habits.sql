-- Migration 010: Deduplicate habits and add unique constraint
-- Problem: habits table has no unique constraint on (user_id, name),
-- allowing duplicate habits to be created during onboarding retries.

-- Step 1: Delete duplicate habits, keeping only the oldest one per (user_id, name).
-- We keep the oldest because it has the most check-in history.
DELETE FROM habit_streaks
WHERE habit_id IN (
    SELECT h.id FROM habits h
    WHERE h.id NOT IN (
        SELECT DISTINCT ON (user_id, name) id
        FROM habits
        ORDER BY user_id, name, created_at ASC
    )
);

DELETE FROM habit_checkins
WHERE habit_id IN (
    SELECT h.id FROM habits h
    WHERE h.id NOT IN (
        SELECT DISTINCT ON (user_id, name) id
        FROM habits
        ORDER BY user_id, name, created_at ASC
    )
);

DELETE FROM habits
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, name) id
    FROM habits
    ORDER BY user_id, name, created_at ASC
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE habits
ADD CONSTRAINT habits_user_id_name_key UNIQUE (user_id, name);
