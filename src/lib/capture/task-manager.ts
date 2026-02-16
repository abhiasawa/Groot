import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface Task {
  id: string;
  user_id: string;
  content: string;
  category: string;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
}

/**
 * Create a new task.
 */
export async function createTask(
  userId: string,
  content: string,
  category: string = "todo",
  dueDate?: string,
): Promise<Task> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      content,
      category,
      due_date: dueDate ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    logger.error({ error, userId }, "Failed to create task");
    throw new Error("Failed to create task");
  }

  return data as Task;
}

/**
 * Get all pending tasks for a user.
 */
export async function getPendingTasks(
  userId: string,
  category?: string,
): Promise<Task[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data } = await query;
  return (data ?? []) as Task[];
}

/**
 * Mark a task as completed.
 */
export async function completeTask(taskId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("tasks")
    .update({
      is_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);
}

/**
 * Get a summary of tasks for display.
 */
export async function getTaskSummary(userId: string): Promise<string> {
  const tasks = await getPendingTasks(userId);
  if (tasks.length === 0) {
    return "No pending tasks. You're all caught up!";
  }

  const lines = tasks
    .slice(0, 10)
    .map((t, i) => `${i + 1}. ${t.content}`);

  return `*Your tasks (${tasks.length}):*\n${lines.join("\n")}`;
}
