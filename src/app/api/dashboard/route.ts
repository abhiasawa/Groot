import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/dashboard — Dashboard stats for a user.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const [tasksRes, remindersRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("is_completed", false),
    supabase
      .from("reminders")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("is_sent", false),
  ]);

  return NextResponse.json({
    tasks: tasksRes.count ?? 0,
    reminders: remindersRes.count ?? 0,
  });
}
