import { logger } from "@/lib/logger";

/**
 * Memory Router — classifies user intent to route to the correct handler.
 *
 * Phase 3: Rule-based classification (fast, no AI cost).
 * Phase 5: Enhanced with AI classification for ambiguous messages.
 *
 * Intent types:
 * - store_memory: User wants Groot to remember something
 * - query_memory: User is asking about something stored
 * - habit_checkin: User is logging a habit value
 * - casual_chat: General conversation
 * - reflection: User is journaling/reflecting
 * - command: Explicit command (help, undo, settings, etc.)
 * - send_message: User wants to send a message to someone else
 * - capture_shortcut: Prefix command (todo:/idea:/note:/remind:)
 * - link_share: User shared a URL
 */

export type MessageIntent =
  | "store_memory"
  | "query_memory"
  | "habit_checkin"
  | "casual_chat"
  | "reflection"
  | "command"
  | "send_message"
  | "capture_shortcut"
  | "link_share";

export interface ClassifiedMessage {
  intent: MessageIntent;
  confidence: number;
  extractedData?: {
    shortcutType?: "todo" | "idea" | "note" | "remind";
    shortcutContent?: string;
    command?: string;
    url?: string;
    contactName?: string;
    messageContent?: string;
  };
}

// ─── Pattern matchers ───

const URL_REGEX = /https?:\/\/[^\s]+/i;

const SHORTCUT_REGEX = /^(todo|idea|note|remind):\s*(.+)/i;

const STORE_PATTERNS = [
  /^remember\b/i,
  /^save\b/i,
  /^don't forget\b/i,
  /^note that\b/i,
  /\bremember (this|that)\b/i,
  /\bmy .+ is\b/i,
  /\bi ('m|am) .+/i,
];

const QUERY_PATTERNS = [
  /^what('s| is| was) my\b/i,
  /^do you (remember|know|recall)\b/i,
  /^when did i\b/i,
  /^where did i\b/i,
  /^who is my\b/i,
  /^what did i (say|tell|mention)\b/i,
  /\bdo you remember\b/i,
];

const COMMAND_PATTERNS = [
  /^help$/i,
  /^undo$/i,
  /^settings$/i,
  /^status$/i,
  /^export$/i,
];

const SEND_PATTERNS = [
  /^(send|tell|message|text)\s+\w+/i,
  /\blet .+ know\b/i,
  /\bsend a message to\b/i,
  /\btext .+ (saying|that)\b/i,
];

const HABIT_PATTERNS = [
  /^\d+(\.\d+)?\s*(kg|lbs?|km|mi|mins?|minutes?|hours?|steps?|cal|calories|cups?|glasses?|pages?|reps?|sets?)?\s*$/i,
  /\b(tracked|logged|done|completed|finished|checked)\b/i,
];

const REFLECTION_PATTERNS = [
  /\bfeeling\b/i,
  /\bi feel\b/i,
  /\bgrateful\b/i,
  /\bthankful\b/i,
  /\breflecting\b/i,
  /\btoday was\b/i,
  /\bmy day\b/i,
];

/**
 * Classify a message's intent using rule-based patterns.
 * Fast path — no AI cost. Returns confidence 0-1.
 */
export function classifyIntent(text: string): ClassifiedMessage {
  const trimmed = text.trim();

  // 1. Check shortcut prefixes first (highest priority, fastest path)
  const shortcutMatch = trimmed.match(SHORTCUT_REGEX);
  if (shortcutMatch) {
    return {
      intent: "capture_shortcut",
      confidence: 1.0,
      extractedData: {
        shortcutType: shortcutMatch[1]!.toLowerCase() as "todo" | "idea" | "note" | "remind",
        shortcutContent: shortcutMatch[2]!.trim(),
      },
    };
  }

  // 2. Check for URLs
  const urlMatch = trimmed.match(URL_REGEX);
  if (urlMatch) {
    return {
      intent: "link_share",
      confidence: 0.95,
      extractedData: { url: urlMatch[0] },
    };
  }

  // 3. Check explicit commands
  for (const pattern of COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        intent: "command",
        confidence: 1.0,
        extractedData: { command: trimmed.toLowerCase() },
      };
    }
  }

  // 4. Check send-on-behalf patterns
  for (const pattern of SEND_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        intent: "send_message",
        confidence: 0.8,
      };
    }
  }

  // 5. Check query patterns
  for (const pattern of QUERY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { intent: "query_memory", confidence: 0.85 };
    }
  }

  // 6. Check store patterns
  for (const pattern of STORE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { intent: "store_memory", confidence: 0.8 };
    }
  }

  // 7. Check habit patterns
  for (const pattern of HABIT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { intent: "habit_checkin", confidence: 0.7 };
    }
  }

  // 8. Check reflection patterns
  for (const pattern of REFLECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { intent: "reflection", confidence: 0.6 };
    }
  }

  // Default: casual chat
  return { intent: "casual_chat", confidence: 0.5 };
}

/**
 * Determine if a message should be stored in long-term memory (Supermemory).
 * Not all messages are worth storing — casual greetings, bare acknowledgements, etc. are skipped.
 */
export function shouldStoreInLongTerm(text: string, intent: MessageIntent): boolean {
  // Always store these intents
  if (["store_memory", "reflection", "capture_shortcut"].includes(intent)) {
    return true;
  }

  // Skip very short messages (greetings, single-word)
  if (text.trim().length < 10) {
    return false;
  }

  // Skip bare habit check-ins (just numbers)
  if (intent === "habit_checkin") {
    return false;
  }

  // For casual chat, store if message has substantive content (>30 chars)
  if (intent === "casual_chat" && text.trim().length > 30) {
    return true;
  }

  return false;
}
