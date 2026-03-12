/**
 * Card color palette — warm journal aesthetic.
 * When backend provides `card_category`, we use it directly.
 * Otherwise, classifyContent() does lightweight keyword matching
 * to assign semantic colors. Falls back to ID-based hash.
 */

const PALETTE = [
  { bg: "#E8F0FE", meta: "#5B8BD4" },  // Periwinkle blue  — tasks
  { bg: "#FFF5E1", meta: "#D09840" },  // Warm honey       — ideas
  { bg: "#E6F7ED", meta: "#49A76C" },  // Sage green       — reflections
  { bg: "#FDE8EE", meta: "#D4607A" },  // Dusty rose       — emotions
  { bg: "#F0ECF9", meta: "#8B78B8" },  // Soft lavender    — media
  { bg: "#FEF3E2", meta: "#C88B4A" },  // Peach
  { bg: "#E5F6F6", meta: "#4A9E9E" },  // Teal mist
  { bg: "#FFF8E8", meta: "#B8860B" },  // Amber gold
  { bg: "#E8F5E9", meta: "#5C8A5C" },  // Moss green
  { bg: "#FCE4EC", meta: "#C4536A" },  // Coral pink
] as const;

export const CARD_COLORS = {
  task: PALETTE[0],
  idea: PALETTE[1],
  reflection: PALETTE[2],
  emotion: PALETTE[3],
  media: PALETTE[4],
} as const;

export type CardCategory = keyof typeof CARD_COLORS;

// ── Emotion colors (for analytics bar chart) ────────────────
export const EMOTION_COLORS = {
  happy: "#FFBB2C",
  sad: "#764539",
  calm: "#8AA230",
  anxious: "#787163",
} as const;

export type EmotionType = keyof typeof EMOTION_COLORS;

// ── Quick journal prompt card backgrounds ────────────────────
export const PROMPT_COLORS = {
  rose: "#F3D3CC",
  lavender: "#E1D8FF",
  stone: "#DDDBCE",
} as const;

// ── Tag pill accent colors ──────────────────────────────────
export const TAG_COLORS = {
  personal: "#EE2336",
  family: "#803EF2",
} as const;

/** Hash using characters spread across the UUID for better distribution */
function hashCode(s: string): number {
  // UUIDs have hex chars at varied positions — sample several for spread
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  // Mix bits for better distribution
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return h >>> 0;
}

// ── Lightweight client-side classifier ──────────────────────
// Runs when backend hasn't set card_category yet.
// Each category has trigger words — first match wins.

const TASK_WORDS = /\b(todo|task|remind|buy|pick up|schedule|deadline|meeting|call|email|submit|fix|finish|complete|appointment|errand|grocery|list)\b/i;
const IDEA_WORDS = /\b(idea|thought|what if|maybe|could|concept|brainstorm|imagine|wonder|inspiration|vision|plan|strategy|design|build|create|invent|project)\b/i;
const REFLECTION_WORDS = /\b(realized|learned|grateful|thankful|appreciate|reflect|journal|looking back|thinking about|noticed|insight|growth|lesson|progress|remember when|today i)\b/i;
const EMOTION_WORDS = /\b(feel|feeling|happy|sad|angry|anxious|worried|excited|stressed|overwhelmed|frustrated|love|miss|afraid|nervous|grateful|proud|lonely|tired|scared|hurt|upset|joy|peace|calm)\b/i;

function classifyContent(text: string, messageType: string): CardCategory | null {
  const isMedia = messageType === "audio" || messageType === "image";
  // Try semantic classification on transcription/description text first
  if (text) {
    if (TASK_WORDS.test(text)) return "task";
    if (EMOTION_WORDS.test(text)) return "emotion";
    if (REFLECTION_WORDS.test(text)) return "reflection";
    if (IDEA_WORDS.test(text)) return "idea";
  }
  // Only fall back to "media" when there's no semantic match
  if (isMedia) return "media";
  return null;
}

/**
 * Get card color. Priority:
 * 1. Backend-assigned category
 * 2. Client-side content classification
 * 3. Deterministic hash from memory ID
 */
export function getCardColor(
  category?: string | null,
  memoryId?: string,
  content?: string,
  messageType?: string,
) {
  // 1. Backend category
  if (category && category in CARD_COLORS) {
    return CARD_COLORS[category as CardCategory];
  }
  // 2. Client-side classification
  if (content || messageType) {
    const classified = classifyContent(content || "", messageType || "text");
    if (classified) return CARD_COLORS[classified];
  }
  // 3. Deterministic color from memory ID
  if (memoryId) {
    return PALETTE[hashCode(memoryId) % PALETTE.length];
  }
  return PALETTE[0];
}
