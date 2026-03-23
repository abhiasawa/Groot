import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface TaskAction {
  action: "list" | "complete" | "delete";
  match?: string;
}

/**
 * Execute task actions detected from conversation metadata.
 * Returns the number of tasks affected.
 */
export async function executeTaskActions(
  userId: string,
  actions: TaskAction[],
): Promise<void> {
  if (actions.length === 0) return;

  const supabase = getSupabaseAdmin();

  for (const action of actions) {
    if (action.action === "list") {
      // Listing is handled by injecting tasks into context — no DB action needed
      continue;
    }

    if (!action.match) {
      logger.warn({ userId, action }, "Task action missing match string");
      continue;
    }

    const match = action.match.toLowerCase();

    // Find the best matching pending task using fuzzy content match
    const { data: candidates } = await supabase
      .from("tasks")
      .select("id, content")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!candidates || candidates.length === 0) continue;

    // Score by substring match — find the task whose content best matches
    const scored = candidates.map((t) => ({
      ...t,
      score: contentMatchScore(t.content.toLowerCase(), match),
    }));
    const best = scored.reduce((a, b) => (a.score > b.score ? a : b));

    if (best.score === 0) {
      logger.info({ userId, match }, "No matching task found for action");
      continue;
    }

    if (action.action === "complete") {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: true })
        .eq("id", best.id)
        .eq("user_id", userId);

      if (error) {
        logger.warn({ error, userId, taskId: best.id }, "Failed to complete task via chat");
      } else {
        logger.info({ userId, taskId: best.id, content: best.content }, "Task completed via chat");
      }
    } else if (action.action === "delete") {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", best.id)
        .eq("user_id", userId);

      if (error) {
        logger.warn({ error, userId, taskId: best.id }, "Failed to delete task via chat");
      } else {
        logger.info({ userId, taskId: best.id, content: best.content }, "Task deleted via chat");
      }
    }
  }
}

/**
 * Simple content matching: scores based on word overlap and substring presence.
 */
function contentMatchScore(content: string, match: string): number {
  // Exact substring match gets highest score
  if (content.includes(match)) return 100;

  // Word overlap scoring
  const matchWords = match.split(/\s+/).filter((w) => w.length > 2);
  if (matchWords.length === 0) return 0;

  let matched = 0;
  for (const word of matchWords) {
    if (content.includes(word)) matched++;
  }

  return (matched / matchWords.length) * 80;
}
