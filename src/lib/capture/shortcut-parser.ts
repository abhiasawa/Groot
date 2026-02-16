import { logger } from "@/lib/logger";

/**
 * Shortcut parser — detects prefix commands and routes them.
 * Runs BEFORE intent classifier for faster response time.
 *
 * Supported prefixes:
 * - todo: → Save to tasks
 * - idea: → Save to Supermemory with type=idea
 * - note: → Save to Supermemory with type=note
 * - remind: → Create a reminder
 */

export type ShortcutType = "todo" | "idea" | "note" | "remind";

export interface ParsedShortcut {
  type: ShortcutType;
  content: string;
  raw: string;
}

const SHORTCUT_REGEX = /^(todo|idea|note|remind):\s*(.+)/i;

/**
 * Try to parse a shortcut prefix from a message.
 * Returns null if no shortcut detected.
 */
export function parseShortcut(text: string): ParsedShortcut | null {
  const match = text.trim().match(SHORTCUT_REGEX);
  if (!match?.[1] || !match[2]) return null;

  const type = match[1].toLowerCase() as ShortcutType;
  const content = match[2].trim();

  if (!content) return null;

  logger.debug({ type, contentLength: content.length }, "Shortcut detected");

  return {
    type,
    content,
    raw: text,
  };
}

/**
 * Get the confirmation response for a shortcut action.
 */
export function getShortcutConfirmation(type: ShortcutType, content: string): string {
  switch (type) {
    case "todo":
      return `*Added to tasks:* ${content}`;
    case "idea":
      return `*Idea captured:* ${content} 💡`;
    case "note":
      return `*Note saved:* ${content} 📝`;
    case "remind":
      return `*Reminder set:* ${content} ⏰`;
  }
}
