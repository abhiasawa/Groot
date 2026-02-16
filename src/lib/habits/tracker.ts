import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  frequency: string;
  target_value: number | null;
  target_unit: string | null;
  reminder_time: string | null;
  is_active: boolean;
}

export interface HabitCheckin {
  id: string;
  habit_id: string;
  value: number | null;
  note: string | null;
  mood: string | null;
  checked_in_at: string;
}

export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
}

const MILESTONE_DAYS = [3, 7, 14, 21, 30, 50, 100];

/**
 * Create a new habit for a user.
 */
export async function createHabit(
  userId: string,
  name: string,
  options?: {
    description?: string;
    category?: string;
    targetValue?: number;
    targetUnit?: string;
    frequency?: string;
  },
): Promise<Habit> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: userId,
      name,
      description: options?.description ?? null,
      category: options?.category ?? null,
      target_value: options?.targetValue ?? null,
      target_unit: options?.targetUnit ?? null,
      frequency: options?.frequency ?? "daily",
    })
    .select()
    .single();

  if (error || !data) {
    logger.error({ error, userId, name }, "Failed to create habit");
    throw new Error("Failed to create habit");
  }

  // Initialize streak record
  await supabase.from("habit_streaks").insert({
    habit_id: data.id,
    user_id: userId,
    current_streak: 0,
    longest_streak: 0,
  });

  logger.info({ habitId: data.id, userId, name }, "Habit created");
  return data as Habit;
}

/**
 * Get all active habits for a user.
 */
export async function getActiveHabits(userId: string): Promise<Habit[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at");

  return (data ?? []) as Habit[];
}

/**
 * Record a habit check-in and update streaks.
 * Returns the streak info and whether it's a milestone.
 */
export async function recordCheckin(
  userId: string,
  habitId: string,
  value?: number,
  note?: string,
  mood?: string,
): Promise<{ streak: StreakInfo; isMilestone: boolean; milestoneDay?: number }> {
  const supabase = getSupabaseAdmin();

  // Insert check-in
  await supabase.from("habit_checkins").insert({
    habit_id: habitId,
    user_id: userId,
    value: value ?? null,
    note: note ?? null,
    mood: mood ?? null,
  });

  // Update streak
  const today = new Date().toISOString().split("T")[0]!;
  const { data: streakData } = await supabase
    .from("habit_streaks")
    .select("*")
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .single();

  let currentStreak = 1;
  let longestStreak = 1;

  if (streakData) {
    const lastDate = streakData.last_checkin_date as string | null;
    if (lastDate) {
      const lastCheckin = new Date(lastDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 0) {
        // Same day — don't increment streak
        currentStreak = (streakData.current_streak as number) || 1;
      } else if (diffDays === 1) {
        // Consecutive day
        currentStreak = ((streakData.current_streak as number) || 0) + 1;
      } else {
        // Streak broken
        currentStreak = 1;
      }
    }
    longestStreak = Math.max(currentStreak, (streakData.longest_streak as number) || 0);
  }

  await supabase
    .from("habit_streaks")
    .upsert(
      {
        habit_id: habitId,
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_checkin_date: today,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "habit_id" },
    );

  const streak: StreakInfo = {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_checkin_date: today,
  };

  const isMilestone = MILESTONE_DAYS.includes(currentStreak);

  return {
    streak,
    isMilestone,
    milestoneDay: isMilestone ? currentStreak : undefined,
  };
}

/**
 * Get streak info for a habit.
 */
export async function getStreakInfo(
  userId: string,
  habitId: string,
): Promise<StreakInfo> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("habit_streaks")
    .select("current_streak, longest_streak, last_checkin_date")
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .single();

  return {
    current_streak: (data?.current_streak as number) ?? 0,
    longest_streak: (data?.longest_streak as number) ?? 0,
    last_checkin_date: (data?.last_checkin_date as string) ?? null,
  };
}

/**
 * Get recent check-ins for a habit (for trend data).
 */
export async function getRecentCheckins(
  habitId: string,
  limit: number = 30,
): Promise<HabitCheckin[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("habit_checkins")
    .select("*")
    .eq("habit_id", habitId)
    .order("checked_in_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as HabitCheckin[];
}

/**
 * Get a formatted streak message.
 */
export function getStreakMessage(
  habitName: string,
  streak: StreakInfo,
  isMilestone: boolean,
): string {
  const { current_streak } = streak;

  if (isMilestone) {
    const celebrations: Record<number, string> = {
      3: `🔥 *${current_streak}-day streak!* You're building momentum with *${habitName}*.`,
      7: `🎯 *1 week streak!* A full week of *${habitName}*. That's commitment.`,
      14: `💪 *2 weeks straight!* *${habitName}* is becoming a real habit now.`,
      21: `🌟 *21 days!* They say this is when habits stick. *${habitName}* is part of you now.`,
      30: `🏆 *30-day streak!* A full month of *${habitName}*. You're incredible.`,
      50: `⭐ *50 days!* Half a century of *${habitName}*. That's rare discipline.`,
      100: `🎉 *100 DAYS!* You've logged *${habitName}* for 100 straight days. Absolutely legendary.`,
    };
    return celebrations[current_streak] ?? `*${current_streak}-day streak* on *${habitName}*!`;
  }

  return `*${habitName}* logged. Day ${current_streak}.`;
}
