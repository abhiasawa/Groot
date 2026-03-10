/**
 * Card color palette — mymind-inspired soft pastels.
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

// ── Lightweight client-side classifier ──────────────────────
// Runs when backend hasn't set card_category yet.
// Each category has trigger words — first match wins.

const TASK_WORDS = /\b(todo|task|remind|buy|pick up|schedule|deadline|meeting|call|email|submit|fix|finish|complete|appointment|errand|grocery|list)\b/i;
const IDEA_WORDS = /\b(idea|thought|what if|maybe|could|concept|brainstorm|imagine|wonder|inspiration|vision|plan|strategy|design|build|create|invent|project)\b/i;
const REFLECTION_WORDS = /\b(realized|learned|grateful|thankful|appreciate|reflect|journal|looking back|thinking about|noticed|insight|growth|lesson|progress|remember when|today i)\b/i;
const EMOTION_WORDS = /\b(feel|feeling|happy|sad|angry|anxious|worried|excited|stressed|overwhelmed|frustrated|love|miss|afraid|nervous|grateful|proud|lonely|tired|scared|hurt|upset|joy|peace|calm)\b/i;

function classifyContent(text: string, messageType: string): CardCategory | null {
  if (messageType === "audio" || messageType === "image") return "media";
  if (!text) return null;
  if (TASK_WORDS.test(text)) return "task";
  if (EMOTION_WORDS.test(text)) return "emotion";
  if (REFLECTION_WORDS.test(text)) return "reflection";
  if (IDEA_WORDS.test(text)) return "idea";
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
