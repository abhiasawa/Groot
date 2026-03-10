/**
 * Card color palette — mymind-inspired soft pastels.
 * When backend provides `card_category`, we use it directly.
 * Otherwise, we deterministically assign a color based on content
 * so each card always gets a consistent, varied pastel.
 */

const PALETTE = [
  { bg: "#E8F0FE", meta: "#5B8BD4" },  // Periwinkle blue
  { bg: "#FFF5E1", meta: "#D09840" },  // Warm honey
  { bg: "#E6F7ED", meta: "#49A76C" },  // Sage green
  { bg: "#FDE8EE", meta: "#D4607A" },  // Dusty rose
  { bg: "#F0ECF9", meta: "#8B78B8" },  // Soft lavender
  { bg: "#FEF3E2", meta: "#C88B4A" },  // Peach
  { bg: "#E5F6F6", meta: "#4A9E9E" },  // Teal mist
  { bg: "#F5EEF8", meta: "#9B72B0" },  // Orchid
] as const;

export const CARD_COLORS = {
  task: PALETTE[0],
  idea: PALETTE[1],
  reflection: PALETTE[2],
  emotion: PALETTE[3],
  media: PALETTE[4],
} as const;

export type CardCategory = keyof typeof CARD_COLORS;

/** Simple hash of a string to a number */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Get card color. Uses backend category if available,
 * otherwise assigns a deterministic pastel based on the memory ID.
 */
export function getCardColor(category?: string | null, memoryId?: string) {
  if (category && category in CARD_COLORS) {
    return CARD_COLORS[category as CardCategory];
  }
  // Deterministic color from memory ID so each card is always the same color
  if (memoryId) {
    return PALETTE[hashCode(memoryId) % PALETTE.length];
  }
  return PALETTE[0];
}
