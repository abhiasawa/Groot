import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getLLMProvider } from "@/lib/providers/llm";
import { getUserProfileSummary } from "@/lib/memory/profile-builder";
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

    // Generate structured 3-moments report
    const response = await provider.generateResponse(
      `You are Groot, generating a "Your Week in 3 Moments" report for ${name}.
Use WhatsApp formatting (*bold*, _italic_). Max 15 lines total.
Output EXACTLY this structure — no extra sections:

*Your Week in 3 Moments*

1. *Highlight* — [the standout positive moment or achievement from their week, based on their messages/memories. Be specific to their actual data.]

2. *Pattern* — [a recurring theme, behavior, or emotional trend you noticed across multiple entries this week. Be insightful, not generic.]

3. *Question* — [a thoughtful reflective question for the coming week, grounded in what you observed. Something that invites growth.]

_${weekData.messageCount} messages · ${weekData.memoriesCount} memories${weekData.moodScores.length > 0 ? ` · Mood avg: ${(weekData.moodScores.reduce((a, b) => a + b, 0) / weekData.moodScores.length).toFixed(1)}/5` : ""}_

Use ONLY the data provided. Don't invent facts. Be warm, concise, and personal.`,
      [
        {
          role: "user",
          content: `Generate the "Your Week in 3 Moments" report:

User: ${name}
Profile: ${profileSummary || "Still getting to know them"}
Week: ${weekStart} to ${weekEnd}

Stats:
- Messages exchanged: ${weekData.messageCount}
- Memories stored: ${weekData.memoriesCount}
- Mood scores this week: ${weekData.moodScores.length > 0 ? weekData.moodScores.join(", ") : "none recorded"}
${weekData.habitCheckins.map((h) => `- ${h.habitName}: ${h.checkinCount} check-ins, ${h.currentStreak}-day streak${h.values.length > 0 ? `, avg: ${(h.values.reduce((a, b) => a + b, 0) / h.values.length).toFixed(1)}` : ""}`).join("\n")}

Recent memories (for context):
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
    .eq("direction", "incoming")
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(10);

  const topMemories = (recentMessages ?? [])
    .map((m) => (m.content as string).slice(0, 200))
    .filter((c) => c.length > 10);

  // Gather mood data
  const { data: moods } = await supabase
    .from("mood_entries")
    .select("score")
    .eq("user_id", userId)
    .gte("recorded_at", weekAgo);

  const moodScores = (moods ?? [])
    .map((m) => m.score as number)
    .filter((s) => s >= 1 && s <= 5);

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
    keyTopics: [],
    moodTrend: [],
    moodScores,
    topMemories,
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
