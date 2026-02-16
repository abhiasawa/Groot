import { getLLMProvider } from "@/lib/providers/llm";
import { getGrootSystemPrompt } from "./persona";
import { buildContext } from "./context-builder";
import { upsertProfileFacts } from "@/lib/memory/profile-builder";
import { logger } from "@/lib/logger";
import type { ProfileFact } from "@/lib/memory/profile-builder";

export interface GrootResponse {
  text: string;
  detectedMood?: string;
  shouldStoreMemory: boolean;
  memoryTags: string[];
  profileUpdates: ProfileFact[];
  detectedDates: Array<{ date: string; event: string }>;
}

/**
 * Groot Engine — generates AI responses with the Groot persona.
 *
 * Pipeline:
 * 1. Build context (short-term + long-term memories + profile)
 * 2. Assemble system prompt with persona + profile
 * 3. Call LLM provider (with circuit breaker fallback)
 * 4. Process metadata (profile updates, mood, dates)
 * 5. Return metadata for caller-side actions (memory/reminders)
 */
export async function generateGrootResponse(
  userId: string,
  currentMessage: string,
  userName: string | null,
): Promise<GrootResponse> {
  // 1. Build context
  const context = await buildContext(userId, currentMessage, userName);

  // 2. Assemble system prompt
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const systemPrompt = getGrootSystemPrompt(
    context.userName,
    context.profileSummary,
    currentDate,
  );

  // 3. Call LLM
  const provider = getLLMProvider();
  const response = await provider.generateResponse(systemPrompt, context.messages, {
    maxTokens: 1024,
    temperature: 0.7,
  });

  logger.info(
    {
      userId,
      provider: provider.name,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
    },
    "Groot response generated",
  );

  // 4. Process metadata
  const metadata = response.metadata;
  const profileUpdates: ProfileFact[] = (metadata?.profileUpdates ?? []).map((u) => ({
    category: u.category as ProfileFact["category"],
    key: u.key,
    value: u.value,
    confidence: 0.8,
    source: "ai_extraction",
  }));

  // Apply profile updates
  if (profileUpdates.length > 0) {
    await upsertProfileFacts(userId, profileUpdates);
  }

  return {
    text: response.text,
    detectedMood: metadata?.detectedMood,
    shouldStoreMemory: metadata?.shouldStoreMemory ?? false,
    memoryTags: metadata?.memoryTags ?? [],
    profileUpdates,
    detectedDates: metadata?.detectedDates ?? [],
  };
}

/**
 * Generate a response for error states — still in Groot's voice.
 */
export function getErrorResponse(): string {
  const responses = [
    "_Hmm, my brain is a bit foggy right now._ I've saved your message and I'll process it soon.",
    "_Something went wrong on my end._ Your message is safe — I'll get back to you shortly.",
    "_I hit a snag._ Give me a moment and try again.",
  ];
  return responses[Math.floor(Math.random() * responses.length)]!;
}
