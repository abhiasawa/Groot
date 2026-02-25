import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

/**
 * GET /api/tasks — List tasks for a user.
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
  const { data } = await supabase
    .from("tasks")
    .select("id, content, category, is_completed, due_date, created_at")
    .eq("user_id", userId)
    .order("is_completed", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ tasks: data ?? [] }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
}

/**
 * PATCH /api/tasks — Toggle task completion.
 */
export async function PATCH(request: NextRequest) {
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

  const body = await request.json();
  const { taskId, is_completed } = body;

  if (!taskId || typeof is_completed !== "boolean") {
    return NextResponse.json({ error: "taskId and is_completed required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("tasks")
    .update({ is_completed })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * PUT /api/tasks — Update task content, due_date, category.
 */
export async function PUT(request: NextRequest) {
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

  const body = await request.json();
  const { taskId, content, due_date, category } = body;

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const update: Record<string, string | null> = {};
  if (content !== undefined) update.content = content;
  if (due_date !== undefined) update.due_date = due_date;
  if (category !== undefined) update.category = category;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
