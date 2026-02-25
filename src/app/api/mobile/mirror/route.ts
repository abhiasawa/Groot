import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { calculateMilestones } from "@/lib/milestones/engine";
import { detectPatterns } from "@/lib/patterns/detector";
import { getUserProfileSummary } from "@/lib/memory/profile-builder";
import { logger } from "@/lib/logger";

/**
 * GET /api/mobile/mirror — Data for the Mirror screen.
 *
 * Returns:
 * - narrativeBio: LLM-generated narrative summary of the user
 * - patterns: detected behavioral patterns
 * - milestones: achieved milestones
 * - weeklyReports: recent weekly reports (last 4)
 * - profileFacts: key facts from user profile
 * - stats: overall stats (total messages, memories, days active)
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

  const supabase = getSupabaseAdmin();

  try {
    // Run data fetches in parallel
    const [
      profileSummary,
      milestones,
      patterns,
      reportsResult,
      factsResult,
      messageCountResult,
      memoryCountResult,
      userResult,
    ] = await Promise.all([
      getUserProfileSummary(userId),
      calculateMilestones(userId),
      detectPatterns(userId),
      supabase
        .from("weekly_reports")
        .select("id, week_start, week_end, summary, key_topics, mood_trend, insights, created_at")
        .eq("user_id", userId)
        .order("week_start", { ascending: false })
        .limit(4),
      supabase
        .from("user_profile_facts")
        .select("id, key, value, confidence, source, last_mentioned_at")
        .eq("user_id", userId)
        .order("confidence", { ascending: false })
        .limit(20),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("direction", "incoming"),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("synced_to_supermemory", true),
      supabase
        .from("users")
        .select("created_at, display_name")
        .eq("id", userId)
        .single(),
    ]);

    const daysActive = userResult.data?.created_at
      ? Math.floor((Date.now() - new Date(userResult.data.created_at as string).getTime()) / 86400000)
      : 0;

    const profileFacts = (factsResult.data ?? []).map((f) => ({
      id: f.id as string,
      key: f.key as string,
      value: f.value as string,
      confidence: f.confidence as number,
      source: f.source as string,
      lastMentioned: f.last_mentioned_at as string | null,
    }));

    const weeklyReports = (reportsResult.data ?? []).map((r) => ({
      id: r.id as string,
      week_start: r.week_start as string,
      week_end: r.week_end as string,
      summary: r.summary as string,
      key_topics: r.key_topics as string[] | null,
      mood_trend: r.mood_trend as string | null,
      insights: r.insights as string | null,
      created_at: r.created_at as string,
    }));

    return NextResponse.json({
      narrativeBio: profileSummary || null,
      patterns,
      milestones,
      weeklyReports,
      profileFacts,
      stats: {
        totalMessages: messageCountResult.count ?? 0,
        totalMemories: memoryCountResult.count ?? 0,
        daysActive,
        displayName: (userResult.data?.display_name as string | null) ?? null,
      },
    });
  } catch (error) {
    logger.error({ error, userId }, "Failed to generate mirror data");
    return NextResponse.json({ error: "Failed to load mirror data" }, { status: 500 });
  }
}
