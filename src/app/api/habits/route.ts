import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

/**
 * GET /api/habits — List habits with streak info for a user.
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

  // Fetch active habits
  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, category, target_value, target_unit, frequency, is_active, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at");

  if (!habits || habits.length === 0) {
    return NextResponse.json({ habits: [] });
  }

  // Fetch streak info for all habits
  const habitIds = habits.map((h) => h.id);
  const { data: streaks } = await supabase
    .from("habit_streaks")
    .select("habit_id, current_streak, longest_streak, last_checkin_date")
    .in("habit_id", habitIds);

  const streakMap = new Map(
    (streaks ?? []).map((s) => [s.habit_id, s]),
  );

  // Merge habits with streaks
  const habitsWithStreaks = habits.map((h) => {
    const streak = streakMap.get(h.id);
    return {
      id: h.id,
      name: h.name,
      category: h.category ?? "general",
      target_value: h.target_value,
      target_unit: h.target_unit,
      frequency: h.frequency,
      current_streak: streak?.current_streak ?? 0,
      longest_streak: streak?.longest_streak ?? 0,
      last_checkin_date: streak?.last_checkin_date ?? null,
    };
  });

  return NextResponse.json({ habits: habitsWithStreaks });
}
