import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/settings — Fetch notification preferences for a user.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("user_profile")
    .select("key, value")
    .eq("user_id", userId)
    .eq("category", "preference");

  const prefs: Record<string, boolean> = {
    morning_checkin: true,
    evening_journal: true,
    weekly_report: true,
    feature_tips: true,
  };

  for (const row of data ?? []) {
    prefs[row.key as string] = row.value === "true";
  }

  return NextResponse.json({ preferences: prefs });
}

/**
 * PATCH /api/settings — Update a notification preference.
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { userId, key, value } = body;

  if (!userId || !key || typeof value !== "boolean") {
    return NextResponse.json({ error: "userId, key, and value (boolean) required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  await supabase
    .from("user_profile")
    .upsert(
      {
        user_id: userId,
        category: "preference",
        key,
        value: String(value),
        confidence: 1.0,
        source: "web_portal",
      },
      { onConflict: "user_id,category,key" },
    );

  return NextResponse.json({ ok: true });
}
