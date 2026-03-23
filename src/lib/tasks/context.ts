import { getSupabaseAdmin } from "@/lib/supabase/server";

interface TaskForContext {
  id: string;
  content: string;
  category: string;
  due_date: string | null;
}

/**
 * Fetch pending tasks for injection into AI context.
 * Returns up to 15 most recent pending tasks.
 */
export async function getPendingTasksForContext(userId: string): Promise<TaskForContext[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tasks")
    .select("id, content, category, due_date")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(15);

  return data ?? [];
}
