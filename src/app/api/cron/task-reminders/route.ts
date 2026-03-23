import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendMessage, getUserPlatform } from "@/lib/messaging/dispatcher";
import { logger } from "@/lib/logger";

interface TaskRow {
  id: string;
  content: string;
  category: string;
  due_date: string | null;
}

interface UserWithTasks {
  userId: string;
  displayName: string;
  whatsappNumber: string;
  overdue: TaskRow[];
  dueToday: TaskRow[];
  upcoming: TaskRow[];
}

/**
 * Task reminder cron — runs daily at 8:30 AM IST (3:00 AM UTC).
 * Sends a task digest to users with overdue, due-today, or upcoming tasks.
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
    const supabase = getSupabaseAdmin();

    // Find all pending tasks with due dates within the next 3 days or overdue
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, content, category, due_date, user_id")
      .eq("is_completed", false)
      .not("due_date", "is", null)
      .lte("due_date", threeDaysFromNow.toISOString())
      .order("due_date", { ascending: true });

    if (!tasks || tasks.length === 0) {
      logger.info("No tasks with upcoming due dates");
      return NextResponse.json({ sent: 0, total: 0 });
    }

    // Group tasks by user
    const userTaskMap = new Map<string, TaskRow[]>();
    for (const task of tasks) {
      const userId = (task as { user_id: string }).user_id;
      if (!userTaskMap.has(userId)) {
        userTaskMap.set(userId, []);
      }
      userTaskMap.get(userId)!.push(task);
    }

    // Fetch user details
    const userIds = [...userTaskMap.keys()];
    const { data: users } = await supabase
      .from("users")
      .select("id, display_name, whatsapp_number, telegram_chat_id")
      .in("id", userIds);

    if (!users || users.length === 0) {
      return NextResponse.json({ sent: 0, total: 0 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    let sent = 0;

    for (const user of users) {
      try {
        const userTasks = userTaskMap.get(user.id) ?? [];
        if (userTasks.length === 0) continue;

        const overdue: TaskRow[] = [];
        const dueToday: TaskRow[] = [];
        const upcoming: TaskRow[] = [];

        for (const task of userTasks) {
          if (!task.due_date) continue;
          const dueDate = new Date(task.due_date);
          if (dueDate < todayStart) {
            overdue.push(task);
          } else if (dueDate < todayEnd) {
            dueToday.push(task);
          } else {
            upcoming.push(task);
          }
        }

        // Only send if there are overdue or due-today tasks
        if (overdue.length === 0 && dueToday.length === 0) continue;

        const name = user.display_name ?? "there";
        const message = buildTaskDigest(name, { overdue, dueToday, upcoming });
        const { platform, platformId } = getUserPlatform(user);

        await sendMessage(platform, platformId, message);
        sent++;
      } catch (error) {
        logger.error({ error, userId: user.id }, "Failed to send task reminder");
      }
    }

    logger.info({ sent, total: users.length }, "Task reminder cron complete");
    return NextResponse.json({ sent, total: users.length });
  } catch (error) {
    logger.error({ error }, "Task reminder cron failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function buildTaskDigest(
  name: string,
  tasks: Pick<UserWithTasks, "overdue" | "dueToday" | "upcoming">,
): string {
  const parts: string[] = [];

  if (tasks.overdue.length > 0) {
    parts.push(`Hey *${name}*, quick heads up on your tasks:`);
    parts.push(
      `*Overdue:*\n${tasks.overdue.map((t) => `• ${t.content}`).join("\n")}`,
    );
  } else {
    parts.push(`Morning *${name}*, here's your task lineup:`);
  }

  if (tasks.dueToday.length > 0) {
    parts.push(
      `*Due today:*\n${tasks.dueToday.map((t) => `• ${t.content}`).join("\n")}`,
    );
  }

  if (tasks.upcoming.length > 0) {
    parts.push(
      `*Coming up:*\n${tasks.upcoming.map((t) => {
        const d = new Date(t.due_date!);
        const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return `• ${t.content} _(${day})_`;
      }).join("\n")}`,
    );
  }

  return parts.join("\n\n");
}
