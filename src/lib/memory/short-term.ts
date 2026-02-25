import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface ShortTermMessage {
  id: string;
  direction: string;
  message_type: string;
  content: string | null;
  media_description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Retrieve the last N messages for a user (short-term memory).
 * Returns messages in chronological order (oldest first).
 */
export async function getRecentMessages(
  userId: string,
  limit: number = 20,
): Promise<ShortTermMessage[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("messages")
    .select("id, direction, message_type, content, media_description, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error({ error, userId }, "Failed to fetch recent messages");
    return [];
  }

  const messages = (data ?? []).reverse() as ShortTermMessage[];
  logger.info({ userId, count: messages.length, limit }, "Recent messages fetched");
  return messages;
}

/**
 * Get today's inbound messages for a user (IST day boundary).
 */
export async function getTodayMessages(
  userId: string,
): Promise<ShortTermMessage[]> {
  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const todayStart = new Date(`${todayIST}T00:00:00+05:30`).toISOString();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, direction, message_type, content, media_description, metadata, created_at",
    )
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", todayStart)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error({ error, userId }, "Failed to fetch today's messages");
    return [];
  }

  return (data ?? []) as ShortTermMessage[];
}

/**
 * Get the user's reply to the last evening reflection prompt (if any).
 * Looks for the most recent proactive_history entry of type 'evening_reflection',
 * then finds the first inbound message after it (within a reasonable window).
 */
export async function getLastEveningReply(
  userId: string,
): Promise<{ question: string; reply: string } | null> {
  const supabase = getSupabaseAdmin();

  // Get last evening reflection sent to this user
  const { data: lastPrompt } = await supabase
    .from("proactive_history")
    .select("content, sent_at")
    .eq("user_id", userId)
    .eq("message_type", "evening_reflection")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastPrompt?.sent_at) return null;

  // Find the first inbound message after the evening prompt (within 14 hours —
  // covers replies that same night or early next morning)
  const windowEnd = new Date(
    new Date(lastPrompt.sent_at as string).getTime() + 14 * 60 * 60 * 1000,
  ).toISOString();

  const { data: reply } = await supabase
    .from("messages")
    .select("content")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gt("created_at", lastPrompt.sent_at as string)
    .lte("created_at", windowEnd)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!reply?.content) return null;

  return {
    question: lastPrompt.content as string,
    reply: reply.content as string,
  };
}

/**
 * Check if a user has sent any inbound messages today (IST boundary).
 */
export async function hasMessagedToday(userId: string): Promise<boolean> {
  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const todayStart = new Date(`${todayIST}T00:00:00+05:30`).toISOString();

  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("created_at", todayStart);

  return (count ?? 0) > 0;
}

/**
 * Store a Groot outbound response in the messages table.
 */
export async function storeOutboundMessage(
  userId: string,
  content: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("messages").insert({
    user_id: userId,
    direction: "outbound",
    message_type: "text",
    content,
    metadata,
  });

  if (error) {
    logger.error({ error, userId }, "Failed to store outbound message");
  }
}

/**
 * Get or create an active session for the user.
 * A session is considered active if the last activity was within 30 minutes.
 */
export async function getActiveSession(
  userId: string,
): Promise<{ id: string; message_count: number }> {
  const supabase = getSupabaseAdmin();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Try to find active session
  const { data: session } = await supabase
    .from("sessions")
    .select("id, message_count")
    .eq("user_id", userId)
    .eq("is_active", true)
    .gte("last_activity_at", thirtyMinAgo)
    .order("last_activity_at", { ascending: false })
    .limit(1)
    .single();

  if (session) {
    // Update last activity
    await supabase
      .from("sessions")
      .update({
        last_activity_at: new Date().toISOString(),
        message_count: session.message_count + 1,
      })
      .eq("id", session.id);

    return { id: session.id, message_count: session.message_count + 1 };
  }

  // Close any stale active sessions
  await supabase
    .from("sessions")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  // Create new session
  const { data: newSession, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      message_count: 1,
    })
    .select("id, message_count")
    .single();

  if (error || !newSession) {
    logger.error({ error, userId }, "Failed to create session");
    return { id: "unknown", message_count: 1 };
  }

  return { id: newSession.id, message_count: newSession.message_count };
}
