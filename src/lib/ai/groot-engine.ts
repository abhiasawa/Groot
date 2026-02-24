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
  detectedTasks: Array<{ content: string; category?: string; dueDate?: string }>;
  lastImageRequest: boolean;
  timings: {
    contextMs: number;
    llmMs: number;
    profileUpsertMs: number;
    totalMs: number;
  };
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
  isNewUser: boolean = false,
): Promise<GrootResponse> {
  const t0 = Date.now();
  logger.info({ userId, isNewUser, messageLength: currentMessage.length }, "Groot engine started");

  // 1. Build context
  const context = await buildContext(userId, currentMessage, userName);
  const t1 = Date.now();

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
    isNewUser,
  );

  // 3. Call LLM
  const provider = getLLMProvider();
  const maxTokens = parsePositiveInt(process.env.WHATSAPP_RESPONSE_MAX_TOKENS, 512);
  const response = await provider.generateResponse(systemPrompt, context.messages, {
    maxTokens,
    temperature: 0.7,
  });
  const t2 = Date.now();

  logger.info(
    {
      userId,
      provider: provider.name,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      contextMs: t1 - t0,
      llmMs: t2 - t1,
    },
    "Groot response generated",
  );

  // 4. Process metadata — LLM is the sole source of profile extraction
  const metadata = response.metadata;
  const profileUpdates: ProfileFact[] = (metadata?.profileUpdates ?? []).map((u) => ({
    category: normalizeProfileCategory(u.category),
    key: normalizeProfileKey(u.key),
    value: u.value,
    confidence: 0.8,
    source: "ai_extraction",
  }));

  // Upsert LLM-extracted profile facts
  if (profileUpdates.length > 0) {
    logger.info(
      { userId, updates: profileUpdates.map((u) => `${u.category}:${u.key}=${u.value}`) },
      "Upserting LLM-extracted profile updates",
    );
    // Don't block the user-facing reply on profile persistence.
    upsertProfileFacts(userId, profileUpdates).catch((error) => {
      logger.warn({ error, userId }, "Profile upsert failed");
    });
  }

  // Process detected people into user_profile with category "people"
  const detectedPeople = metadata?.detectedPeople ?? [];
  if (detectedPeople.length > 0) {
    const peopleFacts: ProfileFact[] = detectedPeople.map((person) => ({
      category: "people" as const,
      key: person.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
      value: JSON.stringify({
        name: person.name,
        relationship: person.relationship ?? null,
        context: person.context ?? null,
      }),
      confidence: 0.8,
      source: "ai_extraction",
    }));

    logger.info(
      { userId, people: detectedPeople.map((p) => p.name) },
      "Upserting detected people from metadata",
    );
    // Don't block the user-facing reply on people persistence.
    upsertProfileFacts(userId, peopleFacts).catch((error) => {
      logger.warn({ error, userId }, "People upsert failed");
    });
  }

  // Store detected email on the user record as profile data.
  // (Login is handled via WhatsApp OTP — email is optional profile info.)
  const detectedEmail = metadata?.detectedEmail;
  if (detectedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(detectedEmail)) {
    const normalizedEmail = detectedEmail.toLowerCase();
    const supabase = (await import("@/lib/supabase/server")).getSupabaseAdmin();

    const { error } = await supabase
      .from("users")
      .update({ email: normalizedEmail })
      .eq("id", userId)
      .is("email", null); // Only set if not already stored

    if (error) {
      logger.warn({ error, userId, detectedEmail }, "Failed to store detected email");
    } else {
      logger.info({ userId, detectedEmail }, "Stored user email from conversation");
    }
  }

  const t3 = Date.now();
  logger.info(
    {
      userId,
      mood: metadata?.detectedMood,
      shouldStore: metadata?.shouldStoreMemory ?? false,
      tags: metadata?.memoryTags,
      dates: metadata?.detectedDates?.length ?? 0,
      tasks: metadata?.detectedTasks?.length ?? 0,
      people: detectedPeople.length,
      detectedEmail: detectedEmail ?? null,
      profileUpdates: profileUpdates.length,
      responseLength: response.text.length,
      contextMs: t1 - t0,
      llmMs: t2 - t1,
      profileUpsertMs: t3 - t2,
      totalMs: t3 - t0,
    },
    "Groot engine complete",
  );

  return {
    text: response.text,
    detectedMood: metadata?.detectedMood,
    shouldStoreMemory: metadata?.shouldStoreMemory ?? false,
    memoryTags: metadata?.memoryTags ?? [],
    profileUpdates,
    detectedDates: metadata?.detectedDates ?? [],
    detectedTasks: metadata?.detectedTasks ?? [],
    lastImageRequest: metadata?.lastImageRequest ?? false,
    timings: {
      contextMs: t1 - t0,
      llmMs: t2 - t1,
      profileUpsertMs: t3 - t2,
      totalMs: t3 - t0,
    },
  };
}

// ─── Helpers ───

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const CATEGORY_MAP: Record<string, ProfileFact["category"]> = {
  static: "static",
  dynamic: "dynamic",
  preference: "preference",
  goal: "goal",
  health: "dynamic",
  habit: "dynamic",
  activity: "dynamic",
  fitness: "dynamic",
  work: "static",
  career: "static",
  education: "static",
  relationships: "static",
  relationship: "static",
  personal: "static",
  hobby: "static",
  food: "preference",
  lifestyle: "preference",
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
