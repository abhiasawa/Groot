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
