import { NextRequest, NextResponse } from "next/server";
import { getEligibleUsers, getDeEscalationLevel, sendDeEscalationPrompt } from "@/lib/proactive/scheduler";
import { getActiveHabits, getStreakInfo } from "@/lib/habits/tracker";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";

/**
 * Daily morning check-in cron — 8 AM IST (2:30 AM UTC)
 * Protected by CRON_SECRET Bearer token.
 *
 * De-escalation levels:
 * 0: Full check-in with habits
 * 1: Shorter check-in
 * 2: Minimal "I'm here" message
 * 3+: Skip (or send preference prompt)
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    logger.error("CRON_SECRET is missing");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await getEligibleUsers("morning_checkin");
    let sent = 0;

    for (const user of users) {
      try {
        const level = await getDeEscalationLevel(user.id);
        const name = user.display_name ?? "there";

        if (level >= 3) {
          // Ask about preferences
          await sendDeEscalationPrompt(user.whatsapp_number, user.display_name);
          sent++;
          continue;
        }

        if (level === 2) {
          // Minimal message
          await sendWhatsAppMessage(
            user.whatsapp_number,
            `Hey ${name}. I'm here if you need me. 🌱`,
          );
          sent++;
          continue;
        }

        // Level 0-1: Check-in with habits
        const habits = await getActiveHabits(user.id);

        if (habits.length > 0) {
          // Build habit check-in message
          const habitLines = [];
          for (const habit of habits.slice(0, 5)) {
            const streak = await getStreakInfo(user.id, habit.id);
            const unit = habit.target_unit ? ` (${habit.target_unit})` : "";
            habitLines.push(
              `• *${habit.name}*${unit} — ${streak.current_streak}-day streak`,
            );
          }

          const greeting = level === 0
            ? `Good morning, *${name}*! 🌅\n\nHere are your habits today:\n${habitLines.join("\n")}\n\n_Quick log: just send the number (e.g., 80.2 for weight)_`
            : `Morning, ${name}. Your habits:\n${habitLines.join("\n")}`;

          await sendWhatsAppMessage(user.whatsapp_number, greeting);
        } else {
          // No habits — general greeting
          const greeting = level === 0
            ? `Good morning, *${name}*! 🌅\n\nAnything on your mind today? I'm here to help.`
            : `Morning, ${name}. I'm here if you need anything.`;

          await sendWhatsAppMessage(user.whatsapp_number, greeting);
        }

        sent++;
      } catch (error) {
        logger.error({ error, userId: user.id }, "Failed to send daily check-in");
      }
    }

    logger.info({ sent, total: users.length }, "Daily check-in complete");
    return NextResponse.json({ sent, total: users.length });
  } catch (error) {
    logger.error({ error }, "Daily check-in cron failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
