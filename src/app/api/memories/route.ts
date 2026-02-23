import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { searchMemories } from "@/lib/memory/supermemory-client";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

/**
 * GET /api/memories — List memories with optional search, date filtering, and calendar support.
 *
 * Query params:
 *   q      — semantic search query
 *   type   — filter by message_type
 *   date   — YYYY-MM-DD: filter to a specific day
 *   month  — YYYY-MM: return just dates with entries (for calendar dots)
 *   limit  — max results (default 20)
 *   offset — pagination offset
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const type = searchParams.get("type");
  const date = searchParams.get("date");
  const month = searchParams.get("month");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

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

  const supabase = getSupabaseAdmin();

  // Calendar mode: return just dates with entries for a given month
  if (month) {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return NextResponse.json({ dates: [] });
    const startOfMonth = `${month}-01T00:00:00`;
    const lastDay = new Date(y, m, 0).getDate();
    const endOfMonth = `${month}-${String(lastDay).padStart(2, "0")}T23:59:59`;

    const { data } = await supabase
      .from("messages")
      .select("created_at")
      .eq("user_id", userId)
      .eq("direction", "inbound")
      .not("content", "is", null)
      .gte("created_at", startOfMonth)
      .lte("created_at", endOfMonth);

    const dates = [...new Set((data ?? []).map(d => (d.created_at as string).split("T")[0]))];
    return NextResponse.json({ dates }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } });
  }

  // Semantic search — try Supermemory first, fall back to Supabase ilike
  if (query) {
    const results = await searchMemories(query, userId, limit);
    if (results.length > 0) {
      return NextResponse.json({ memories: results, total: results.length }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } });
    }

    // Fallback: search messages table directly with ilike
    const pattern = `%${query}%`;
    const { data: fallbackData, count: fallbackCount } = await supabase
      .from("messages")
      .select("id, direction, message_type, content, media_description, metadata, created_at", { count: "exact" })
      .eq("user_id", userId)
      .eq("direction", "inbound")
      .not("content", "is", null)
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({ memories: fallbackData ?? [], total: fallbackCount ?? 0 }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } });
  }

  // List from Supabase messages
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

  // Date filter — specific day
  if (date) {
    queryBuilder = queryBuilder
      .gte("created_at", `${date}T00:00:00`)
      .lt("created_at", `${date}T23:59:59.999`);
  }

  const { data, count } = await queryBuilder;

  return NextResponse.json({ memories: data ?? [], total: count ?? 0 }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } });
}
