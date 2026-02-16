import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { searchMemories } from "@/lib/memory/supermemory-client";

/**
 * GET /api/memories — List memories with optional search.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const query = searchParams.get("q");
  const type = searchParams.get("type");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Semantic search
  if (query) {
    const results = await searchMemories(query, userId, limit);
    return NextResponse.json({ memories: results, total: results.length });
  }

  // List from Supabase messages
  const supabase = getSupabaseAdmin();
  let queryBuilder = supabase
    .from("messages")
    .select("id, direction, message_type, content, media_description, metadata, created_at", { count: "exact" })
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) {
    queryBuilder = queryBuilder.eq("message_type", type);
  }

  const { data, count } = await queryBuilder;

  return NextResponse.json({ memories: data ?? [], total: count ?? 0 });
}
