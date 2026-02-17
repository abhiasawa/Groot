import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getLLMProvider } from "@/lib/providers/llm";
import { getUserProfileSummary } from "@/lib/memory/profile-builder";
import { logger } from "@/lib/logger";

/**
 * Weekly Groot Report synthesis.
 *
 * Structure:
 * 1. Opening greeting
 * 2. This Week in Numbers
 * 3. Key Themes
 * 4. Habit Scorecard
 * 5. Mood Pulse
 * 6. Groot's Insight
 * 7. Looking Ahead
 * 8. "Did you know?" feature discovery
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
}

/**
 * Generate a weekly report for a user.
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

  // Use LLM to generate the report
  try {
    const provider = getLLMProvider();
    const response = await provider.generateResponse(
      `You are Groot, generating a personalized weekly report for ${name}.
Use WhatsApp formatting (*bold*, _italic_). Keep it warm and insightful.
Max 15 lines. Use data provided — don't make up stats.`,
      [
        {
          role: "user",
          content: `Generate the Groot Weekly Report based on this data:

User: ${name}
Profile: ${profileSummary || "Still getting to know them"}
Week: ${weekStart} to ${weekEnd}

Stats:
- Messages exchanged: ${weekData.messageCount}
- Memories stored: ${weekData.memoriesCount}
${weekData.habitCheckins.map((h) => `- ${h.habitName}: ${h.checkinCount} check-ins, ${h.currentStreak}-day streak${h.values.length > 0 ? `, avg: ${(h.values.reduce((a, b) => a + b, 0) / h.values.length).toFixed(1)}` : ""}`).join("\n")}

Include:
1. Greeting
2. This Week in Numbers (2-3 key stats)
3. Habit Scorecard (if any habits tracked)
4. One personal insight based on their data
5. A "Did you know?" tip about a Groot feature they haven't used

End with an encouraging note.`,
        },
      ],
      { maxTokens: 16384, temperature: 0.8 },
    );

    // Store the report
    await storeWeeklyReport(userId, weekStart, weekEnd, response.text, weekData);

    return response.text;
  } catch (error) {
    logger.error({ error, userId }, "Failed to generate weekly report via LLM");

    // Fallback: manual report
    return generateFallbackReport(name, weekData);
  }
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
  };
}

async function storeWeeklyReport(
  userId: string,
  weekStart: string,
  weekEnd: string,
  summary: string,
  data: WeeklyData,
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
      mood_trend: data.moodTrend,
    },
    { onConflict: "user_id,week_start" },
  );
}

function generateFallbackReport(name: string, data: WeeklyData): string {
  const lines = [`Hey *${name}*, here's your weekly Groot Report 🌱\n`];
  lines.push(`*This Week in Numbers*`);
  lines.push(`• ${data.messageCount} messages exchanged`);
  lines.push(`• ${data.memoriesCount} memories stored\n`);

  if (data.habitCheckins.length > 0) {
    lines.push(`*Habit Scorecard*`);
    for (const habit of data.habitCheckins) {
      lines.push(
        `• *${habit.habitName}*: ${habit.checkinCount}/7 days, ${habit.currentStreak}-day streak`,
      );
    }
    lines.push("");
  }

  lines.push(`Keep growing. See you next week! 🌿`);
  return lines.join("\n");
}

function getWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0]!;
}
