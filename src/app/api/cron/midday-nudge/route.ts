import { NextRequest, NextResponse } from "next/server";
import { getEligibleUsers } from "@/lib/proactive/scheduler";
import { sendMessage, getUserPlatform } from "@/lib/messaging/dispatcher";
import { logger } from "@/lib/logger";

/**
 * Storyworthy-inspired midday prompts — storytelling lens on the present moment.
 * Designed to catch moments as they happen, not just in retrospect.
 */
const MIDDAY_PROMPTS = [
  // Present-moment awareness
  "Anything happening right now you'd want to remember later?",
  "What's the most interesting thing about today so far?",
  "If someone asked you about your day right now, what would you tell them?",
  // Gentle nudges
  "Quick thought dump — what's top of mind?",
  "Anything worth remembering from today so far?",
  "What's one thing you've noticed today that you usually wouldn't?",
  // Energy/mood check (still useful)
  "How's the energy right now?",
  "What are you in the middle of?",
];

/**
 * Mid-day nudge cron — 2 PM user local time.
 * Light prompt to capture thoughts during the day.
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

    for (const user of users) {
      try {
        const { platform, platformId } = getUserPlatform(user);
        const name = user.display_name ?? "there";
        const prompt = MIDDAY_PROMPTS[Math.floor(Math.random() * MIDDAY_PROMPTS.length)]!;

        await sendMessage(
          platform,
          platformId,
          `Hey ${name} — ${prompt.toLowerCase()}`,
        );
        sent++;
      } catch (error) {
        logger.error({ error, userId: user.id }, "Failed to send midday nudge");
      }
    }

    logger.info({ sent, total: users.length }, "Midday nudge complete");
    return NextResponse.json({ sent, total: users.length });
  } catch (error) {
    logger.error({ error }, "Midday nudge cron failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
