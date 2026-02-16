import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/tasks — List tasks for a user.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tasks")
    .select("id, content, category, is_completed, due_date, created_at")
    .eq("user_id", userId)
    .order("is_completed", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ tasks: data ?? [] });
}

/**
 * PATCH /api/tasks — Toggle task completion.
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { taskId, is_completed } = body;

  if (!taskId || typeof is_completed !== "boolean") {
    return NextResponse.json({ error: "taskId and is_completed required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("tasks")
    .update({ is_completed })
    .eq("id", taskId);

  if (error) {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
