import { getActiveHabits, type Habit } from "./tracker";
import { logger } from "@/lib/logger";

/**
 * Bare number parser — detects when a user sends just a number
 * and matches it to the most likely habit based on context.
 *
 * Examples:
 * - "80.2" after morning check-in → weight
 * - "7" → sleep hours (if user tracks sleep)
 * - "5000" → steps
 *
 * Matching logic:
 * 1. Check if there's only one active habit with a target_unit — match it
 * 2. If multiple, use value range heuristics to narrow down
 * 3. If still ambiguous, return null (let AI handle it)
 */

export interface BareNumberMatch {
  habit: Habit;
  value: number;
  unit: string | null;
}

const VALUE_RANGES: Record<string, { min: number; max: number }> = {
  kg: { min: 20, max: 200 },
  lbs: { min: 50, max: 450 },
  steps: { min: 100, max: 100000 },
  km: { min: 0.1, max: 50 },
  mi: { min: 0.1, max: 30 },
  hours: { min: 0, max: 24 },
  mins: { min: 0, max: 1440 },
  minutes: { min: 0, max: 1440 },
  cups: { min: 0, max: 30 },
  glasses: { min: 0, max: 30 },
  pages: { min: 1, max: 2000 },
  cal: { min: 100, max: 10000 },
  calories: { min: 100, max: 10000 },
  reps: { min: 1, max: 1000 },
  sets: { min: 1, max: 100 },
};

/**
 * Try to match a bare number to a habit.
 * Returns the matched habit + value, or null if no match.
 */
export async function matchBareNumber(
  userId: string,
  text: string,
): Promise<BareNumberMatch | null> {
  // Extract number and optional unit
  const match = text.trim().match(
    /^(\d+(?:\.\d+)?)\s*(kg|lbs?|steps?|km|mi|hours?|hrs?|mins?|minutes?|cups?|glasses?|pages?|cal|calories?|reps?|sets?)?$/i,
  );

  if (!match?.[1]) return null;

  const value = parseFloat(match[1]);
  const unit = normalizeUnit(match[2] ?? null);

  // Get user's active habits
  const habits = await getActiveHabits(userId);
  if (habits.length === 0) return null;

  // If unit is specified, match directly
  if (unit) {
    const matching = habits.find(
      (h) => h.target_unit?.toLowerCase() === unit.toLowerCase(),
    );
    if (matching) {
      return { habit: matching, value, unit };
    }
  }

  // If only one habit has a target_value, it's likely the match
  const habitsWithTargets = habits.filter((h) => h.target_unit);
  if (habitsWithTargets.length === 1) {
    const habit = habitsWithTargets[0]!;
    return { habit, value, unit: habit.target_unit };
  }

  // Use value range heuristics
  for (const habit of habitsWithTargets) {
    const targetUnit = habit.target_unit?.toLowerCase();
    if (!targetUnit) continue;

    const range = VALUE_RANGES[targetUnit];
    if (range && value >= range.min && value <= range.max) {
      return { habit, value, unit: habit.target_unit };
    }
  }

  logger.debug({ userId, value, unit }, "Could not match bare number to habit");
  return null;
}

function normalizeUnit(unit: string | null): string | null {
  if (!unit) return null;
  const lower = unit.toLowerCase();
  const map: Record<string, string> = {
    lb: "lbs",
    step: "steps",
    hour: "hours",
    hr: "hours",
    hrs: "hours",
    min: "mins",
    minute: "minutes",
    cup: "cups",
    glass: "glasses",
    page: "pages",
    calorie: "calories",
    rep: "reps",
    set: "sets",
  };
  return map[lower] ?? lower;
}
