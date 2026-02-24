import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

const NOTIFICATION_KEYS = [
  "morning_checkin",
  "evening_journal",
  "weekly_report",
  "feature_tips",
] as const;

type NotificationKey = typeof NOTIFICATION_KEYS[number];

function isNotificationKey(value: string): value is NotificationKey {
  return (NOTIFICATION_KEYS as readonly string[]).includes(value);
}

/**
 * GET /api/settings — Fetch notification preferences for a user.
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
    .from("user_profile")
    .select("key, value")
    .eq("user_id", userId)
    .eq("category", "preference")
    .in("key", [...NOTIFICATION_KEYS]);

  const prefs: Record<NotificationKey, boolean> = {
    morning_checkin: true,
    evening_journal: true,
    weekly_report: true,
    feature_tips: true,
  };

  for (const row of data ?? []) {
    const key = row.key as string;
    if (isNotificationKey(key)) {
      prefs[key] = row.value === "true";
    }
  }

  return NextResponse.json({ preferences: prefs }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } });
}

/**
 * PATCH /api/settings — Update a notification preference.
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { key, value } = (body ?? {}) as { key?: string; value?: boolean };

  if (!key || typeof value !== "boolean" || !isNotificationKey(key)) {
    return NextResponse.json({ error: "key and value (boolean) required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_profile")
    .upsert(
      {
        user_id: userId,
        category: "preference",
        key,
        value: String(value),
        confidence: 1.0,
        source: "portal_settings",
      },
      { onConflict: "user_id,category,key" },
    );

  if (error) {
    return NextResponse.json({ error: "Failed to update preference" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
