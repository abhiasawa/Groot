import { getRecentMessages } from "@/lib/memory/short-term";
import { getUserProfileSummary } from "@/lib/memory/profile-builder";
import { getActiveHabits, getStreakInfo } from "@/lib/habits/tracker";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Rich Context Assembler — builds full day context for proactive messages.
 *
 * Used by the evening reflection prompt generator to create highly
 * personal questions based on mood, habits, profile, and patterns.
 */

export interface HabitContext {
  name: string;
  currentStreak: number;
  checkedInToday: boolean;
}

export interface DayContext {
  userName: string;
  todayMessages: Array<{ content: string; type: string; timestamp: string }>;
  messageCount: number;
  currentMoodTrend: "improving" | "declining" | "stable" | "unknown";
  lastDetectedMood: string | null;
  profileHighlights: string;
  activeHabits: HabitContext[];
  recentPatterns: string[];
}

const MOOD_SCORE: Record<string, number> = {
  great: 5, happy: 5, excited: 5, energetic: 5,
  good: 4, positive: 4, motivated: 4, calm: 4, grateful: 4,
  okay: 3, neutral: 3, fine: 3, busy: 3,
  low: 2, tired: 2, anxious: 2, stressed: 2, overwhelmed: 2,
  bad: 1, sad: 1, angry: 1, frustrated: 1, upset: 1,
};

/**
 * Build full day context for a user. All data sources are fetched in parallel.
 */
export async function buildDayContext(
  userId: string,
  userName: string,
): Promise<DayContext> {
  const todayIST = getTodayBoundary();

  const [recentMessages, profileSummary, habits, moodData, tagFrequency] =
    await Promise.all([
      getRecentMessages(userId, 20),
      getUserProfileSummary(userId),
      getActiveHabitsWithStreaks(userId),
      getLast7DaysMoods(userId),
      getWeeklyTagFrequency(userId),
    ]);

  // Filter today's inbound messages
  const todayMessages = recentMessages
    .filter(
      (m) =>
        new Date(m.created_at) >= todayIST && m.direction === "inbound",
    )
    .map((m) => ({
      content: m.content ?? m.media_description ?? "",
      type: m.message_type,
      timestamp: m.created_at,
    }));

  // Extract last detected mood from today's messages (most recent first)
  const lastDetectedMood = extractLastMood(recentMessages, todayIST);

  // Compute 7-day mood trend
  const currentMoodTrend = computeMoodTrend(moodData);

  // Build recent patterns from tag frequency
  const recentPatterns = buildPatterns(tagFrequency);

  return {
    userName,
    todayMessages,
    messageCount: todayMessages.length,
    currentMoodTrend,
    lastDetectedMood,
    profileHighlights: profileSummary,
    activeHabits: habits,
    recentPatterns,
  };
}

// ─── Helpers ───

function getTodayBoundary(): Date {
  // Use IST (Asia/Kolkata) for day boundary
  const now = new Date();
  const istString = now.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  return new Date(`${istString}T00:00:00+05:30`);
}

async function getActiveHabitsWithStreaks(
  userId: string,
): Promise<HabitContext[]> {
  const habits = await getActiveHabits(userId);
  const today = new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const results = await Promise.all(
    habits.map(async (habit) => {
      const streak = await getStreakInfo(userId, habit.id);
      return {
        name: habit.name,
        currentStreak: streak.current_streak,
        checkedInToday: streak.last_checkin_date === today,
      };
    }),
  );

  return results;
}

async function getLast7DaysMoods(
  userId: string,
): Promise<Array<{ date: string; mood: string; score: number }>> {
  const supabase = getSupabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("messages")
    .select("created_at, metadata")
    .eq("user_id", userId)
    .gte("created_at", sevenDaysAgo)
    .not("metadata->detectedMood", "is", null)
    .order("created_at", { ascending: true });

  const dailyMoods = new Map<string, string[]>();
  for (const msg of data ?? []) {
    const meta = msg.metadata as Record<string, unknown> | null;
    const mood = (meta?.detectedMood as string) ?? (meta?.mood as string);
    if (!mood || !(mood in MOOD_SCORE)) continue;

    const dateKey = new Date(msg.created_at as string).toLocaleDateString(
      "en-CA",
      { timeZone: "Asia/Kolkata" },
    );
    if (!dailyMoods.has(dateKey)) dailyMoods.set(dateKey, []);
    dailyMoods.get(dateKey)!.push(mood);
  }

  const result: Array<{ date: string; mood: string; score: number }> = [];
  for (const [date, moods] of dailyMoods) {
    // Pick most frequent mood per day
    const counts = new Map<string, number>();
    for (const m of moods) counts.set(m, (counts.get(m) ?? 0) + 1);
    let dominant = moods[0]!;
    let maxCount = 0;
    for (const [m, c] of counts) {
      if (c > maxCount) { dominant = m; maxCount = c; }
    }
    result.push({ date, mood: dominant, score: MOOD_SCORE[dominant] ?? 3 });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function computeMoodTrend(
  moodData: Array<{ date: string; mood: string; score: number }>,
): DayContext["currentMoodTrend"] {
  if (moodData.length < 3) return "unknown";

  const mid = Math.floor(moodData.length / 2);
  const firstHalf = moodData.slice(0, mid);
  const secondHalf = moodData.slice(mid);

  const avgFirst =
    firstHalf.reduce((sum, d) => sum + d.score, 0) / firstHalf.length;
  const avgSecond =
    secondHalf.reduce((sum, d) => sum + d.score, 0) / secondHalf.length;

  const diff = avgSecond - avgFirst;
  if (diff > 0.5) return "improving";
  if (diff < -0.5) return "declining";
  return "stable";
}

function extractLastMood(
  messages: Array<{ metadata: Record<string, unknown>; created_at: string; direction: string }>,
  todayStart: Date,
): string | null {
  // Search today's messages in reverse for most recent detected mood
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!;
    if (new Date(msg.created_at) < todayStart) break;
    const mood =
      (msg.metadata?.detectedMood as string) ??
      (msg.metadata?.mood as string);
    if (mood && mood in MOOD_SCORE) return mood;
  }
  return null;
}

async function getWeeklyTagFrequency(
  userId: string,
): Promise<Map<string, number>> {
  const supabase = getSupabaseAdmin();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("messages")
    .select("metadata")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", oneWeekAgo);

  const tagCounts = new Map<string, number>();
  for (const msg of data ?? []) {
    const meta = msg.metadata as Record<string, unknown> | null;
    const tags = meta?.memoryTags as string[] | undefined;
    if (!tags) continue;
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return tagCounts;
}

function buildPatterns(tagFrequency: Map<string, number>): string[] {
  const patterns: string[] = [];
  const sorted = [...tagFrequency.entries()]
    .filter(([tag]) => tag !== "daily-life") // Skip generic tag
    .sort((a, b) => b[1] - a[1]);

  for (const [tag, count] of sorted.slice(0, 3)) {
    if (count >= 3) {
      patterns.push(`mentioned ${tag} ${count} times this week`);
    }
  }

  return patterns;
}
