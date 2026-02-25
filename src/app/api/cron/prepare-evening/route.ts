import { NextRequest, NextResponse } from "next/server";
import { getEligibleUsers } from "@/lib/proactive/scheduler";
import {
  generateReflectionPrompt,
  recordProactiveMessage,
} from "@/lib/journal/prompt-generator";
import { logger } from "@/lib/logger";

/**
 * Prepare evening reflection cron — 6 PM IST (12:30 PM UTC)
 * Pre-generates tonight's evening question so the Today screen can show it
 * before 9 PM, giving users time to think about it during the day.
 *
 * Stores with message_type = 'evening_prepared'.
 * At 9 PM, the evening-reflection cron sends the actual message
 * (regenerating if new messages arrived since 6 PM).
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
    let prepared = 0;

    for (const user of users) {
      try {
        const prompt = await generateReflectionPrompt(
          user.id,
          user.display_name,
        );

        // Store as 'evening_prepared' — the Today screen reads this
        await recordProactiveMessage(
          user.id,
          "evening_prepared",
          prompt,
        );

        prepared++;
      } catch (error) {
        logger.error(
          { error, userId: user.id },
          "Failed to prepare evening prompt",
        );
      }
    }

    logger.info({ prepared, total: users.length }, "Evening preparation complete");
    return NextResponse.json({ prepared, total: users.length });
  } catch (error) {
    logger.error({ error }, "Prepare evening cron failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
