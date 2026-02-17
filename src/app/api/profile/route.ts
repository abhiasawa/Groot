import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { logger } from "@/lib/logger";

/**
 * GET /api/profile — User profile facts grouped by category.
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
  const { data, error } = await supabase
    .from("user_profile")
    .select("id, category, key, value, confidence, source, last_mentioned_at, created_at")
    .eq("user_id", userId)
    .order("category")
    .order("key");

  if (error) {
    logger.error({ error, userId }, "Failed to fetch profile for portal");
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }

  const facts: Record<string, Array<{ id: string; key: string; value: string; confidence: number; source: string; lastMentioned: string | null }>> = {
    static: [],
    dynamic: [],
    preference: [],
    goal: [],
  };

  for (const row of data ?? []) {
    const cat = (row.category as string) || "dynamic";
    if (!facts[cat]) facts[cat] = [];
    facts[cat]!.push({
      id: row.id as string,
      key: (row.key as string).replace(/_/g, " "),
      value: row.value as string,
      confidence: (row.confidence as number) ?? 1,
      source: row.source as string,
      lastMentioned: row.last_mentioned_at as string | null,
    });
  }

  logger.info({ userId, totalFacts: (data ?? []).length }, "Profile facts loaded for portal");
  return NextResponse.json({ facts });
}

/**
 * DELETE /api/profile — Delete a profile fact.
 */
export async function DELETE(request: Request) {
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

  const { factId } = await request.json();
  if (!factId) {
    return NextResponse.json({ error: "factId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_profile")
    .delete()
    .eq("id", factId)
    .eq("user_id", userId);

  if (error) {
    logger.error({ error, factId, userId }, "Failed to delete profile fact");
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  logger.info({ factId, userId }, "Profile fact deleted");
  return NextResponse.json({ ok: true });
}
