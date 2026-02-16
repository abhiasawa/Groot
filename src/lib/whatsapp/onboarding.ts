import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "./client";
import { sendWithDelay, sendButtonsWithDelay } from "./interactive";
import { processMedia } from "@/lib/media/media-handler";
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
      if (result?.text) {
        parsed = { ...parsed, text: result.text };
      }
    } catch (error) {
      logger.warn({ error }, "Failed to transcribe audio during onboarding");
    }
  }

  switch (step) {
    case 0:
      await handleStep0(user, parsed);
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
async function handleStep0(user: UserRecord, parsed: ParsedMessage): Promise<void> {
  const to = user.whatsapp_number;

  // Message 1: Introduction
  await sendWhatsAppMessage(
    to,
    `Hey, I'm *Groot* 🌱\n\nYour AI second brain that lives right here on WhatsApp.\nI remember everything you tell me, track your habits, and actually get smarter the more we talk.\n\nThink of me as the friend who never forgets.`,
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
  const name = extractName(parsed.text);

  if (!name) {
    await sendWhatsAppMessage(to, "I didn't catch that — what's your name?");
    return;
  }

  // Store the name
  await updateUserName(user.id, name);

  // Message 3: Personal greeting + ask goal
  await sendWhatsAppMessage(
    to,
    `Nice to meet you, *${name}*! ✨\n\nI work best when I know what matters to you.\n\n*What's one goal you're working on right now?*\n\n_Could be fitness, a project, learning something new — anything._`,
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
  const goal = parsed.text?.trim();

  if (!goal) {
    await sendWhatsAppMessage(
      to,
      "What's one goal you're working toward? Could be anything — fitness, work, learning.",
    );
    return;
  }

  // Store the goal in user_profile
  await storeGoal(user.id, goal);

  const displayName = user.display_name ?? "friend";

  // Message 4: Acknowledge goal + teach shortcut
  await sendWhatsAppMessage(
    to,
    `Great goal — I'll remember that.\n\nHere's a quick trick. You can dump thoughts into me instantly:\n\n*note:* _save a note_\n*todo:* _add a task_\n*idea:* _capture an idea_\n\nTry it now! Send me:\n*note: My current weight is 82kg*\n\n_Or any note you want — it's your first memory._`,
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
    `*Saved.* Your first memory is planted 🌱\n\nFrom now on, just talk to me like a friend.\nAsk me anything, tell me things to remember, share links, send voice notes — I handle it all.\n\nYou can always type *help* to see what I can do.\n\nLet's grow together, *${displayName}*.`,
  );

  await completeOnboarding(user.id);
  logger.info({ userId: user.id }, "Onboarding complete");
}

// ─── Helper functions ───

function extractName(text: string | null): string | null {
  if (!text) return null;

  const cleaned = text
    .trim()
    // Remove common prefixes people use
    .replace(/^(my name is|i'm|i am|call me|it's|its)\s+/i, "")
    .replace(/[.!?,]+$/, "")
    .trim();

  if (!cleaned || cleaned.length > 50) return null;

  // Capitalize first letter of each word
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
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

  // Check if content has a shortcut prefix and strip it
  const stripped = content.replace(/^(note|todo|idea|remind):\s*/i, "").trim();

  await supabase.from("messages").insert({
    user_id: userId,
    direction: "inbound",
    message_type: "text",
    content: stripped || content,
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
