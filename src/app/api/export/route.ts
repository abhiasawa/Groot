import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

/**
 * GET /api/export — Export all user data as JSON.
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

  const [userRes, profileRes, messagesRes, habitsRes, tasksRes, remindersRes, reportsRes] =
    await Promise.all([
      supabase.from("users").select("*").eq("id", userId).single(),
      supabase.from("user_profile").select("*").eq("user_id", userId),
      supabase
        .from("messages")
        .select("id, direction, message_type, content, media_description, metadata, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("habits").select("*").eq("user_id", userId),
      supabase.from("tasks").select("*").eq("user_id", userId),
      supabase.from("reminders").select("*").eq("user_id", userId),
      supabase.from("weekly_reports").select("*").eq("user_id", userId),
    ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    user: userRes.data,
    profile: profileRes.data ?? [],
    messages: messagesRes.data ?? [],
    habits: habitsRes.data ?? [],
    tasks: tasksRes.data ?? [],
    reminders: remindersRes.data ?? [],
    weekly_reports: reportsRes.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="groot-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
