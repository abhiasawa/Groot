import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface UnsurfacedInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
  severity: string;
}

/**
 * Fetch unsurfaced insights for a user, ordered by severity then recency.
 * Used by upgraded crons to inject pattern context into messages.
 */
export async function getUnsurfacedInsights(
  userId: string,
  limit: number = 3,
): Promise<UnsurfacedInsight[]> {
  const supabase = getSupabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("pattern_insights")
    .select("id, insight_type, title, description, data, severity")
    .eq("user_id", userId)
    .eq("surfaced", false)
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  // Sort: urgent > notable > info
  const severityOrder: Record<string, number> = { urgent: 0, notable: 1, info: 2 };
  return (data as UnsurfacedInsight[]).sort(
    (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
  );
}

/**
 * Mark insights as surfaced after they've been referenced in a message.
 */
export async function markInsightsSurfaced(
  insightIds: string[],
  surfacedBy: string,
): Promise<void> {
  if (insightIds.length === 0) return;
  const supabase = getSupabaseAdmin();
  await supabase
    .from("pattern_insights")
    .update({ surfaced: true, surfaced_by: surfacedBy })
    .in("id", insightIds);
}
