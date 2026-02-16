import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendWhatsAppMessage, sendWhatsAppButtons } from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";

/**
 * Proactive message scheduler with de-escalation logic.
 *
 * Rules:
 * - Day 1 no-reply: shorter check-in next day
 * - Day 2 no-reply: just "Hey {name}. I'm here if you need me."
 * - Day 3 no-reply: skip entirely
 * - After 3+ consecutive unread: pause and ask preference
 * - Never send two proactive messages within 4 hours
 * - Weekend check-ins: later (10 AM) and lighter tone
 */

interface UserProactiveState {
  id: string;
  whatsapp_number: string;
  display_name: string | null;
  proactive_preference: string;
  last_responded_at: string | null;
}

/**
 * Get all users eligible for a proactive message at this time.
 * Respects de-escalation and user preferences.
 */
export async function getEligibleUsers(
  messageType: "morning_checkin" | "evening_reflection" | "weekly_report",
): Promise<UserProactiveState[]> {
  const supabase = getSupabaseAdmin();

  // Get users who completed onboarding and haven't paused proactive messages
  const { data: users } = await supabase
    .from("users")
    .select("id, whatsapp_number, display_name, proactive_preference, last_responded_at")
    .not("onboarding_completed_at", "is", null)
    .neq("proactive_preference", "paused");

  if (!users) return [];

  const eligible: UserProactiveState[] = [];
  const now = new Date();

  for (const user of users) {
    const pref = (user.proactive_preference as string) ?? "daily";
    const lastResponded = user.last_responded_at
      ? new Date(user.last_responded_at as string)
      : null;

    // Weekly users only get weekly reports
    if (pref === "weekly" && messageType !== "weekly_report") {
      continue;
    }

    // Check de-escalation: how many days since last response?
    if (lastResponded) {
      const daysSinceResponse = Math.floor(
        (now.getTime() - lastResponded.getTime()) / (1000 * 60 * 60 * 24),
      );

      // After 3 days of no response, skip proactive messages
      if (daysSinceResponse >= 3 && messageType !== "weekly_report") {
        logger.debug(
          { userId: user.id, daysSinceResponse },
          "Skipping proactive message — de-escalation",
        );
        continue;
      }
    }

    eligible.push(user as UserProactiveState);
  }

  return eligible;
}

/**
 * Get the de-escalation level for a user.
 * Returns 0-3 where 3 means "pause and ask".
 */
export async function getDeEscalationLevel(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { data: user } = await supabase
    .from("users")
    .select("last_responded_at")
    .eq("id", userId)
    .single();

  if (!user?.last_responded_at) return 0;

  const lastResponded = new Date(user.last_responded_at as string);
  const daysSince = Math.floor(
    (Date.now() - lastResponded.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSince >= 3) return 3;
  if (daysSince >= 2) return 2;
  if (daysSince >= 1) return 1;
  return 0;
}

/**
 * Send the de-escalation preference prompt.
 * Shows buttons: [Keep Daily] [Weekly Only] [Pause for Now]
 */
export async function sendDeEscalationPrompt(
  userPhone: string,
  userName: string | null,
): Promise<void> {
  const name = userName ?? "there";
  await sendWhatsAppButtons(
    userPhone,
    `Hey ${name}, I notice you've been quiet. No pressure — I'm here when you need me.\n\nHow would you like me to check in?`,
    [
      { id: "proactive_daily", title: "Keep Daily" },
      { id: "proactive_weekly", title: "Weekly Only" },
      { id: "proactive_pause", title: "Pause for Now" },
    ],
  );
}

/**
 * Update proactive preference based on user's button choice.
 */
export async function updateProactivePreference(
  userId: string,
  buttonId: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  let preference: string;

  switch (buttonId) {
    case "proactive_daily":
      preference = "daily";
      break;
    case "proactive_weekly":
      preference = "weekly";
      break;
    case "proactive_pause":
      preference = "paused";
      break;
    default:
      preference = "daily";
  }

  await supabase
    .from("users")
    .update({
      proactive_preference: preference,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return preference;
}

/**
 * Mark user as having responded (resets de-escalation counter).
 */
export async function markUserResponded(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("users")
    .update({ last_responded_at: new Date().toISOString() })
    .eq("id", userId);
}
