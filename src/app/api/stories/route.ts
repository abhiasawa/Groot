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

  const allStories = await loadStoryCandidates(supabase, userId);
  const stories = allStories.slice(offset, offset + limit);

  return NextResponse.json(
    { stories, total: allStories.length },
    { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } },
  );
}

interface StoryRow {
  id: string;
  content: string | null;
  media_description: string | null;
  message_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  synced_to_supermemory: boolean | null;
}

const GENERIC_TAGS = new Set(["general", "daily-life", "daily_life"]);

function normalizeTag(tag: string): string {
  const normalized = tag.trim().toLowerCase();
  return normalized === "general" ? "daily-life" : normalized;
}

function getMemoryTags(metadata: Record<string, unknown> | null): string[] {
  const tags = metadata?.memoryTags;
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag): tag is string => typeof tag === "string")
    .map(normalizeTag);
}

function hasSubstantiveContent(message: StoryRow): boolean {
  const contentLength = message.content?.trim().length ?? 0;
  const mediaLength = message.media_description?.trim().length ?? 0;
  return contentLength + mediaLength >= 160;
}

function isStoryCandidate(message: StoryRow): boolean {
  if (!message.content && !message.media_description) return false;

  const meta = message.metadata;
  if (meta?.shouldStoreMemory === true) return true;
  if (message.synced_to_supermemory) return true;

  const tags = getMemoryTags(meta);
  if (tags.some((tag) => !GENERIC_TAGS.has(tag))) return true;

  return hasSubstantiveContent(message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadStoryCandidates(supabase: any, userId: string): Promise<StoryRow[]> {
  const { data } = await supabase
    .from("messages")
    .select("id, content, media_description, message_type, metadata, created_at, synced_to_supermemory")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .range(0, 1999);

  return ((data ?? []) as StoryRow[]).filter(isStoryCandidate);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getStoryStats(supabase: any, userId: string) {
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStart = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;
  const lastMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;

  const stories = await loadStoryCandidates(supabase, userId);

  const tagCounts = new Map<string, number>();
  for (const msg of stories) {
    for (const tag of getMemoryTags(msg.metadata)) {
      if (!GENERIC_TAGS.has(tag)) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  const thisMonthCount = stories.filter((story) => story.created_at >= thisMonthStart).length;
  const lastMonthCount = stories.filter(
    (story) => story.created_at >= lastMonthStart && story.created_at < lastMonthEnd,
  ).length;
  const streak = calculateStreak(stories.map((story) => ({ created_at: story.created_at })));

  return {
    total: stories.length,
    thisMonth: thisMonthCount,
    lastMonth: lastMonthCount,
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
