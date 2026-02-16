ALTER TABLE habit_streaks
DROP CONSTRAINT IF EXISTS habit_streaks_habit_id_user_id_key;

ALTER TABLE habit_streaks
ADD CONSTRAINT habit_streaks_habit_id_user_id_key UNIQUE (habit_id, user_id);
