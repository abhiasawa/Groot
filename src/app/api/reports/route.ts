import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

/**
 * GET /api/reports — List weekly reports for a user.
 */
export async function GET() {
  let userId: string;
  try {
    const user = await getAuthenticatedPortalUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("weekly_reports")
    .select("id, week_start, week_end, summary, key_topics, mood_trend, insights, created_at")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(20);

  return NextResponse.json({ reports: data ?? [] });
}
