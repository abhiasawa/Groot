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

const POSITIVE_WORDS = [
  "happy", "great", "excited", "awesome", "nice", "good", "grateful",
  "motivated", "progress", "win", "worked", "better",
];

const NEGATIVE_WORDS = [
  "sad", "stressed", "anxious", "overwhelmed", "angry", "upset",
  "frustrated", "tired", "bad", "worried", "burnout", "exhausted",
];

function normalizeMood(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  return normalized in MOOD_SCORE ? normalized : null;
}

function inferMoodFromText(text: string): string | null {
  const normalized = text.toLowerCase();
  const positiveHits = POSITIVE_WORDS.filter((word) => normalized.includes(word)).length;
  const negativeHits = NEGATIVE_WORDS.filter((word) => normalized.includes(word)).length;
  if (positiveHits === 0 && negativeHits === 0) return null;
  if (positiveHits > negativeHits) return "good";
  if (negativeHits > positiveHits) return "low";
  return "okay";
}

/**
 * POST /api/mood — Record an explicit mood check-in.
 * Body: { mood: string }
 */
export async function POST(request: NextRequest) {
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

  const body = (await request.json()) as { mood?: string };
  const moodName = body.mood?.trim().toLowerCase();
  if (!moodName || !(moodName in MOOD_SCORE)) {
    return NextResponse.json({ error: "Invalid mood value" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Insert as an inbound message with explicit mood metadata.
  // The GET handler already prioritises metadata.mood over text inference.
  const { error } = await supabase.from("messages").insert({
    user_id: userId,
    direction: "inbound",
    message_type: "text",
    content: `Mood check-in: ${moodName}`,
    metadata: { mood: moodName, source: "manual_checkin" },
  });

  if (error) {
    logger.error({ error, userId }, "Failed to record mood check-in");
    return NextResponse.json({ error: "Failed to record mood" }, { status: 500 });
  }

  logger.info({ userId, mood: moodName }, "Manual mood check-in recorded");

  return NextResponse.json({ ok: true, mood: moodName, score: MOOD_SCORE[moodName] ?? 3 });
}

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

  // Fetch both inbound and outbound; prefer explicit metadata mood,
  // but infer from text as a fallback so mood doesn't stay blank.
  const { data: messages } = await supabase
    .from("messages")
    .select("created_at, direction, content, media_description, metadata")
    .eq("user_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: true });

  // Extract daily moods
  const dailyMoodMap = new Map<string, string[]>();
  const activeDays = new Set<string>();
  for (const msg of messages ?? []) {
    const dateKey = (msg.created_at as string).split("T")[0]!;
    activeDays.add(dateKey);

    const meta = msg.metadata as Record<string, unknown> | null;
    const explicitMood = normalizeMood(
      ((meta?.detectedMood as string | undefined) ?? (meta?.mood as string | undefined) ?? ""),
    );

    let mood = explicitMood;
    if (!mood && msg.direction === "inbound") {
      const text = `${msg.content ?? ""}\n${msg.media_description ?? ""}`.trim();
      if (text.length > 0) {
        mood = inferMoodFromText(text);
      }
    }

    if (mood) {
      if (!dailyMoodMap.has(dateKey)) dailyMoodMap.set(dateKey, []);
      dailyMoodMap.get(dateKey)!.push(mood);
    }
  }

  // Fallback: if we have activity on a day but no detected/inferred mood,
  // classify it as neutral so the mood timeline doesn't look broken.
  for (const dateKey of activeDays) {
    if (!dailyMoodMap.has(dateKey)) {
      dailyMoodMap.set(dateKey, ["okay"]);
    }
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
    const mondayOffset = (d.getDay() + 6) % 7; // Monday-based week
    weekStart.setDate(d.getDate() - mondayOffset);
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
