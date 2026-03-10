/**
 * AI-assigned card color palette.
 * Backend sets `card_category` on each memory; we map it to a pastel.
 * Falls back to neutral gray for unknown categories.
 */

export const CARD_COLORS = {
  task: { bg: "#EEF4FF", meta: "#7BA3E0" },      // Soft blue
  idea: { bg: "#FFF8ED", meta: "#D4A053" },       // Warm amber
  reflection: { bg: "#EEFBF0", meta: "#5CB88A" }, // Gentle green
  emotion: { bg: "#FFF0F3", meta: "#E0728A" },    // Soft rose
  media: { bg: "#F5F5F5", meta: "#BBBBBB" },      // Neutral gray
  default: { bg: "#F5F5F5", meta: "#BBBBBB" },
} as const;

export type CardCategory = keyof typeof CARD_COLORS;

export function getCardColor(category?: string | null) {
  if (category && category in CARD_COLORS) {
    return CARD_COLORS[category as CardCategory];
  }
  return CARD_COLORS.default;
}
