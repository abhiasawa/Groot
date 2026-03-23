import { NextRequest, NextResponse } from "next/server";
import { getEligibleUsers, getDeEscalationLevel, sendDeEscalationPrompt } from "@/lib/proactive/scheduler";
import { getActiveHabits, getStreakInfo } from "@/lib/habits/tracker";
import { getLastEveningReply } from "@/lib/memory/short-term";
import { recordProactiveMessage } from "@/lib/journal/prompt-generator";
import { sendMessage, getUserPlatform } from "@/lib/messaging/dispatcher";
import { validateCronAuth } from "@/lib/cron/auth";
import { getUnsurfacedInsights, markInsightsSurfaced } from "@/lib/patterns/insights-reader";
import { logger } from "@/lib/logger";

/**
 * Daily morning check-in cron — 8 AM IST (2:30 AM UTC)
 * Protected by CRON_SECRET Bearer token.
 *
 * De-escalation levels:
 * 0: Full check-in with habits + "yesterday you said..." callback + insights
 * 1: Shorter check-in with habits
 * 2: Minimal "I'm here" message
 * 3+: Skip (or send preference prompt)
 */
export async function GET(request: NextRequest) {
  const authError = validateCronAuth(request);
  if (authError) return authError;

  try {
    const users = await getEligibleUsers("morning_checkin");
    let sent = 0;

    for (const user of users) {
      try {
        const level = await getDeEscalationLevel(user.id);
        const name = user.display_name ?? "there";
        const { platform, platformId } = getUserPlatform(user);

        if (level >= 3) {
          await sendDeEscalationPrompt(user);
          sent++;
          continue;
        }

        if (level === 2) {
          await sendMessage(
            platform,
            platformId,
            `Hey ${name}. I'm here if you need me. 🌱`,
          );
          sent++;
          continue;
        }

        // Level 0-1: Build the morning message with insights
        const { message: greeting, insightIds } = await buildMorningMessage(user.id, name, level as 0 | 1);
        await sendMessage(platform, platformId, greeting);

        // Mark surfaced insights
        if (insightIds.length > 0) {
          markInsightsSurfaced(insightIds, "morning").catch(() => {});
        }

        // Log to proactive_history
        recordProactiveMessage(user.id, "morning_checkin", greeting).catch(() => {});

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

async function buildMorningMessage(
  userId: string,
  name: string,
  level: 0 | 1,
): Promise<{ message: string; insightIds: string[] }> {
  const [eveningReply, habits, insights] = await Promise.all([
    level === 0 ? getLastEveningReply(userId) : Promise.resolve(null),
    getActiveHabits(userId),
    level === 0 ? getUnsurfacedInsights(userId, 2) : Promise.resolve([]),
  ]);

  const parts: string[] = [];
  const insightIds: string[] = [];

  // Opening — reference yesterday's reflection first (most personal)
  if (eveningReply) {
    const truncatedReply = truncate(eveningReply.reply, 50);
    parts.push(`Morning, *${name}*. Yesterday you said: _"${truncatedReply}"_`);
  } else if (level === 0) {
    parts.push(`Morning, *${name}*. New day, clean slate.`);
  } else {
    parts.push(`Morning, ${name}.`);
  }

  // Capture streak (daily_capture habit) — append as secondary detail
  const captureHabit = habits.find((h) => h.name === "daily_capture");
  if (captureHabit) {
    const streak = await getStreakInfo(userId, captureHabit.id);
    if (streak.current_streak > 0) {
      parts.push(`_Day ${streak.current_streak} of capturing your thoughts._`);
    }
  }

  // Surface pattern insights (mood shifts, topic changes, stale commitments)
  if (insights.length > 0) {
    for (const insight of insights) {
      if (insight.insight_type === "mood_shift") {
        parts.push(`_${insight.description}_`);
      } else if (insight.insight_type === "commitment_stale") {
        parts.push(`_${insight.title}_`);
      } else if (insight.insight_type === "topic_shift") {
        parts.push(`_${insight.description}_`);
      }
      insightIds.push(insight.id);
    }
  }

  // Habit streaks (excluding daily_capture which is shown in header)
  const displayHabits = habits.filter((h) => h.name !== "daily_capture");
  if (displayHabits.length > 0) {
    const habitLines: string[] = [];
    for (const habit of displayHabits.slice(0, 5)) {
      const streak = await getStreakInfo(userId, habit.id);
      const unit = habit.target_unit ? ` (${habit.target_unit})` : "";
      habitLines.push(
        `• *${habit.name}*${unit} — ${streak.current_streak}-day streak`,
      );
    }
    parts.push(habitLines.join("\n"));

    if (level === 0) {
      parts.push("_Quick log: just send the number._");
    }
  }

  return { message: parts.join("\n\n"), insightIds };
}

function truncate(text: string, maxLen: number): string {
  // Clean up: collapse whitespace, trim
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 3) + "...";
}
