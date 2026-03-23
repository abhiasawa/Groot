import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getEligibleUsers } from "@/lib/proactive/scheduler";
import {
  generateReflectionPrompt,
  recordProactiveMessage,
} from "@/lib/journal/prompt-generator";
import { sendMessage, getUserPlatform } from "@/lib/messaging/dispatcher";
import { validateCronAuth } from "@/lib/cron/auth";
import { USER_TIMEZONE } from "@/lib/utils/timezone";
import { logger } from "@/lib/logger";

/**
 * Evening reflection cron — 9 PM IST (3:30 PM UTC)
 * Protected by CRON_SECRET Bearer token.
 *
 * Flow:
 * 1. Get eligible users (respects de-escalation + timezone)
 * 2. Build rich day context (mood, habits, profile, patterns)
 * 3. Generate a highly personal question (AI-powered, deduplication-aware)
 * 4. Append micro-synthesis (message count, mood, top topic)
 * 5. Send via WhatsApp
 * 6. Log to proactive_history for deduplication + engagement tracking
 */
export async function GET(request: NextRequest) {
  const authError = validateCronAuth(request);
  if (authError) return authError;

  try {
    const users = await getEligibleUsers("evening_reflection");
    let sent = 0;

    for (const user of users) {
      try {
        const { platform, platformId } = getUserPlatform(user);
        const prompt = await generateReflectionPrompt(
          user.id,
          user.display_name,
        );

        // Append micro-synthesis: today's stats
        const synthesis = await buildMicroSynthesis(user.id);
        const fullMessage = synthesis
          ? `${prompt}\n\n_${synthesis}_`
          : prompt;

        await sendMessage(platform, platformId, fullMessage);

        // Log to proactive_history for deduplication + engagement tracking
        await recordProactiveMessage(
          user.id,
          "evening_reflection",
          fullMessage,
        );

        sent++;
        logger.info(
          { userId: user.id },
          "Evening reflection sent",
        );
      } catch (error) {
        logger.error(
          { error, userId: user.id },
          "Failed to send evening reflection",
        );
      }
    }

    logger.info({ sent, total: users.length }, "Evening reflection complete");
    return NextResponse.json({ sent, total: users.length });
  } catch (error) {
    logger.error({ error }, "Evening reflection cron failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Build a 1-line micro-synthesis: "Today: N thoughts, mood X/5, mentioned [topic] twice"
 */
async function buildMicroSynthesis(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: USER_TIMEZONE });
  const todayStart = `${todayStr}T00:00:00+05:30`;

  const { count: msgCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", todayStart);

  if (!msgCount || msgCount === 0) return null;

  // Get mood scores from today's messages
  const { data: moodMsgs } = await supabase
    .from("messages")
    .select("metadata")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", todayStart)
    .not("metadata->detectedMood", "is", null);

  const MOOD_SCORE: Record<string, number> = {
    great: 5, happy: 5, excited: 5, energetic: 5,
    good: 4, positive: 4, motivated: 4, calm: 4, grateful: 4,
    okay: 3, neutral: 3, fine: 3, busy: 3,
    low: 2, tired: 2, anxious: 2, stressed: 2, overwhelmed: 2,
    bad: 1, sad: 1, angry: 1, frustrated: 1, upset: 1,
  };

  let moodPart = "";
  if (moodMsgs && moodMsgs.length > 0) {
    const scores = moodMsgs
      .map((m) => {
        const meta = m.metadata as Record<string, unknown> | null;
        const mood = (meta?.detectedMood as string) ?? "";
        return MOOD_SCORE[mood] ?? 0;
      })
      .filter((s) => s > 0);
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      moodPart = `, mood ${avg.toFixed(1)}/5`;
    }
  }

  // Get top tag from today
  const { data: tagMsgs } = await supabase
    .from("messages")
    .select("metadata")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", todayStart);

  let topicPart = "";
  if (tagMsgs && tagMsgs.length > 0) {
    const tagCounts = new Map<string, number>();
    for (const msg of tagMsgs) {
      const meta = msg.metadata as Record<string, unknown> | null;
      const tags = meta?.memoryTags as string[] | undefined;
      if (!tags) continue;
      for (const tag of tags) {
        if (tag === "daily-life") continue;
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
    const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted[0] && sorted[0][1] >= 2) {
      topicPart = `, mentioned ${sorted[0][0]} ${sorted[0][1]} times`;
    }
  }

  return `Today: ${msgCount} thought${msgCount === 1 ? "" : "s"}${moodPart}${topicPart}`;
}
