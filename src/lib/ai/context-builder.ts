import { getRecentMessages } from "@/lib/memory/short-term";
import { searchMemories } from "@/lib/memory/supermemory-client";
import { getUserProfileSummary } from "@/lib/memory/profile-builder";
import { logger } from "@/lib/logger";
import type { LLMMessage } from "@/lib/providers/types";

/**
 * Context builder — assembles the full context for an AI response.
 *
 * Gathers from 4 sources in parallel:
 * 1. Short-term messages (last 20 from Supabase)
 * 2. Long-term memories (semantic search from Supermemory)
 * 3. User profile (from user_profile table)
 * 4. Current message
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
  // Fetch all context sources in parallel
  const [recentMessages, relevantMemories, profileSummary] = await Promise.all([
    getRecentMessages(userId, 20),
    searchMemories(currentMessage, userId, 5).catch((error) => {
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

  // Add current message
  messages.push({
    role: "user",
    content: currentMessage,
  });

  return {
    messages,
    profileSummary,
    relevantMemories: relevantMemories.map((m) => m.content),
    userName,
  };
}
