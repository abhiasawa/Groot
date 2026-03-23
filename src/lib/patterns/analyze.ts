import { getSupabaseAdmin } from "@/lib/supabase/server";
import { computeMoodTrend } from "@/lib/journal/rich-context";
import { getDeEscalationLevel } from "@/lib/proactive/scheduler";
import { MILESTONE_DAYS } from "@/lib/habits/tracker";
import { USER_TIMEZONE } from "@/lib/utils/timezone";
import { logger } from "@/lib/logger";

/**
 * Pattern Engine — SQL-based behavioral analysis.
 *
 * Runs daily at 01:30 UTC. Zero LLM calls — all computation is SQL queries
 * over existing message metadata. Writes insights to `pattern_insights`.
 *
 * Analysis types:
 *   mood_shift       — 7-day mood trend is improving or declining
 *   silence          — weekday gap in messages (respects de-escalation)
 *   topic_shift      — this week's top tags differ from 4-week average
 *   streak_milestone — habit streak just hit a milestone day
 */

interface InsightRow {
  user_id: string;
  insight_type: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
  severity: "info" | "notable" | "urgent";
}

const MOOD_SCORE: Record<string, number> = {
  great: 5, happy: 5, excited: 5, energetic: 5,
  good: 4, positive: 4, motivated: 4, calm: 4, grateful: 4,
  okay: 3, neutral: 3, fine: 3, busy: 3,
  low: 2, tired: 2, anxious: 2, stressed: 2, overwhelmed: 2,
  bad: 1, sad: 1, angry: 1, frustrated: 1, upset: 1,
};

// ─── Public API ───

/** Run all analysis functions for a single user. Returns inserted insight count. */
export async function analyzeUser(userId: string): Promise<number> {
  const insights: InsightRow[] = [];

  const [moodInsights, silenceInsights, topicInsights, streakInsights, commitmentInsights] =
    await Promise.all([
      detectMoodShift(userId),
      detectSilence(userId),
      detectTopicShift(userId),
      detectStreakMilestones(userId),
      detectStaleCommitments(userId),
    ]);

  insights.push(...moodInsights, ...silenceInsights, ...topicInsights, ...streakInsights, ...commitmentInsights);

  if (insights.length === 0) return 0;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("pattern_insights").insert(insights);

  if (error) {
    logger.error({ error, userId }, "Failed to insert pattern insights");
    return 0;
  }

  return insights.length;
}

// ─── Analysis Functions ───

/**
 * Mood shift — detects improving or declining 7-day trend.
 * Reuses computeMoodTrend() from rich-context.ts.
 */
async function detectMoodShift(userId: string): Promise<InsightRow[]> {
  const supabase = getSupabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("messages")
    .select("created_at, metadata")
    .eq("user_id", userId)
    .gte("created_at", sevenDaysAgo)
    .not("metadata->detectedMood", "is", null)
    .order("created_at", { ascending: true });

  // Aggregate daily moods (same logic as rich-context.ts getLast7DaysMoods)
  const dailyMoods = new Map<string, string[]>();
  for (const msg of data ?? []) {
    const meta = msg.metadata as Record<string, unknown> | null;
    const mood = (meta?.detectedMood as string) ?? (meta?.mood as string);
    if (!mood || !(mood in MOOD_SCORE)) continue;

    const dateKey = new Date(msg.created_at as string).toLocaleDateString(
      "en-CA",
      { timeZone: USER_TIMEZONE },
    );
    if (!dailyMoods.has(dateKey)) dailyMoods.set(dateKey, []);
    dailyMoods.get(dateKey)!.push(mood);
  }

  const moodData: Array<{ date: string; mood: string; score: number }> = [];
  for (const [date, moods] of dailyMoods) {
    const counts = new Map<string, number>();
    for (const m of moods) counts.set(m, (counts.get(m) ?? 0) + 1);
    let dominant = moods[0]!;
    let maxCount = 0;
    for (const [m, c] of counts) {
      if (c > maxCount) { dominant = m; maxCount = c; }
    }
    moodData.push({ date, mood: dominant, score: MOOD_SCORE[dominant] ?? 3 });
  }

  const sortedMoods = moodData.sort((a, b) => a.date.localeCompare(b.date));
  const trend = computeMoodTrend(sortedMoods);

  if (trend === "stable" || trend === "unknown") return [];

  // Check if we already generated this insight today
  const today = new Date().toLocaleDateString("en-CA", { timeZone: USER_TIMEZONE });
  const { count } = await supabase
    .from("pattern_insights")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("insight_type", "mood_shift")
    .gte("created_at", `${today}T00:00:00+05:30`);

  if ((count ?? 0) > 0) return [];

  const avgScore = sortedMoods.reduce((s, d) => s + d.score, 0) / sortedMoods.length;

  return [{
    user_id: userId,
    insight_type: "mood_shift",
    title: trend === "improving"
      ? "Your mood has been trending up"
      : "Your mood has been dipping",
    description: trend === "improving"
      ? `Over the past week, your mood scores have been climbing — averaging ${avgScore.toFixed(1)}/5.`
      : `Over the past week, your mood scores have been lower than usual — averaging ${avgScore.toFixed(1)}/5.`,
    data: { trend, avgScore: parseFloat(avgScore.toFixed(1)), days: sortedMoods.length },
    severity: trend === "declining" ? "notable" : "info",
  }];
}

/**
 * Silence detection — flags weekday gaps where user didn't send messages.
 * Respects de-escalation level to avoid flagging users who chose to be quiet.
 */
async function detectSilence(userId: string): Promise<InsightRow[]> {
  const deEscLevel = await getDeEscalationLevel(userId);
  // If user is at de-escalation level 2+, they've been quiet intentionally — don't flag
  if (deEscLevel >= 2) return [];

  const supabase = getSupabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("messages")
    .select("created_at")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) return [];

  // Count distinct weekdays with messages
  const daysWithMessages = new Set<string>();
  for (const msg of data) {
    const dateStr = new Date(msg.created_at as string).toLocaleDateString(
      "en-CA",
      { timeZone: USER_TIMEZONE },
    );
    const dayOfWeek = new Date(msg.created_at as string).toLocaleDateString(
      "en-US",
      { timeZone: USER_TIMEZONE, weekday: "short" },
    );
    // Only count weekdays (Mon-Fri)
    if (dayOfWeek !== "Sat" && dayOfWeek !== "Sun") {
      daysWithMessages.add(dateStr);
    }
  }

  // Count available weekdays in the past 7 days
  let weekdayCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const day = d.toLocaleDateString("en-US", { timeZone: USER_TIMEZONE, weekday: "short" });
    if (day !== "Sat" && day !== "Sun") weekdayCount++;
  }

  const gapDays = weekdayCount - daysWithMessages.size;

  // Only flag if they missed 3+ weekdays (significant gap)
  if (gapDays < 3) return [];

  // Dedup: check if already flagged today
  const today = new Date().toLocaleDateString("en-CA", { timeZone: USER_TIMEZONE });
  const { count } = await supabase
    .from("pattern_insights")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("insight_type", "silence")
    .gte("created_at", `${today}T00:00:00+05:30`);

  if ((count ?? 0) > 0) return [];

  return [{
    user_id: userId,
    insight_type: "silence",
    title: "Quieter week than usual",
    description: `You checked in on ${daysWithMessages.size} of ${weekdayCount} weekdays this week.`,
    data: { gapDays, weekdaysActive: daysWithMessages.size, weekdaysTotal: weekdayCount },
    severity: "info",
  }];
}

/**
 * Topic shift — compare this week's top memoryTags against 4-week average.
 * Flags when a new topic appears or a regular topic disappears.
 */
async function detectTopicShift(userId: string): Promise<InsightRow[]> {
  const supabase = getSupabaseAdmin();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  // This week's tags
  const { data: thisWeek } = await supabase
    .from("messages")
    .select("metadata")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", oneWeekAgo);

  // Previous 3 weeks' tags (4-week window minus this week)
  const { data: prevWeeks } = await supabase
    .from("messages")
    .select("metadata")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", fourWeeksAgo)
    .lt("created_at", oneWeekAgo);

  const thisWeekTags = countTags(thisWeek ?? []);
  const prevWeeksTags = countTags(prevWeeks ?? []);

  // Normalize previous weeks to per-week average
  const prevAvg = new Map<string, number>();
  for (const [tag, count] of prevWeeksTags) {
    prevAvg.set(tag, count / 3);
  }

  const insights: InsightRow[] = [];

  // Find new topics (appeared this week, not in previous weeks)
  for (const [tag, count] of thisWeekTags) {
    if (tag === "daily-life") continue; // Skip generic
    if (count >= 3 && !prevWeeksTags.has(tag)) {
      insights.push({
        user_id: userId,
        insight_type: "topic_shift",
        title: `New focus: ${tag}`,
        description: `"${tag}" came up ${count} times this week — it wasn't on your radar before.`,
        data: { tag, thisWeekCount: count, prevWeekAvg: 0, direction: "new" },
        severity: "info",
      });
    }
  }

  // Find dropped topics (regular in previous weeks, absent this week)
  for (const [tag, avg] of prevAvg) {
    if (tag === "daily-life") continue;
    if (avg >= 2 && !thisWeekTags.has(tag)) {
      insights.push({
        user_id: userId,
        insight_type: "topic_shift",
        title: `Less talk about ${tag}`,
        description: `You used to mention "${tag}" ~${Math.round(avg)} times/week, but it didn't come up this week.`,
        data: { tag, thisWeekCount: 0, prevWeekAvg: parseFloat(avg.toFixed(1)), direction: "dropped" },
        severity: "info",
      });
    }
  }

  // Dedup and limit
  if (insights.length === 0) return [];

  const today = new Date().toLocaleDateString("en-CA", { timeZone: USER_TIMEZONE });
  const { count } = await supabase
    .from("pattern_insights")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("insight_type", "topic_shift")
    .gte("created_at", `${today}T00:00:00+05:30`);

  if ((count ?? 0) > 0) return [];

  return insights.slice(0, 3); // Max 3 topic shifts per day
}

/**
 * Streak milestones — check if any active habit just hit a milestone day.
 */
async function detectStreakMilestones(userId: string): Promise<InsightRow[]> {
  const supabase = getSupabaseAdmin();

  const { data: habits } = await supabase
    .from("habits")
    .select("id, name")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!habits || habits.length === 0) return [];

  const { data: streaks } = await supabase
    .from("habit_streaks")
    .select("habit_id, current_streak")
    .in("habit_id", habits.map((h) => h.id as string));

  if (!streaks || streaks.length === 0) return [];

  const insights: InsightRow[] = [];
  const habitMap = new Map(habits.map((h) => [h.id as string, h.name as string]));

  for (const streak of streaks) {
    const currentStreak = streak.current_streak as number;
    if (!MILESTONE_DAYS.includes(currentStreak)) continue;

    const habitName = habitMap.get(streak.habit_id as string);
    if (!habitName) continue;

    // Dedup: check if this exact milestone was already recorded
    const { count } = await supabase
      .from("pattern_insights")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("insight_type", "streak_milestone")
      .contains("data", { habitId: streak.habit_id, milestone: currentStreak });

    if ((count ?? 0) > 0) continue;

    insights.push({
      user_id: userId,
      insight_type: "streak_milestone",
      title: `${currentStreak}-day streak on ${habitName}`,
      description: currentStreak >= 21
        ? `${currentStreak} days of ${habitName} — this is becoming part of who you are.`
        : `${currentStreak} days in a row with ${habitName}. The momentum is real.`,
      data: { habitId: streak.habit_id, habitName, milestone: currentStreak },
      severity: currentStreak >= 30 ? "notable" : "info",
    });
  }

  return insights;
}

/**
 * Stale commitments — flags active commitments not referenced in 7+ days.
 */
async function detectStaleCommitments(userId: string): Promise<InsightRow[]> {
  const supabase = getSupabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: stale } = await supabase
    .from("commitments")
    .select("id, commitment_text, detected_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .or(`last_referenced_at.is.null,last_referenced_at.lt.${sevenDaysAgo}`)
    .lt("detected_at", sevenDaysAgo)
    .limit(3);

  if (!stale || stale.length === 0) return [];

  // Dedup: check if already flagged today
  const today = new Date().toLocaleDateString("en-CA", { timeZone: USER_TIMEZONE });
  const { count } = await supabase
    .from("pattern_insights")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("insight_type", "commitment_stale")
    .gte("created_at", `${today}T00:00:00+05:30`);

  if ((count ?? 0) > 0) return [];

  return stale.map((c) => {
    const daysAgo = Math.floor((Date.now() - new Date(c.detected_at as string).getTime()) / (1000 * 60 * 60 * 24));
    return {
      user_id: userId,
      insight_type: "commitment_stale",
      title: `Remember: "${c.commitment_text}"`,
      description: `You mentioned this ${daysAgo} days ago but haven't referenced it since.`,
      data: { commitmentId: c.id, commitmentText: c.commitment_text, daysAgo },
      severity: "notable" as const,
    };
  });
}

// ─── Helpers ───

function countTags(messages: Array<{ metadata: unknown }>): Map<string, number> {
  const tagCounts = new Map<string, number>();
  for (const msg of messages) {
    const meta = msg.metadata as Record<string, unknown> | null;
    const tags = meta?.memoryTags as string[] | undefined;
    if (!tags) continue;
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  return tagCounts;
}
