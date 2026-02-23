import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

/**
 * GET /api/stories — Storyworthy moments (memories worth keeping).
 *
 * Returns inbound messages where metadata->shouldStoreMemory is true,
 * grouped by week with streak/stats info.
 *
 * Query params:
 *   limit  — max results (default 50)
 *   offset — pagination offset
 *   stats  — if "true", return only aggregate stats (streak, total, monthly)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const statsOnly = searchParams.get("stats") === "true";

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

  // Stats mode — return aggregates for the stats strip
  if (statsOnly) {
    const stats = await getStoryStats(supabase, userId);
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  }

  // Fetch stories: inbound messages that are stored as long-term memories
  // Strategy: messages with shouldStoreMemory=true in metadata, OR messages with memoryTags
  // No null-content filter — voice messages have content=null, transcription in media_description
  const { data, count } = await supabase
    .from("messages")
    .select("id, content, media_description, message_type, metadata, created_at", { count: "exact" })
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter in JS: must have content AND be explicitly marked as storyworthy
  // Stories are curated highlights — only genuinely meaningful moments, not every message
  const stories = (data ?? []).filter((m) => {
    if (!m.content && !m.media_description) return false;
    const meta = m.metadata as Record<string, unknown> | null;
    if (!meta) return false;
    return meta.shouldStoreMemory === true;
  });

  return NextResponse.json(
    { stories, total: count ?? 0 },
    { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } },
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getStoryStats(supabase: any, userId: string) {
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStart = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;
  const lastMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;

  // Total stories
  const { count: total } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .not("metadata", "is", null);

  // This month count
  const { count: thisMonth } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .not("metadata", "is", null)
    .gte("created_at", thisMonthStart);

  // Last month count
  const { count: lastMonthCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .not("metadata", "is", null)
    .gte("created_at", lastMonthStart)
    .lt("created_at", lastMonthEnd);

  // Streak calculation: count consecutive days with at least one story
  const { data: recentDays } = await supabase
    .from("messages")
    .select("created_at")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .not("metadata", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const streak = calculateStreak(recentDays ?? []);

  // Top tags
  const { data: taggedMessages } = await supabase
    .from("messages")
    .select("metadata")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .not("metadata", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const tagCounts = new Map<string, number>();
  for (const msg of taggedMessages ?? []) {
    const tags = (msg.metadata as Record<string, unknown>)?.memoryTags;
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (typeof tag === "string") {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  return {
    total: total ?? 0,
    thisMonth: thisMonth ?? 0,
    lastMonth: lastMonthCount ?? 0,
    streak,
    topTags,
  };
}

function calculateStreak(messages: Array<{ created_at: string }>): number {
  if (messages.length === 0) return 0;

  // Get unique dates (YYYY-MM-DD)
  const dates = [...new Set(messages.map((m) => m.created_at.split("T")[0]!))].sort().reverse();

  if (dates.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0]!;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]!;

  // Streak must include today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const current = new Date(dates[i - 1]!);
    const prev = new Date(dates[i]!);
    const diffDays = Math.round((current.getTime() - prev.getTime()) / 86400000);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
