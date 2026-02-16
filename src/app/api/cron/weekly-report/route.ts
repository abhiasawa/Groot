import { NextRequest, NextResponse } from "next/server";
import { getEligibleUsers } from "@/lib/proactive/scheduler";
import { generateWeeklyReport } from "@/lib/reports/weekly-synthesis";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";

/**
 * Weekly Groot Report cron — Sunday 10 AM IST (4:30 AM UTC)
 * Protected by CRON_SECRET Bearer token.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await getEligibleUsers("weekly_report");
    let sent = 0;

    for (const user of users) {
      try {
        const report = await generateWeeklyReport(user.id, user.display_name);

        // Split into 2 messages if too long (>1000 chars)
        if (report.length > 1000) {
          const midpoint = report.lastIndexOf("\n", Math.floor(report.length / 2));
          if (midpoint > 0) {
            await sendWhatsAppMessage(
              user.whatsapp_number,
              report.substring(0, midpoint),
            );
            await new Promise((r) => setTimeout(r, 1500));
            await sendWhatsAppMessage(
              user.whatsapp_number,
              report.substring(midpoint + 1),
            );
          } else {
            await sendWhatsAppMessage(user.whatsapp_number, report);
          }
        } else {
          await sendWhatsAppMessage(user.whatsapp_number, report);
        }

        sent++;
      } catch (error) {
        logger.error({ error, userId: user.id }, "Failed to send weekly report");
      }
    }

    logger.info({ sent, total: users.length }, "Weekly report complete");
    return NextResponse.json({ sent, total: users.length });
  } catch (error) {
    logger.error({ error }, "Weekly report cron failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
