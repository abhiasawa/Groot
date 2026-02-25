import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { logger } from "@/lib/logger";

/**
 * GET /api/mobile/messages — Fetch conversation history for the chat screen.
 *
 * Query params:
 *   limit   - Number of messages (default 50, max 100)
 *   before  - Cursor: fetch messages older than this ID
 *   after   - Cursor: fetch messages newer than this ID
 */
export async function GET(request: NextRequest) {
  let userId: string;
  try {
    const user = await getAuthenticatedPortalUser(request);
    userId = user.id;
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const beforeId = searchParams.get("before");
  const afterId = searchParams.get("after");

  const supabase = getSupabaseAdmin();

  try {
    let query = supabase
      .from("messages")
      .select("id, direction, message_type, content, media_url, media_description, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit + 1); // +1 to detect has_more

    // Cursor-based pagination
    if (beforeId) {
      // Get the created_at of the cursor message
      const { data: cursorMsg } = await supabase
        .from("messages")
        .select("created_at")
        .eq("id", beforeId)
        .single();

      if (cursorMsg) {
        query = query.lt("created_at", cursorMsg.created_at);
      }
    } else if (afterId) {
      const { data: cursorMsg } = await supabase
        .from("messages")
        .select("created_at")
        .eq("id", afterId)
        .single();

      if (cursorMsg) {
        query = query.gt("created_at", cursorMsg.created_at);
        // When fetching newer messages, we want ascending order
        query = supabase
          .from("messages")
          .select("id, direction, message_type, content, media_url, media_description, metadata, created_at")
          .eq("user_id", userId)
          .gt("created_at", cursorMsg.created_at)
          .order("created_at", { ascending: true })
          .limit(limit + 1);
      }
    }

    const { data: messages, error } = await query;

    if (error) {
      logger.error({ error, userId }, "Failed to fetch messages");
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    const hasMore = (messages?.length ?? 0) > limit;
    const trimmed = (messages ?? []).slice(0, limit);

    // For "before" queries (default), messages are in DESC order — reverse to chronological
    // For "after" queries, they're already in ASC order
    const chronological = afterId ? trimmed : trimmed.reverse();

    return NextResponse.json({
      messages: chronological.map((m) => ({
        id: m.id,
        direction: m.direction,
        message_type: m.message_type,
        content: m.content,
        media_url: m.media_url,
        media_description: m.media_description,
        metadata: m.metadata,
        created_at: m.created_at,
      })),
      has_more: hasMore,
      cursor: hasMore && trimmed.length > 0 ? trimmed[trimmed.length - 1]!.id : null,
    });
  } catch (error) {
    logger.error({ error, userId }, "Messages endpoint failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
