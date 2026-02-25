-- Soft-delete all habits except "Gym"
-- This marks them as inactive so they won't show in the app
UPDATE habits
SET is_active = false, updated_at = NOW()
WHERE LOWER(name) != 'gym'
  AND is_active = true;
