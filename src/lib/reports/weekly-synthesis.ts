import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getLLMProvider } from "@/lib/providers/llm";
import { getUserProfileSummary } from "@/lib/memory/profile-builder";
import { getUnsurfacedInsights, markInsightsSurfaced } from "@/lib/patterns/insights-reader";
import { USER_TIMEZONE } from "@/lib/utils/timezone";
import { logger } from "@/lib/logger";

/**
 * Weekly Groot Report — "Your Week in 3 Moments"
 *
 * New format:
 * 1. Highlight — the standout moment of the week
 * 2. Pattern  — a recurring theme or behavior noticed
 * 3. Question — a reflective question for next week
 * + Stats sidebar: messages, memories, streaks, mood trend
 *
 * WhatsApp format: max 15 lines, structured.
 */

interface WeeklyData {
  messageCount: number;
  memoriesCount: number;
  habitCheckins: Array<{
    habitName: string;
    checkinCount: number;
    currentStreak: number;
    values: number[];
  }>;
  keyTopics: string[];
  moodTrend: string[];
  moodScores: number[];
  topMemories: string[];
  insightSummaries: string[];
  insightIds: string[];
}

/** Structured report for mobile display */
export interface WeeklyReportStructured {
  highlight: string;
  pattern: string;
  question: string;
  stats: {
    messages: number;
    memories: number;
    avgMood: number | null;
    topHabit: string | null;
    topStreak: number;
  };
}

/**
 * Generate a weekly report for a user.
 * Returns the WhatsApp-formatted text and stores the structured version.
 */
export async function generateWeeklyReport(
  userId: string,
  userName: string | null,
): Promise<string> {
  const weekData = await gatherWeeklyData(userId);
  const profileSummary = await getUserProfileSummary(userId);

  const name = userName ?? "friend";
  const weekStart = getWeekStartDate();
  const weekEnd = new Date().toISOString().split("T")[0]!;

  try {
    const provider = getLLMProvider();

    const avgMood = weekData.moodScores.length > 0
      ? (weekData.moodScores.reduce((a, b) => a + b, 0) / weekData.moodScores.length).toFixed(1)
      : null;

    // Generate narrative weekly report
    const response = await provider.generateResponse(
      `You are Groot, writing a personal weekly narrative for ${name}.
Use WhatsApp formatting (*bold*, _italic_). Max 15 lines total.

Structure:
1. A *chapter title* — a short evocative title for their week (3-5 words, based on the dominant theme)
2. 2-3 short paragraphs telling the story of their week — what happened, what patterns you noticed, what shifted. Write like a thoughtful friend reflecting back, not a report generator. Be specific to their data.
3. End with one *reflective question* for next week — grounded in what you observed.
4. A stats footer line in italic.

${weekData.insightSummaries.length > 0 ? `\nPattern insights from this week:\n${weekData.insightSummaries.map((s) => `• ${s}`).join("\n")}\nWeave these naturally into the narrative — don't list them separately.\n` : ""}
Use ONLY the data provided. Don't invent facts. Be warm, specific, and personal.`,
      [
        {
          role: "user",
          content: `Write the weekly narrative:

User: ${name}
Profile: ${profileSummary || "Still getting to know them"}
Week: ${weekStart} to ${weekEnd}

Stats:
- Messages exchanged: ${weekData.messageCount}
- Memories stored: ${weekData.memoriesCount}
- Mood scores this week: ${weekData.moodScores.length > 0 ? weekData.moodScores.join(", ") : "none recorded"}${avgMood ? ` (avg: ${avgMood}/5)` : ""}
- Top topics: ${weekData.keyTopics.length > 0 ? weekData.keyTopics.join(", ") : "varied"}
${weekData.habitCheckins.map((h) => `- ${h.habitName}: ${h.checkinCount} check-ins, ${h.currentStreak}-day streak${h.values.length > 0 ? `, avg: ${(h.values.reduce((a, b) => a + b, 0) / h.values.length).toFixed(1)}` : ""}`).join("\n")}

Recent thoughts (for context):
${weekData.topMemories.slice(0, 5).map((m) => `• ${m}`).join("\n") || "No memories this week"}

Also output a JSON block at the very end (after the report), wrapped in \`\`\`json ... \`\`\`:
{
  "highlight": "one-sentence highlight",
  "pattern": "one-sentence pattern",
  "question": "the reflective question"
}`,
        },
      ],
      { maxTokens: 16384, temperature: 0.7 },
    );

    // Parse structured data from JSON block if present
    const structured = parseStructuredReport(response.text, weekData);

    // Store the report
    await storeWeeklyReport(userId, weekStart, weekEnd, response.text, weekData, structured);

    // Mark insights as surfaced
    if (weekData.insightIds.length > 0) {
      markInsightsSurfaced(weekData.insightIds, "weekly_report").catch(() => {});
    }

    // Return clean WhatsApp text (strip JSON block)
    return response.text.replace(/```json[\s\S]*?```/g, "").trim();
  } catch (error) {
    logger.error({ error, userId }, "Failed to generate weekly report via LLM");
    return generateFallbackReport(name, weekData);
  }
}

function parseStructuredReport(
  text: string,
  weekData: WeeklyData,
): WeeklyReportStructured {
  const defaults: WeeklyReportStructured = {
    highlight: "",
    pattern: "",
    question: "",
    stats: {
      messages: weekData.messageCount,
      memories: weekData.memoriesCount,
      avgMood:
        weekData.moodScores.length > 0
          ? weekData.moodScores.reduce((a, b) => a + b, 0) / weekData.moodScores.length
          : null,
      topHabit: weekData.habitCheckins.length > 0
        ? weekData.habitCheckins.sort((a, b) => b.currentStreak - a.currentStreak)[0]!.habitName
        : null,
      topStreak: weekData.habitCheckins.length > 0
        ? Math.max(...weekData.habitCheckins.map((h) => h.currentStreak))
        : 0,
    },
  };

  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch?.[1]) {
      const parsed = JSON.parse(jsonMatch[1]) as Record<string, string>;
      defaults.highlight = parsed.highlight ?? "";
      defaults.pattern = parsed.pattern ?? "";
      defaults.question = parsed.question ?? "";
    }
  } catch {
    // Parsing failed, keep defaults
  }

  return defaults;
}

async function gatherWeeklyData(userId: string): Promise<WeeklyData> {
  const supabase = getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Count messages this week
  const { count: messageCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", weekAgo);

  // Count memories stored
  const { count: memoriesCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("synced_to_supermemory", true)
    .gte("created_at", weekAgo);

  // Top memories for context
  const { data: recentMessages } = await supabase
    .from("messages")
    .select("content")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(10);

  const topMemories = (recentMessages ?? [])
    .map((m) => (m.content as string).slice(0, 200))
    .filter((c) => c.length > 10);

  // Gather mood data from message metadata (detectedMood)
  const MOOD_SCORE: Record<string, number> = {
    great: 5, happy: 5, excited: 5, energetic: 5,
    good: 4, positive: 4, motivated: 4, calm: 4, grateful: 4,
    okay: 3, neutral: 3, fine: 3, busy: 3,
    low: 2, tired: 2, anxious: 2, stressed: 2, overwhelmed: 2,
    bad: 1, sad: 1, angry: 1, frustrated: 1, upset: 1,
  };

  const { data: moodMsgs } = await supabase
    .from("messages")
    .select("metadata")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", weekAgo)
    .not("metadata->detectedMood", "is", null);

  const moodScores = (moodMsgs ?? [])
    .map((m) => {
      const meta = m.metadata as Record<string, unknown> | null;
      const mood = (meta?.detectedMood as string) ?? "";
      return MOOD_SCORE[mood] ?? 0;
    })
    .filter((s) => s > 0);

  // Gather key topics from message metadata (memoryTags)
  const { data: tagMsgs } = await supabase
    .from("messages")
    .select("metadata")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", weekAgo);

  const tagCounts = new Map<string, number>();
  for (const msg of tagMsgs ?? []) {
    const meta = msg.metadata as Record<string, unknown> | null;
    const tags = meta?.memoryTags as string[] | undefined;
    if (!tags) continue;
    for (const tag of tags) {
      if (tag === "daily-life") continue;
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const keyTopics = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // Gather unsurfaced pattern insights
  const insights = await getUnsurfacedInsights(userId, 5);
  const insightSummaries = insights.map((i) => i.description);
  const insightIds = insights.map((i) => i.id);

  // Gather habit data
  const { data: habits } = await supabase
    .from("habits")
    .select("id, name")
    .eq("user_id", userId)
    .eq("is_active", true);

  const habitCheckins = [];
  for (const habit of habits ?? []) {
    const { data: checkins } = await supabase
      .from("habit_checkins")
      .select("value, checked_in_at")
      .eq("habit_id", habit.id)
      .gte("checked_in_at", weekAgo)
      .order("checked_in_at");

    const { data: streak } = await supabase
      .from("habit_streaks")
      .select("current_streak")
      .eq("habit_id", habit.id)
      .single();

    habitCheckins.push({
      habitName: habit.name as string,
      checkinCount: checkins?.length ?? 0,
      currentStreak: (streak?.current_streak as number) ?? 0,
      values: (checkins ?? [])
        .map((c) => c.value as number | null)
        .filter((v): v is number => v !== null),
    });
  }

  return {
    messageCount: messageCount ?? 0,
    memoriesCount: memoriesCount ?? 0,
    habitCheckins,
    keyTopics,
    moodTrend: [],
    moodScores,
    topMemories,
    insightSummaries,
    insightIds,
  };
}

async function storeWeeklyReport(
  userId: string,
  weekStart: string,
  weekEnd: string,
  summary: string,
  data: WeeklyData,
  structured: WeeklyReportStructured,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("weekly_reports").upsert(
    {
      user_id: userId,
      week_start: weekStart,
      week_end: weekEnd,
      summary,
      messages_count: data.messageCount,
      memories_count: data.memoriesCount,
      habit_summary: data.habitCheckins,
      key_topics: data.keyTopics,
      mood_trend: data.moodScores,
      insights: structured,
    },
    { onConflict: "user_id,week_start" },
  );
}

function generateFallbackReport(name: string, data: WeeklyData): string {
  const avgMood =
    data.moodScores.length > 0
      ? (data.moodScores.reduce((a, b) => a + b, 0) / data.moodScores.length).toFixed(1)
      : null;

  const lines = [`*Your Week in 3 Moments*\n`];
  lines.push(
    `1. *Highlight* — You exchanged ${data.messageCount} messages and stored ${data.memoriesCount} memories this week.`,
  );

  if (data.habitCheckins.length > 0) {
    const best = data.habitCheckins.sort((a, b) => b.currentStreak - a.currentStreak)[0]!;
    lines.push(
      `2. *Pattern* — Your ${best.habitName} habit is building momentum with a ${best.currentStreak}-day streak.`,
    );
  } else {
    lines.push(`2. *Pattern* — You're building a consistent journaling practice.`);
  }

  lines.push(`3. *Question* — What one thing this week made you feel most like yourself?\n`);

  const statsLine = [`_${data.messageCount} messages`, `${data.memoriesCount} memories`];
  if (avgMood) statsLine.push(`Mood avg: ${avgMood}/5`);
  lines.push(statsLine.join(" · ") + "_");

  return lines.join("\n");
}

function getWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0]!;
}
