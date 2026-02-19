import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendButtons, getUserPlatform } from "@/lib/messaging/dispatcher";
import { logger } from "@/lib/logger";

/**
 * Proactive message scheduler with de-escalation logic.
 */

export interface UserProactiveState {
  id: string;
  whatsapp_number: string | null;
  telegram_chat_id: number | null;
  display_name: string | null;
  proactive_preference: string;
  last_responded_at: string | null;
  timezone: string | null;
}

interface NotificationPrefs {
  morning_checkin: boolean;
  evening_journal: boolean;
  weekly_report: boolean;
}

/**
 * Get all users eligible for a proactive message at this time.
 * Respects:
 * - user proactive preference (daily/weekly/paused)
 * - per-notification toggles from settings
 * - de-escalation level
 * - user timezone
 */
export async function getEligibleUsers(
  messageType: "morning_checkin" | "evening_reflection" | "weekly_report",
): Promise<UserProactiveState[]> {
  const supabase = getSupabaseAdmin();

  const { data: users } = await supabase
    .from("users")
    .select(
      "id, whatsapp_number, telegram_chat_id, display_name, proactive_preference, last_responded_at, timezone",
    )
    .not("onboarding_completed_at", "is", null)
    .neq("proactive_preference", "paused");

  if (!users || users.length === 0) return [];

  const userIds = users.map((u) => u.id as string);
  const prefsByUser = await getNotificationPrefs(userIds);

  const eligible: UserProactiveState[] = [];
  const now = new Date();

  for (const user of users as unknown as UserProactiveState[]) {
    const pref = user.proactive_preference ?? "daily";

    // Weekly users only get weekly reports
    if (pref === "weekly" && messageType !== "weekly_report") {
      continue;
    }

    const prefs = prefsByUser.get(user.id) ?? {
      morning_checkin: true,
      evening_journal: true,
      weekly_report: true,
    };

    if (messageType === "morning_checkin" && !prefs.morning_checkin) continue;
    if (messageType === "evening_reflection" && !prefs.evening_journal) continue;
    if (messageType === "weekly_report" && !prefs.weekly_report) continue;

    // Respect user timezone schedule windows
    if (!isWithinScheduleWindow(user.timezone, messageType, now)) {
      continue;
    }

    // De-escalation policy by message type
    const daysSinceResponse = getDaysSince(user.last_responded_at, now);

    // Morning check-in still runs at level >= 3 so we can show preference prompt.
    if (messageType === "evening_reflection" && daysSinceResponse >= 2) {
      continue;
    }

    eligible.push(user);
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

  const daysSince = getDaysSince(user.last_responded_at as string, new Date());

  if (daysSince >= 3) return 3;
  if (daysSince >= 2) return 2;
  if (daysSince >= 1) return 1;
  return 0;
}

/**
 * Send the de-escalation preference prompt.
 */
export async function sendDeEscalationPrompt(
  user: UserProactiveState,
): Promise<void> {
  const { platform, platformId } = getUserPlatform(user);
  const name = user.display_name ?? "there";
  await sendButtons(
    platform,
    platformId,
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

async function getNotificationPrefs(
  userIds: string[],
): Promise<Map<string, NotificationPrefs>> {
  const prefsMap = new Map<string, NotificationPrefs>();
  if (userIds.length === 0) return prefsMap;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("user_profile")
    .select("user_id, key, value")
    .eq("category", "preference")
    .in("user_id", userIds)
    .in("key", ["morning_checkin", "evening_journal", "weekly_report"]);

  for (const userId of userIds) {
    prefsMap.set(userId, {
      morning_checkin: true,
      evening_journal: true,
      weekly_report: true,
    });
  }

  for (const row of data ?? []) {
    const userId = row.user_id as string;
    const key = row.key as keyof NotificationPrefs;
    const value = row.value === "true";

    const existing = prefsMap.get(userId);
    if (!existing) continue;
    existing[key] = value;
  }

  return prefsMap;
}

function getDaysSince(lastRespondedAt: string | null, now: Date): number {
  if (!lastRespondedAt) return 0;
  const lastResponded = new Date(lastRespondedAt);
  return Math.floor((now.getTime() - lastResponded.getTime()) / (1000 * 60 * 60 * 24));
}

function isWithinScheduleWindow(
  timezone: string | null,
  messageType: "morning_checkin" | "evening_reflection" | "weekly_report",
  now: Date,
): boolean {
  const tz = timezone || "UTC";

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      weekday: "short",
      hour12: false,
    }).formatToParts(now);

    const hourPart = parts.find((p) => p.type === "hour")?.value;
    const weekdayPart = parts.find((p) => p.type === "weekday")?.value;
    const hour = hourPart ? parseInt(hourPart, 10) : -1;

    if (messageType === "morning_checkin") {
      return hour === 8;
    }

    if (messageType === "evening_reflection") {
      return hour === 21;
    }

    if (messageType === "weekly_report") {
      return weekdayPart === "Sun" && hour === 10;
    }

    return false;
  } catch (error) {
    logger.warn({ error, timezone: tz }, "Invalid timezone for user, falling back to UTC schedule");
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();

    if (messageType === "morning_checkin") return utcHour === 8;
    if (messageType === "evening_reflection") return utcHour === 21;
    if (messageType === "weekly_report") return utcDay === 0 && utcHour === 10;
    return false;
  }
}
