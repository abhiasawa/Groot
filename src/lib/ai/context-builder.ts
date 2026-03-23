import { getRecentMessages } from "@/lib/memory/short-term";
import { searchMemories } from "@/lib/memory/supermemory-client";
import { getUserProfileSummary } from "@/lib/memory/profile-builder";
import { getPendingTasksForContext } from "@/lib/tasks/context";
import { logger } from "@/lib/logger";
import type { LLMMessage } from "@/lib/providers/types";

/**
 * Context builder — assembles the full context for an AI response.
 *
 * Gathers from 3 sources in parallel:
 * 1. Short-term messages (last 10 from Supabase — includes current message)
 * 2. Long-term memories (semantic search from Supermemory)
 * 3. User profile (from user_profile table)
 */

export interface BuiltContext {
  messages: LLMMessage[];
  profileSummary: string;
  relevantMemories: string[];
  userName: string | null;
}

export async function buildContext(
  userId: string,
  currentMessage: string,
  userName: string | null,
): Promise<BuiltContext> {
  const recentLimit = parsePositiveInt(process.env.WHATSAPP_CONTEXT_RECENT_LIMIT, 6);
  const memoryLimit = parsePositiveInt(process.env.WHATSAPP_MEMORY_SEARCH_LIMIT, 2);

  const tRecent = Date.now();
  const recentPromise = getRecentMessages(userId, recentLimit).then((recentMessages) => ({
    recentMessages,
    recentMs: Date.now() - tRecent,
  }));
  const tMemory = Date.now();
  const memoryPromise = searchMemories(currentMessage, userId, memoryLimit)
    .then((relevantMemories) => ({
      relevantMemories,
      memoryMs: Date.now() - tMemory,
    }))
    .catch((error) => {
      logger.warn({ error }, "Supermemory search failed, continuing without long-term context");
      return {
        relevantMemories: [],
        memoryMs: Date.now() - tMemory,
      };
    });
  const tProfile = Date.now();
  const profilePromise = getUserProfileSummary(userId).then((profileSummary) => ({
    profileSummary,
    profileMs: Date.now() - tProfile,
  }));

  // Conditionally kick off task fetch in parallel with other sources
  const taskKeywords = /\b(task|tasks|todo|to-do|to do|list|pending|overdue|done|complete|finish|mark|what do i need|what's on my|my list)\b/i;
  const taskPromise = taskKeywords.test(currentMessage)
    ? getPendingTasksForContext(userId).catch((error) => {
        logger.warn({ error }, "Task context fetch failed, continuing without tasks");
        return [];
      })
    : Promise.resolve([]);

  // Fetch all context sources in parallel (lean defaults keep WhatsApp replies fast)
  const [{ recentMessages, recentMs }, { relevantMemories, memoryMs }, { profileSummary, profileMs }, pendingTasks] = await Promise.all([
    recentPromise,
    memoryPromise,
    profilePromise,
    taskPromise,
  ]);

  // Build conversation messages for the LLM
  const messages: LLMMessage[] = [];

  // Add pending tasks as context when available
  if (pendingTasks.length > 0) {
    const taskList = pendingTasks.map((t) => {
      const parts = [`• ${t.content}`];
      if (t.category && t.category !== "todo") parts.push(`[${t.category}]`);
      if (t.due_date) {
        const d = new Date(t.due_date);
        parts.push(`(due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`);
      }
      return parts.join(" ");
    }).join("\n");
    messages.push({
      role: "system",
      content: `The user's current pending tasks:\n${taskList}`,
    });
  }

  // Add relevant long-term memories as context
  if (relevantMemories.length > 0) {
    const memoryContext = relevantMemories
      .map((m) => `• ${m.content}`)
      .join("\n");
    messages.push({
      role: "system",
      content: `Relevant memories about the user:\n${memoryContext}`,
    });
  }

  // Add recent conversation history
  for (const msg of recentMessages) {
    let content: string;

    if (msg.media_description && msg.direction === "inbound") {
      // For media messages, include the AI-generated description so Groot
      // knows what the image/audio contains, plus any user caption
      const parts: string[] = [];
      parts.push(`[Image: ${msg.media_description}]`);
      if (msg.content) parts.push(`[User caption: ${msg.content}]`);
      content = parts.join("\n");
    } else {
      content = msg.content || msg.media_description || "";
    }

    if (!content) continue;

    messages.push({
      role: msg.direction === "inbound" ? "user" : "assistant",
      content,
    });
  }

  // Note: currentMessage is NOT added explicitly here because it's already
  // stored in the messages table before this call (storeInboundMessage is awaited
  // before generateGrootResponse). This also supports message batching — when
  // multiple rapid messages arrive, all appear naturally in stored messages.

  logger.info(
    {
      userId,
      recentMessages: recentMessages.length,
      longTermMemories: relevantMemories.length,
      profileLength: profileSummary.length,
      totalLLMMessages: messages.length,
      recentFetchMs: recentMs,
      memorySearchMs: memoryMs,
      profileFetchMs: profileMs,
    },
    "Context built",
  );

  return {
    messages,
    profileSummary,
    relevantMemories: relevantMemories.map((m) => m.content),
    userName,
  };
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
