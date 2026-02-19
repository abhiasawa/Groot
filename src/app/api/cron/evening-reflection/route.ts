import { NextRequest, NextResponse } from "next/server";
import { getEligibleUsers } from "@/lib/proactive/scheduler";
import { generateReflectionPrompt } from "@/lib/journal/prompt-generator";
import { sendMessage, getUserPlatform } from "@/lib/messaging/dispatcher";
import { logger } from "@/lib/logger";

/**
 * Evening reflection cron — 9 PM IST (3:30 PM UTC)
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
    const users = await getEligibleUsers("evening_reflection");
    let sent = 0;

    for (const user of users) {
      try {
        const { platform, platformId } = getUserPlatform(user);
        const prompt = await generateReflectionPrompt(
          user.id,
          user.display_name,
        );
        await sendMessage(platform, platformId, prompt);
        sent++;
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
