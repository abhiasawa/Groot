import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { getActiveHabits, getStreakInfo } from "@/lib/habits/tracker";
import { logger } from "@/lib/logger";

/**
 * GET /api/mobile/today — Data for the Today screen.
 *
 * Returns:
 * - greeting: time-based greeting with name
 * - todayPrompt: tonight's evening question (pre-generated at 6 PM, or null)
 * - observation: Groot's weekly pattern observation (or null)
 * - yesterdayMoment: yesterday's storyworthy journal entry (or null)
 * - yesterdayMood: yesterday's dominant mood (or null)
 * - recentMood: most recent detected mood
 * - habits: active habits with streaks and today's check-in status
 */
export async function GET(request: NextRequest) {
  let userId: string;
  let displayName: string;
  try {
    const user = await getAuthenticatedPortalUser(request);
    userId = user.id;
    displayName = user.display_name || "there";
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const yesterdayDate = new Date(new Date(`${todayIST}T00:00:00+05:30`).getTime() - 24 * 60 * 60 * 1000);
  const yesterdayIST = yesterdayDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const yesterdayStart = `${yesterdayIST}T00:00:00+05:30`;
  const yesterdayEnd = `${yesterdayIST}T23:59:59+05:30`;

  const [
    preparedPrompt,
    observation,
    yesterdayMessages,
    recentMoodMsg,
    habits,
  ] = await Promise.all([
    // Pre-generated evening prompt (from 6 PM cron)
    supabase
      .from("proactive_history")
      .select("content")
      .eq("user_id", userId)
      .eq("message_type", "evening_prepared")
      .gte("sent_at", `${todayIST}T00:00:00+05:30`)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Weekly observation (latest from proactive_history)
    supabase
      .from("proactive_history")
      .select("content")
      .eq("user_id", userId)
      .eq("message_type", "weekly_observation")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Yesterday's inbound messages (for capturing "yesterday's moment")
    supabase
      .from("messages")
      .select("content, media_description, metadata")
      .eq("user_id", userId)
      .eq("direction", "inbound")
      .gte("created_at", yesterdayStart)
      .lte("created_at", yesterdayEnd)
      .order("created_at", { ascending: false })
      .limit(10),

    // Most recent mood (from metadata)
    supabase
      .from("messages")
      .select("metadata")
      .eq("user_id", userId)
      .not("metadata", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),

    // Active habits with streaks
    getActiveHabits(userId),
  ]);

  // Extract pre-generated evening prompt
  const todayPrompt = extractPromptQuestion(preparedPrompt?.data?.content as string | null);

  // Extract observation
  const observationText = (observation?.data?.content as string) ?? null;

  // Find yesterday's storyworthy moment
  let yesterdayMoment: string | null = null;
  let yesterdayMood: string | null = null;
  for (const msg of yesterdayMessages.data ?? []) {
    const meta = msg.metadata as Record<string, unknown> | null;
    // Prefer messages marked as storyworthy
    if (meta?.shouldStoreMemory) {
      yesterdayMoment = (msg.content as string) ?? (msg.media_description as string) ?? null;
      break;
    }
  }
  // Fallback: use the longest message from yesterday
  if (!yesterdayMoment) {
    const msgs = (yesterdayMessages.data ?? [])
      .map((m) => ((m.content as string) ?? "").trim())
      .filter((c) => c.length > 10);
    if (msgs.length > 0) {
      yesterdayMoment = msgs.sort((a, b) => b.length - a.length)[0] ?? null;
    }
  }
  // Extract yesterday's mood
  for (const msg of yesterdayMessages.data ?? []) {
    const meta = msg.metadata as Record<string, unknown> | null;
    const mood = (meta?.detectedMood as string) ?? (meta?.mood as string);
    if (mood) { yesterdayMood = mood; break; }
  }

  // Extract recent mood from metadata
  let recentMood: string | null = null;
  for (const msg of recentMoodMsg.data ?? []) {
    const meta = msg.metadata as Record<string, unknown> | null;
    const mood = (meta?.detectedMood as string) ?? (meta?.mood as string);
    if (mood) { recentMood = mood.toLowerCase(); break; }
  }

  // Build habit list with streaks
  const habitList = await Promise.all(
    habits.slice(0, 5).map(async (habit) => {
      const streak = await getStreakInfo(userId, habit.id);
      return {
        name: habit.name,
        currentStreak: streak.current_streak,
        checkedInToday: streak.last_checkin_date === todayIST,
        targetUnit: habit.target_unit,
      };
    }),
  );

  // Time-based greeting
  const hour = parseInt(
    new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }),
  );
  let greetingPrefix: string;
  if (hour < 12) greetingPrefix = "Good morning";
  else if (hour < 17) greetingPrefix = "Good afternoon";
  else greetingPrefix = "Good evening";

  const response = {
    greeting: `${greetingPrefix}, ${displayName}`,
    todayPrompt,
    observation: observationText,
    yesterdayMoment: yesterdayMoment ? truncate(yesterdayMoment, 120) : null,
    yesterdayMood,
    recentMood,
    habits: habitList,
  };

  logger.info({ userId, hasPrompt: !!todayPrompt, habitCount: habitList.length }, "Today screen data loaded");

  return NextResponse.json(response, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}

function truncate(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 3) + "...";
}

/**
 * Extract just the question from a full proactive message.
 * Messages are formatted as: "Hey name, time for a quick reflection 🌙\n\n{question}"
 */
function extractPromptQuestion(content: string | null): string | null {
  if (!content) return null;
  const parts = content.split("\n\n");
  return parts.length > 1 ? parts.slice(1).join("\n\n").trim() : content.trim();
}
