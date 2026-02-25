import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { logger } from "@/lib/logger";

/**
 * POST /api/mobile/onboard — Complete onboarding for a mobile user.
 *
 * Body:
 * - displayName: string (user's preferred name)
 * - checkinTime: string (preferred morning check-in time, e.g. "08:00")
 * - preferences: { morning_checkin: boolean, evening_journal: boolean, voice_checkins: boolean }
 */
export async function POST(request: NextRequest) {
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

  try {
    const body = (await request.json()) as {
      displayName?: string;
      checkinTime?: string;
      preferences?: Record<string, boolean>;
    };

    const supabase = getSupabaseAdmin();

    // Update user profile
    const updates: Record<string, unknown> = {
      onboarding_step: "completed",
      onboarding_completed_at: new Date().toISOString(),
    };
    if (body.displayName) {
      updates.display_name = body.displayName;
    }

    await supabase.from("users").update(updates).eq("id", userId);

    // Update preferences
    if (body.preferences) {
      for (const [key, value] of Object.entries(body.preferences)) {
        await supabase.from("user_preferences").upsert(
          { user_id: userId, key, value },
          { onConflict: "user_id,key" },
        );
      }
    }

    // Store checkin time as a profile fact
    if (body.checkinTime) {
      await supabase.from("user_profile_facts").upsert(
        {
          user_id: userId,
          key: "preferred_checkin_time",
          value: body.checkinTime,
          confidence: 1.0,
          source: "onboarding",
        },
        { onConflict: "user_id,key" },
      );
    }

    logger.info({ userId }, "User completed mobile onboarding");

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error, userId }, "Failed to complete onboarding");
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}
