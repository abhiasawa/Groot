import { NextRequest, NextResponse } from "next/server";
import { getDueReminders, markReminderSent } from "@/lib/reminders/scheduler";
import { searchMemories } from "@/lib/memory/supermemory-client";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";

/**
 * Reminder cron — runs every hour.
 * Checks for due reminders and sends contextual notifications.
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
    const dueReminders = await getDueReminders();
    let sent = 0;

    for (const reminder of dueReminders) {
      try {
        // Search for relevant context from memories
        let contextLine = "";
        const memories = await searchMemories(
          reminder.content,
          reminder.user_id,
          2,
        );
        if (memories.length > 0) {
          contextLine = `\n\n_Context: ${memories[0]!.content}_`;
        }

        const message = `⏰ *Reminder:* ${reminder.content}${contextLine}`;

        await sendWhatsAppMessage(reminder.whatsapp_number, message);
        await markReminderSent(reminder.id);
        sent++;
      } catch (error) {
        logger.error(
          { error, reminderId: reminder.id },
          "Failed to send reminder",
        );
      }
    }

    logger.info({ sent, total: dueReminders.length }, "Reminder cron complete");
    return NextResponse.json({ sent, total: dueReminders.length });
  } catch (error) {
    logger.error({ error }, "Reminder cron failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
