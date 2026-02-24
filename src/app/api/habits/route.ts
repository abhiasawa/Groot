import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

interface HabitWithStats {
  id: string;
  name: string;
  category: string;
  target_value: number | null;
  target_unit: string | null;
  frequency: string | null;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  recentCheckins?: string[];
}

function mergeHabitEntries(existing: HabitWithStats, incoming: HabitWithStats, includeCheckins: boolean): HabitWithStats {
  const merged: HabitWithStats = {
    ...existing,
    target_value: existing.target_value ?? incoming.target_value,
    target_unit: existing.target_unit ?? incoming.target_unit,
    frequency: existing.frequency ?? incoming.frequency,
    current_streak: Math.max(existing.current_streak, incoming.current_streak),
    longest_streak: Math.max(existing.longest_streak, incoming.longest_streak),
    last_checkin_date:
      !existing.last_checkin_date
        ? incoming.last_checkin_date
        : !incoming.last_checkin_date
          ? existing.last_checkin_date
          : existing.last_checkin_date > incoming.last_checkin_date
            ? existing.last_checkin_date
            : incoming.last_checkin_date,
  };

  if (includeCheckins) {
    const union = new Set<string>([
      ...(existing.recentCheckins ?? []),
      ...(incoming.recentCheckins ?? []),
    ]);
    merged.recentCheckins = [...union].sort();
  }

  return merged;
}

/**
 * GET /api/habits — List habits with streak info and optional check-in history.
 *
 * Query params:
 *   include=checkins — also return last 30 days of check-in dates per habit
 */
export async function GET(request: NextRequest) {
  const includeCheckins = request.nextUrl.searchParams.get("include") === "checkins";

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

  // Fetch active habits
  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, category, target_value, target_unit, frequency, is_active, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at");

  if (!habits || habits.length === 0) {
    return NextResponse.json({ habits: [] }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } });
  }

  // Fetch streaks (and optionally checkins) in parallel
  const habitIds = habits.map((h) => h.id);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [{ data: streaks }, { data: checkins }] = await Promise.all([
    supabase
      .from("habit_streaks")
      .select("habit_id, current_streak, longest_streak, last_checkin_date")
      .in("habit_id", habitIds),
    includeCheckins
      ? supabase
          .from("habit_checkins")
          .select("habit_id, checked_in_at")
          .eq("user_id", userId)
          .in("habit_id", habitIds)
          .gte("checked_in_at", thirtyDaysAgo.toISOString())
          .order("checked_in_at", { ascending: true })
      : Promise.resolve({ data: null }),
  ]);

  const streakMap = new Map(
    (streaks ?? []).map((s) => [s.habit_id, s]),
  );

  const checkinMap = new Map<string, string[]>();
  for (const c of checkins ?? []) {
    const hid = c.habit_id as string;
    const dateStr = (c.checked_in_at as string).split("T")[0]!;
    if (!checkinMap.has(hid)) checkinMap.set(hid, []);
    const existing = checkinMap.get(hid)!;
    if (!existing.includes(dateStr)) existing.push(dateStr);
  }

  // Merge habits with streaks (and optionally checkins)
  const expandedHabits: HabitWithStats[] = habits.map((h) => {
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
      ...(includeCheckins ? { recentCheckins: checkinMap.get(h.id) ?? [] } : {}),
    };
  });

  // Historical duplicate rows can exist for the same habit name.
  // Deduplicate by normalized name for consistent UI and reporting.
  const dedupedByName = new Map<string, HabitWithStats>();
  const orderedKeys: string[] = [];
  for (const habit of expandedHabits) {
    const key = habit.name.trim().toLowerCase();
    const existing = dedupedByName.get(key);
    if (!existing) {
      dedupedByName.set(key, habit);
      orderedKeys.push(key);
      continue;
    }
    dedupedByName.set(key, mergeHabitEntries(existing, habit, includeCheckins));
  }

  const habitsWithStreaks = orderedKeys
    .map((key) => dedupedByName.get(key)!)
    .map((habit) => {
      if (!includeCheckins) return habit;
      return {
        ...habit,
        recentCheckins: (habit.recentCheckins ?? []).slice(-30),
      };
    });

  return NextResponse.json({ habits: habitsWithStreaks }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } });
}
