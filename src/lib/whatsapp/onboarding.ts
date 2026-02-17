import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "./client";
import { sendWithDelay } from "./interactive";
import { processMedia } from "@/lib/media/media-handler";
import { getLLMProvider } from "@/lib/providers/llm";
import { logger } from "@/lib/logger";
import type { ParsedMessage } from "@/types/whatsapp";

/**
 * Onboarding state machine.
 *
 * Step 0: New user — send intro + ask name
 * Step 1: Waiting for name — capture it, ask for goal
 * Step 2: Waiting for goal — capture it, teach shortcut + prompt first capture
 * Step 3: Waiting for first note — store it, send confirmation
 * Step 4: Complete — set onboarding_completed_at
 *
 * Users at step >= 4 (or with onboarding_completed_at set) skip onboarding.
 */

interface UserRecord {
  id: string;
  whatsapp_number: string;
  display_name: string | null;
  onboarding_step: number;
  onboarding_completed_at: string | null;
}

/**
 * Check if a user needs onboarding. Returns the user record if they exist.
 * If user doesn't exist, creates them and returns the new record at step 0.
 */
export async function getOrCreateUser(
  whatsappNumber: string,
  displayName: string,
): Promise<UserRecord> {
  const supabase = getSupabaseAdmin();

  // Try to fetch existing user
  const { data: existing } = await supabase
    .from("users")
    .select("id, whatsapp_number, display_name, onboarding_step, onboarding_completed_at")
    .eq("whatsapp_number", whatsappNumber)
    .single();

  if (existing) {
    return existing as UserRecord;
  }

  // Create new user at step 0
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      whatsapp_number: whatsappNumber,
      display_name: displayName || null,
      onboarding_step: 0,
    })
    .select("id, whatsapp_number, display_name, onboarding_step, onboarding_completed_at")
    .single();

  if (error || !newUser) {
    logger.error({ error, whatsappNumber }, "Failed to create user");
    throw new Error("Failed to create user");
  }

  logger.info({ userId: newUser.id, whatsappNumber }, "New user created");
  return newUser as UserRecord;
}

/**
 * Returns true if user has completed onboarding and should go to normal flow.
 */
export function isOnboardingComplete(user: UserRecord): boolean {
  return user.onboarding_completed_at !== null || user.onboarding_step >= 4;
}

/**
 * Handle the onboarding flow for a user. Returns true if onboarding was handled
 * (caller should NOT continue to normal message processing).
 */
export async function handleOnboarding(
  user: UserRecord,
  parsed: ParsedMessage,
): Promise<boolean> {
  const step = user.onboarding_step;

  // If user sent audio during onboarding, transcribe it first
  if (parsed.mediaId && parsed.mediaMimeType && parsed.type === "audio") {
    try {
      const result = await processMedia(parsed.mediaId, "audio", parsed.mediaMimeType);
      const transcribed = result?.text?.trim();
      if (transcribed && transcribed.length > 1 && !/^[.\s…]+$/.test(transcribed)) {
        parsed = { ...parsed, text: transcribed };
      } else {
        logger.info({ transcribed }, "Audio transcription was empty or meaningless");
        // Leave parsed.text as null so the step handler asks again
      }
    } catch (error) {
      logger.warn({ error }, "Failed to transcribe audio during onboarding");
    }
  }

  switch (step) {
    case 0:
      await handleStep0(user);
      return true;
    case 1:
      await handleStep1(user, parsed);
      return true;
    case 2:
      await handleStep2(user, parsed);
      return true;
    case 3:
      await handleStep3(user, parsed);
      return true;
    default:
      return false;
  }
}

/**
 * Step 0: First ever message from this user.
 * Send personality intro, then ask for name.
 */
async function handleStep0(user: UserRecord): Promise<void> {
  const to = user.whatsapp_number;

  // Message 1: Introduction
  await sendWhatsAppMessage(
    to,
    `Hey, I'm *Groot*.\n\nI live here on WhatsApp. Think of me as the smartest person in your contacts — I can brainstorm with you, remember things, give advice, or just chat.\n\nI get better the more we talk.`,
  );

  // Message 2: Ask for name
  await sendWithDelay(to, "First things first — *what should I call you?*", 2500);

  await updateOnboardingStep(user.id, 1);
  logger.info({ userId: user.id }, "Onboarding step 0 → 1: Intro sent, waiting for name");
}

/**
 * Step 1: User replied with their name.
 * Capture it, greet personally, ask for a goal.
 */
async function handleStep1(user: UserRecord, parsed: ParsedMessage): Promise<void> {
  const to = user.whatsapp_number;
  const name = await extractName(parsed.text);

  if (!name) {
    await sendWhatsAppMessage(to, "I didn't catch that — what's your name?");
    return;
  }

  // Store the name
  await updateUserName(user.id, name);

  // Message 3: Personal greeting + ask what they're up to
  await sendWhatsAppMessage(
    to,
    `Good to meet you, *${name}*.\n\nI'm curious — *what are you working on these days?*\n\n_A project, a side hustle, something you're learning — anything goes._`,
  );

  await updateOnboardingStep(user.id, 2);
  logger.info({ userId: user.id, name }, "Onboarding step 1 → 2: Name captured, waiting for goal");
}

/**
 * Step 2: User replied with a goal.
 * Capture it, teach the shortcut, prompt first memory capture.
 */
async function handleStep2(user: UserRecord, parsed: ParsedMessage): Promise<void> {
  const to = user.whatsapp_number;
  const rawText = parsed.text?.trim();

  if (!rawText) {
    await sendWhatsAppMessage(
      to,
      "I didn't catch that. What's one goal you're working toward? Could be anything — fitness, work, learning.",
    );
    return;
  }

  // Use LLM to extract a clean goal from natural speech
  const goal = await extractGoal(rawText);

  if (!goal) {
    await sendWhatsAppMessage(
      to,
      "Hmm, I couldn't quite get a goal from that. Could you tell me *one thing you're working on right now*? Like fitness, a project, or learning something new.",
    );
    return;
  }

  // Store the goal in user_profile
  await storeGoal(user.id, goal);

  // Message 4: Acknowledge + prompt first thought
  await sendWhatsAppMessage(
    to,
    `Interesting — I'll keep that in mind.\n\nNow just talk to me like you would a sharp friend. I'll remember what matters.\n\n*Tell me something — a thought, a question, anything on your mind.*`,
  );

  await updateOnboardingStep(user.id, 3);
  logger.info({ userId: user.id, goal }, "Onboarding step 2 → 3: Goal captured, waiting for first note");
}

/**
 * Step 3: User sent their first note/memory.
 * Store it and complete onboarding.
 */
async function handleStep3(user: UserRecord, parsed: ParsedMessage): Promise<void> {
  const to = user.whatsapp_number;
  const content = parsed.text?.trim();

  if (!content) {
    await sendWhatsAppMessage(
      to,
      "Send me any thought, note, or fact — I'll remember it for you.",
    );
    return;
  }

  // Store as first memory in messages table
  await storeFirstMemory(user.id, content, parsed.messageId);

  const displayName = user.display_name ?? "friend";

  // Message 5: Confirmation
  await sendWhatsAppMessage(
    to,
    `Got it, *${displayName}*. That's your first memory locked in.\n\nFrom here on, just talk to me. Ask questions, bounce ideas, vent, share stuff to remember — whatever you need.\n\nI'm here.`,
  );

  await completeOnboarding(user.id);
  logger.info({ userId: user.id }, "Onboarding complete");
}

// ─── Helper functions ───

async function extractName(text: string | null): Promise<string | null> {
  if (!text) return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  // If it's a single word (just the name), capitalize and return directly
  if (/^\w+$/i.test(trimmed) && trimmed.length <= 50) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  // Use LLM to extract the name from natural speech
  try {
    const provider = getLLMProvider();
    const response = await provider.generateResponse(
      `Extract ONLY the person's name from the message below. The user was asked "What should I call you?" and this is their reply. Return ONLY the name — no quotes, no punctuation, no explanation. If you cannot find a name, return "NONE".`,
      [{ role: "user", content: trimmed }],
      { maxTokens: 30, temperature: 0 },
    );

    const extracted = response.text.trim().replace(/[."']+/g, "").trim();

    if (!extracted || extracted === "NONE" || extracted.length > 50) return null;

    // Capitalize first letter of each word
    return extracted
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  } catch (error) {
    logger.warn({ error, text: trimmed }, "LLM name extraction failed, falling back to regex");
    // Fallback: basic regex extraction
    const match = trimmed.match(/(?:call me|my name is|i'm|i am)\s+(\w+)/i);
    if (match?.[1]) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
    return null;
  }
}

async function extractGoal(text: string): Promise<string | null> {
  try {
    const provider = getLLMProvider();
    const response = await provider.generateResponse(
      `The user was asked "What's one goal you're working on right now?" and replied with the message below. Extract and return ONLY the goal in a concise form (1 short sentence). If the message doesn't contain any meaningful goal or is just noise/greeting/empty content, return "NONE".`,
      [{ role: "user", content: text }],
      { maxTokens: 60, temperature: 0 },
    );

    const extracted = response.text.trim().replace(/^["']+|["']+$/g, "").trim();
    if (!extracted || extracted === "NONE") return null;
    return extracted;
  } catch (error) {
    logger.warn({ error }, "LLM goal extraction failed, using raw text");
    // Fallback: use the raw text if it's at least a few meaningful words
    return text.split(/\s+/).length >= 2 ? text : null;
  }
}

async function updateOnboardingStep(userId: string, step: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("users")
    .update({ onboarding_step: step, updated_at: new Date().toISOString() })
    .eq("id", userId);
}

async function updateUserName(userId: string, name: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("users")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("id", userId);

  // Also store in profile for the memory engine
  await supabase.from("user_profile").upsert(
    {
      user_id: userId,
      category: "static",
      key: "name",
      value: name,
      confidence: 1.0,
      source: "onboarding",
      last_mentioned_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category,key" },
  );
}

async function storeGoal(userId: string, goal: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("user_profile").upsert(
    {
      user_id: userId,
      category: "goal",
      key: "primary_goal",
      value: goal,
      confidence: 1.0,
      source: "onboarding",
      last_mentioned_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category,key" },
  );
}

async function storeFirstMemory(
  userId: string,
  content: string,
  whatsappMessageId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase.from("messages").insert({
    user_id: userId,
    direction: "inbound",
    message_type: "text",
    content,
    whatsapp_message_id: whatsappMessageId,
    metadata: { source: "onboarding", is_first_memory: true },
  });
}

async function completeOnboarding(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("users")
    .update({
      onboarding_step: 4,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
