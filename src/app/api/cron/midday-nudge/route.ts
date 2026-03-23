import { NextRequest, NextResponse } from "next/server";
import { getEligibleUsers } from "@/lib/proactive/scheduler";
import { getActiveHabits, getStreakInfo } from "@/lib/habits/tracker";
import { getUserProfileSummary } from "@/lib/memory/profile-builder";
import { hasMessagedToday } from "@/lib/memory/short-term";
import { recordProactiveMessage } from "@/lib/journal/prompt-generator";
import { sendMessage, getUserPlatform } from "@/lib/messaging/dispatcher";
import { validateCronAuth } from "@/lib/cron/auth";
import { getUnsurfacedInsights, markInsightsSurfaced } from "@/lib/patterns/insights-reader";
import { logger } from "@/lib/logger";

/**
 * Storyworthy-inspired midday prompts — fallback pool.
 */
const MIDDAY_PROMPTS = [
  "Anything happening right now you'd want to remember later?",
  "What's the most interesting thing about today so far?",
  "If someone asked you about your day right now, what would you tell them?",
  "Quick thought dump — what's top of mind?",
  "Anything worth remembering from today so far?",
  "What's one thing you've noticed today that you usually wouldn't?",
  "How's the energy right now?",
  "What are you in the middle of?",
];

/**
 * Mid-day nudge cron — 2 PM user local time.
 * Contextual: skips users who already messaged today,
 * uses habits/profile for personalized nudges.
 * Protected by CRON_SECRET Bearer token.
 */
export async function GET(request: NextRequest) {
  const authError = validateCronAuth(request);
  if (authError) return authError;

  try {
    const users = await getEligibleUsers("midday_nudge");
    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        // Skip users who already messaged today — they're engaged
        const engaged = await hasMessagedToday(user.id);
        if (engaged) {
          skipped++;
          continue;
        }

        const { platform, platformId } = getUserPlatform(user);
        const name = user.display_name ?? "there";
        const { nudge, insightIds } = await buildContextualNudge(user.id, name);

        await sendMessage(platform, platformId, nudge);
        if (insightIds.length > 0) {
          markInsightsSurfaced(insightIds, "midday").catch(() => {});
        }
        recordProactiveMessage(user.id, "midday_nudge", nudge).catch(() => {});
        sent++;
      } catch (error) {
        logger.error({ error, userId: user.id }, "Failed to send midday nudge");
      }
    }

    logger.info({ sent, skipped, total: users.length }, "Midday nudge complete");
    return NextResponse.json({ sent, skipped, total: users.length });
  } catch (error) {
    logger.error({ error }, "Midday nudge cron failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function buildContextualNudge(
  userId: string,
  name: string,
): Promise<{ nudge: string; insightIds: string[] }> {
  const insightIds: string[] = [];

  // Try commitment-stale insight first (most impactful)
  const insights = await getUnsurfacedInsights(userId, 1);
  const commitmentInsight = insights.find((i) => i.insight_type === "commitment_stale");
  if (commitmentInsight) {
    const data = commitmentInsight.data as { commitmentText?: string; daysAgo?: number };
    insightIds.push(commitmentInsight.id);
    return {
      nudge: `Hey ${name} — remember when you said you'd *${data.commitmentText}*? That was ${data.daysAgo} days ago.`,
      insightIds,
    };
  }

  // Try habit-based nudge (most actionable)
  const habits = await getActiveHabits(userId);
  if (habits.length > 0) {
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    for (const habit of habits) {
      if (habit.name === "daily_capture") continue;
      const streak = await getStreakInfo(userId, habit.id);
      if (streak.last_checkin_date !== todayStr && streak.current_streak > 0) {
        return {
          nudge: `Hey ${name} — day ${streak.current_streak + 1} of *${habit.name}*. Don't forget to log it.`,
          insightIds,
        };
      }
    }
  }

  // Try profile-based nudge
  const profile = await getUserProfileSummary(userId);
  if (profile) {
    const projectMatch = profile.match(/current[_ ]project:\s*(.+)/i);
    if (projectMatch?.[1]) {
      return { nudge: `Hey ${name} — how's *${projectMatch[1].trim()}* going?`, insightIds };
    }

    const occupationMatch = profile.match(/occupation:\s*(.+)/i);
    if (occupationMatch?.[1]) {
      return { nudge: `Hey ${name} — how's the day going so far?`, insightIds };
    }
  }

  // Fallback: random Storyworthy prompt
  const prompt = MIDDAY_PROMPTS[Math.floor(Math.random() * MIDDAY_PROMPTS.length)]!;
  return { nudge: `Hey ${name} — ${prompt.toLowerCase()}`, insightIds };
}
