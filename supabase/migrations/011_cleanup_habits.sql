-- Migration 011: Clean up habits table — remove all except "Weight" related habits
-- This is a data cleanup migration requested by the user.

-- First, delete checkins and streaks for habits that are NOT weight-related
DELETE FROM habit_checkins
WHERE habit_id IN (
    SELECT id FROM habits
    WHERE LOWER(name) NOT LIKE '%weight%'
);

DELETE FROM habit_streaks
WHERE habit_id IN (
    SELECT id FROM habits
    WHERE LOWER(name) NOT LIKE '%weight%'
);

-- Now delete the non-weight habits themselves
DELETE FROM habits
WHERE LOWER(name) NOT LIKE '%weight%';
