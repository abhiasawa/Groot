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
    maxTokens: 4096,
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
    category: normalizeProfileCategory(u.category),
    key: normalizeProfileKey(u.key),
    value: u.value,
    confidence: 0.8,
    source: "ai_extraction",
  }));

  // Deduplicate profile updates (same category+key = keep last)
  const deduped = new Map<string, ProfileFact>();
  for (const fact of profileUpdates) {
    deduped.set(`${fact.category}:${fact.key}`, fact);
  }

  // Apply profile updates (deduplicated)
  const dedupedUpdates = [...deduped.values()];
  if (dedupedUpdates.length > 0) {
    await upsertProfileFacts(userId, dedupedUpdates);
  }

  return {
    text: response.text,
    detectedMood: metadata?.detectedMood,
    shouldStoreMemory: metadata?.shouldStoreMemory ?? false,
    memoryTags: metadata?.memoryTags ?? [],
    profileUpdates: dedupedUpdates,
    detectedDates: metadata?.detectedDates ?? [],
  };
}

// ─── Helpers ───

const CATEGORY_MAP: Record<string, ProfileFact["category"]> = {
  static: "static",
  dynamic: "dynamic",
  preference: "preference",
  goal: "goal",
  health: "dynamic",
  habit: "dynamic",
  activity: "dynamic",
  fitness: "dynamic",
  relationships: "static",
  relationship: "static",
  personal: "static",
  hobby: "static",
};

function normalizeProfileCategory(raw: string): ProfileFact["category"] {
  return CATEGORY_MAP[raw.toLowerCase()] ?? "dynamic";
}

function normalizeProfileKey(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/**
 * Generate a response for error states — still in Groot's voice.
 */
export function getErrorResponse(): string {
  const responses = [
    "_Something tripped me up._ Your message is safe — try again in a sec.",
    "_My bad, hit a snag._ Send that again?",
    "_Glitched for a moment there._ I've got your message, give me another shot.",
  ];
  return responses[Math.floor(Math.random() * responses.length)]!;
}
