import { buildDayContext, type DayContext } from "@/lib/journal/rich-context";
import { getLLMProvider } from "@/lib/providers/llm";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Journal prompt generator — creates deeply personal evening reflection prompts.
 *
 * Uses rich day context (mood, habits, profile, patterns) to generate
 * one highly specific question. Falls back to curated Storyworthy defaults.
 *
 * Deduplication: queries last 3 evening prompts and asks AI to avoid overlap.
 */

const DEFAULT_PROMPTS = [
  "What's one moment from today you'd actually tell someone about?",
  "If you had to pick one scene from today — just one — what would it be?",
  "Was there a moment today where something clicked — or shifted?",
  "Did you see anything differently today than you did yesterday?",
  "Any small thing happen today that felt surprisingly meaningful?",
  "What's one tiny detail from today you don't want to forget?",
  "Did anything change how you see something — even a little?",
  "What caught you off guard today?",
  "What stuck with you today?",
  "Anything unexpected happen?",
  "If today had a title, what would it be?",
  "What's the one thing from today worth remembering?",
  "Random one — what's the best conversation you had today?",
  "What was the last thing that made you laugh today?",
];

/**
 * Generate a context-aware reflection prompt using rich day context.
 * ALWAYS uses AI when possible (even with 0 messages today).
 */
export async function generateReflectionPrompt(
  userId: string,
  userName: string | null,
): Promise<string> {
  const name = userName ?? "there";

  try {
    const [dayContext, recentPrompts] = await Promise.all([
      buildDayContext(userId, name),
      getRecentProactivePrompts(userId, 3),
    ]);

    const question = await generateContextualQuestion(
      dayContext,
      recentPrompts,
    );

    if (question) {
      return `Hey ${name}, time for a quick reflection 🌙\n\n${question}`;
    }
  } catch (error) {
    logger.warn(
      { error, userId },
      "Failed to generate contextual prompt, using default",
    );
  }

  // Fallback: curated Storyworthy default
  const prompt =
    DEFAULT_PROMPTS[Math.floor(Math.random() * DEFAULT_PROMPTS.length)]!;
  return `Hey ${name}, time for a quick reflection 🌙\n\n${prompt}`;
}

/**
 * Store a sent proactive message in history for deduplication + engagement tracking.
 */
export async function recordProactiveMessage(
  userId: string,
  messageType: string,
  content: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("proactive_history").insert({
    user_id: userId,
    message_type: messageType,
    content,
  });

  if (error) {
    logger.error({ error, userId, messageType }, "Failed to record proactive message");
  }
}

// ─── Internal ───

async function getRecentProactivePrompts(
  userId: string,
  limit: number,
): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("proactive_history")
    .select("content")
    .eq("user_id", userId)
    .eq("message_type", "evening_reflection")
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.warn({ error, userId }, "Failed to fetch proactive history");
    return [];
  }

  return (data ?? []).map((row) => row.content as string);
}

async function generateContextualQuestion(
  ctx: DayContext,
  recentPrompts: string[],
): Promise<string | null> {
  const provider = getLLMProvider();

  // Build context sections
  const messageSummary =
    ctx.messageCount > 0
      ? ctx.todayMessages
          .map((m) => m.content)
          .filter(Boolean)
          .join("\n")
      : "No messages today.";

  const habitSummary =
    ctx.activeHabits.length > 0
      ? ctx.activeHabits
          .map(
            (h) =>
              `${h.name}: ${h.currentStreak}-day streak${h.checkedInToday ? " (checked in today)" : " (not yet today)"}`,
          )
          .join("\n")
      : "No active habits.";

  const patternSection =
    ctx.recentPatterns.length > 0
      ? ctx.recentPatterns.join("\n")
      : "No notable patterns this week.";

  const avoidSection =
    recentPrompts.length > 0
      ? `\nAVOID asking about these topics (asked recently):\n${recentPrompts.map((p) => `- ${p}`).join("\n")}`
      : "";

  const systemPrompt = `You are Groot, generating ONE evening reflection question for ${ctx.userName}.

CONTEXT ABOUT THEIR DAY:
- Messages today: ${ctx.messageCount} messages
${ctx.messageCount > 0 ? `- Topics discussed:\n${messageSummary}` : "- They haven't messaged today."}
- Current mood: ${ctx.lastDetectedMood ?? "unknown"} (trend: ${ctx.currentMoodTrend} over 7 days)
- Active habits:\n${habitSummary}
- Key facts about them:\n${ctx.profileHighlights || "Not much known yet."}
- Patterns this week:\n${patternSection}
${avoidSection}

RULES:
- Ask about a SPECIFIC thing from their day if possible
- If they mentioned a meeting/event, ask how it went
- If mood is declining, ask about a bright spot
- If they haven't messaged today, use what you know about them to ask something personal
- Keep it to 1-2 sentences max
- Sound like a close friend texting, not a therapist
- Do NOT start with "Hey" or "Hi" — just the question
- No emoji
- Use WhatsApp formatting (_italic_ for emphasis if needed)

Return ONLY the question text, nothing else.`;

  const response = await provider.generateResponse(
    systemPrompt,
    [{ role: "user", content: "Generate the evening reflection question:" }],
    { maxTokens: 256, temperature: 0.9 },
  );

  const question = response.text.trim();
  if (question.length < 10 || question.length > 500) {
    logger.warn({ userId: "unknown", questionLength: question.length }, "Generated question out of range");
    return null;
  }

  return question;
}
