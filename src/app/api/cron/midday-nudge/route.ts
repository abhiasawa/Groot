import { NextRequest, NextResponse } from "next/server";
import { getEligibleUsers } from "@/lib/proactive/scheduler";
import { getActiveHabits, getStreakInfo } from "@/lib/habits/tracker";
import { getUserProfileSummary } from "@/lib/memory/profile-builder";
import { hasMessagedToday } from "@/lib/memory/short-term";
import { recordProactiveMessage } from "@/lib/journal/prompt-generator";
import { sendMessage, getUserPlatform } from "@/lib/messaging/dispatcher";
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
  if (!process.env.CRON_SECRET) {
    logger.error("CRON_SECRET is missing");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        const nudge = await buildContextualNudge(user.id, name);

        await sendMessage(platform, platformId, nudge);
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
): Promise<string> {
  // Try habit-based nudge first (most actionable)
  const habits = await getActiveHabits(userId);
  if (habits.length > 0) {
    // Find a habit they haven't checked in today
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    for (const habit of habits) {
      const streak = await getStreakInfo(userId, habit.id);
      if (streak.last_checkin_date !== todayStr && streak.current_streak > 0) {
        return `Hey ${name} — day ${streak.current_streak + 1} of *${habit.name}*. Don't forget to log it.`;
      }
    }
  }

  // Try profile-based nudge (if we know something about them)
  const profile = await getUserProfileSummary(userId);
  if (profile) {
    // Look for a current project or work-related fact
    const projectMatch = profile.match(/current[_ ]project:\s*(.+)/i);
    if (projectMatch?.[1]) {
      return `Hey ${name} — how's *${projectMatch[1].trim()}* going?`;
    }

    const occupationMatch = profile.match(/occupation:\s*(.+)/i);
    if (occupationMatch?.[1]) {
      return `Hey ${name} — how's the day going so far?`;
    }
  }

  // Fallback: random Storyworthy prompt
  const prompt = MIDDAY_PROMPTS[Math.floor(Math.random() * MIDDAY_PROMPTS.length)]!;
  return `Hey ${name} — ${prompt.toLowerCase()}`;
}
