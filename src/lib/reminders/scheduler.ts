import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface Reminder {
  id: string;
  user_id: string;
  content: string;
  remind_at: string;
  context: string | null;
  is_sent: boolean;
}

/**
 * Create a new reminder.
 */
export async function createReminder(
  userId: string,
  content: string,
  remindAt: Date,
  context?: string,
): Promise<Reminder> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      user_id: userId,
      content,
      remind_at: remindAt.toISOString(),
      context: context ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    logger.error({ error, userId }, "Failed to create reminder");
    throw new Error("Failed to create reminder");
  }

  logger.info(
    { reminderId: data.id, userId, remindAt: remindAt.toISOString() },
    "Reminder created",
  );
  return data as Reminder;
}

/**
 * Get upcoming reminders that are due (within the next hour).
 */
export async function getDueReminders(): Promise<
  Array<Reminder & { whatsapp_number: string | null; telegram_chat_id: number | null; display_name: string | null }>
> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("reminders")
    .select(`
      id, user_id, content, remind_at, context, is_sent,
      users!inner(whatsapp_number, telegram_chat_id, display_name)
    `)
    .eq("is_sent", false)
    .lte("remind_at", now);

  if (!data) return [];

  return data.map((r) => {
    const users = r.users as unknown as {
      whatsapp_number: string | null;
      telegram_chat_id: number | null;
      display_name: string | null;
    };
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      content: r.content as string,
      remind_at: r.remind_at as string,
      context: r.context as string | null,
      is_sent: r.is_sent as boolean,
      whatsapp_number: users.whatsapp_number,
      telegram_chat_id: users.telegram_chat_id,
      display_name: users.display_name,
    };
  });
}

/**
 * Mark a reminder as sent.
 */
export async function markReminderSent(reminderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("reminders")
    .update({ is_sent: true })
    .eq("id", reminderId);
}

/**
 * Get upcoming reminders for a user.
 */
export async function getUpcomingReminders(
  userId: string,
  limit: number = 5,
): Promise<Reminder[]> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .eq("is_sent", false)
    .gte("remind_at", now)
    .order("remind_at")
    .limit(limit);

  return (data ?? []) as Reminder[];
}

/**
 * Format a reminder time for display.
 */
export function formatReminderTime(remindAt: string): string {
  const date = new Date(remindAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "less than an hour";
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  if (diffDays === 1) return "tomorrow";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
