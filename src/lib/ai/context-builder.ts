import { getRecentMessages } from "@/lib/memory/short-term";
import { searchMemories } from "@/lib/memory/supermemory-client";
import { getUserProfileSummary } from "@/lib/memory/profile-builder";
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
  // Fetch all context sources in parallel (10 messages keeps LLM fast + cheap)
  const [recentMessages, relevantMemories, profileSummary] = await Promise.all([
    getRecentMessages(userId, 10),
    searchMemories(currentMessage, userId, 3).catch((error) => {
      logger.warn({ error }, "Supermemory search failed, continuing without long-term context");
      return [];
    }),
    getUserProfileSummary(userId),
  ]);

  // Build conversation messages for the LLM
  const messages: LLMMessage[] = [];

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
    const content = msg.content || msg.media_description || "";
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

  return {
    messages,
    profileSummary,
    relevantMemories: relevantMemories.map((m) => m.content),
    userName,
  };
}
