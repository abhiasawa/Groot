import type { ThemeColors } from "../lib/theme/tokens";

/**
 * Human-readable labels for numeric mood scores (1-5).
 */
export const MOOD_LABELS: Record<number, string> = {
  5: "Great",
  4: "Good",
  3: "Okay",
  2: "Low",
  1: "Bad",
};

/**
 * Return the theme mood color for a numeric score (1-5).
 * Falls back to moodNone for unknown scores.
 */
export function getMoodColor(score: number, colors: ThemeColors): string {
  switch (score) {
    case 5:
      return colors.moodGreat;
    case 4:
      return colors.moodGood;
    case 3:
      return colors.moodOkay;
    case 2:
      return colors.moodLow;
    case 1:
      return colors.moodBad;
    default:
      return colors.moodNone;
  }
}

/**
 * Map a free-text mood name to its theme color.
 *
 * Groupings:
 *  - Great: happy, excited, amazing, fantastic, wonderful, great, elated, thrilled
 *  - Good:  good, calm, content, peaceful, relaxed, grateful, hopeful, optimistic
 *  - Okay:  okay, fine, neutral, meh, alright, so-so
 *  - Low:   low, tired, stressed, anxious, worried, overwhelmed, frustrated, down
 *  - Bad:   bad, sad, angry, terrible, awful, miserable, depressed, devastated
 */
export function getMoodColorFromName(
  mood: string,
  colors: ThemeColors,
): string {
  const normalized = mood.toLowerCase().trim();

  const great = new Set([
    "happy",
    "excited",
    "amazing",
    "fantastic",
    "wonderful",
    "great",
    "elated",
    "thrilled",
  ]);

  const good = new Set([
    "good",
    "calm",
    "content",
    "peaceful",
    "relaxed",
    "grateful",
    "hopeful",
    "optimistic",
  ]);

  const okay = new Set([
    "okay",
    "fine",
    "neutral",
    "meh",
    "alright",
    "so-so",
  ]);

  const low = new Set([
    "low",
    "tired",
    "stressed",
    "anxious",
    "worried",
    "overwhelmed",
    "frustrated",
    "down",
  ]);

  const bad = new Set([
    "bad",
    "sad",
    "angry",
    "terrible",
    "awful",
    "miserable",
    "depressed",
    "devastated",
  ]);

  if (great.has(normalized)) return colors.moodGreat;
  if (good.has(normalized)) return colors.moodGood;
  if (okay.has(normalized)) return colors.moodOkay;
  if (low.has(normalized)) return colors.moodLow;
  if (bad.has(normalized)) return colors.moodBad;

  return colors.moodNone;
}
