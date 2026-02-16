import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/reports — List weekly reports for a user.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("weekly_reports")
    .select("id, week_start, week_end, summary, key_topics, mood_trend, created_at")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(20);

  return NextResponse.json({ reports: data ?? [] });
}
