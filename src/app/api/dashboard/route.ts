import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

/**
 * GET /api/dashboard — Dashboard stats for a user.
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
