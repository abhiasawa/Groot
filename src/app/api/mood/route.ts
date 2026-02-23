import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { logger } from "@/lib/logger";

const MOOD_SCORE: Record<string, number> = {
  great: 5, happy: 5, excited: 5, energetic: 5,
  good: 4, positive: 4, motivated: 4, calm: 4, grateful: 4,
  okay: 3, neutral: 3, fine: 3, busy: 3,
  low: 2, tired: 2, anxious: 2, stressed: 2, overwhelmed: 2,
  bad: 1, sad: 1, angry: 1, frustrated: 1, upset: 1,
};

/**
 * GET /api/mood?year=2026 — Daily moods + weekly trend.
 */
export async function GET(request: NextRequest) {
  const year = parseInt(request.nextUrl.searchParams.get("year") ?? new Date().getFullYear().toString());

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
  const startDate = `${year}-01-01T00:00:00`;
  const endDate = `${year}-12-31T23:59:59`;

  // Fetch outbound messages with mood in metadata
  const { data: messages } = await supabase
    .from("messages")
    .select("created_at, metadata")
    .eq("user_id", userId)
    .eq("direction", "outbound")
    .not("metadata", "is", null)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: true });

  // Extract daily moods
  const dailyMoodMap = new Map<string, string[]>();
  for (const msg of messages ?? []) {
    const meta = msg.metadata as Record<string, unknown> | null;
    const mood = (meta?.detectedMood as string) ?? (meta?.mood as string);
    if (!mood) continue;
    const dateKey = (msg.created_at as string).split("T")[0]!;
    if (!dailyMoodMap.has(dateKey)) dailyMoodMap.set(dateKey, []);
    dailyMoodMap.get(dateKey)!.push(mood.toLowerCase());
  }

  // Pick dominant mood per day
  const dailyMoods: Array<{ date: string; mood: string; score: number }> = [];
  for (const [date, moods] of dailyMoodMap) {
    const counts = new Map<string, number>();
    for (const m of moods) {
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    let dominant = moods[0]!;
    let maxCount = 0;
    for (const [m, c] of counts) {
      if (c > maxCount) { dominant = m; maxCount = c; }
    }
    dailyMoods.push({ date, mood: dominant, score: MOOD_SCORE[dominant] ?? 3 });
  }

  // Build weekly trend
  const weeklyMap = new Map<string, number[]>();
  for (const dm of dailyMoods) {
    const d = new Date(dm.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + 1); // Monday
    const key = weekStart.toISOString().split("T")[0]!;
    if (!weeklyMap.has(key)) weeklyMap.set(key, []);
    weeklyMap.get(key)!.push(dm.score);
  }

  const weeklyTrend = [...weeklyMap.entries()].map(([weekStart, scores]) => ({
    weekStart,
    avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
  })).sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  // Recent mood (last entry)
  const recentMood = dailyMoods.length > 0 ? dailyMoods[dailyMoods.length - 1]!.mood : null;

  logger.info({ userId, year, totalDays: dailyMoods.length, weeks: weeklyTrend.length }, "Mood data loaded");

  return NextResponse.json({ dailyMoods, weeklyTrend, recentMood }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } });
}
