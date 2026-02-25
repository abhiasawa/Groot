import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface Milestone {
  id: string;
  type: "streak" | "count" | "habit" | "time";
  title: string;
  description: string;
  achievedAt: string;
  icon: string;
}

/**
 * Calculate milestones for a user based on their activity data.
 * Returns a list of milestone achievements.
 */
export async function calculateMilestones(userId: string): Promise<Milestone[]> {
  const supabase = getSupabaseAdmin();
  const milestones: Milestone[] = [];

  try {
    // 1. Total messages milestone
    const { count: totalMessages } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("direction", "incoming");

    const msgCount = totalMessages ?? 0;
    const msgThresholds = [
      { count: 10, title: "First Steps", desc: "Shared 10 messages with Groot", icon: "seedling" },
      { count: 50, title: "Growing Roots", desc: "50 conversations and counting", icon: "sprout" },
      { count: 100, title: "Century Mark", desc: "100 messages — a real connection", icon: "tree" },
      { count: 500, title: "Deep Roots", desc: "500 messages of shared growth", icon: "forest" },
    ];

    for (const t of msgThresholds) {
      if (msgCount >= t.count) {
        milestones.push({
          id: `msg-${t.count}`,
          type: "count",
          title: t.title,
          description: t.desc,
          achievedAt: new Date().toISOString(),
          icon: t.icon,
        });
      }
    }

    // 2. Memory milestones
    const { count: totalMemories } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("synced_to_supermemory", true);

    const memCount = totalMemories ?? 0;
    if (memCount >= 10) {
      milestones.push({
        id: "mem-10",
        type: "count",
        title: "Memory Garden",
        description: `${memCount} memories stored in your garden`,
        achievedAt: new Date().toISOString(),
        icon: "brain",
      });
    }

    // 3. Habit streak milestones
    const { data: habits } = await supabase
      .from("habits")
      .select("name")
      .eq("user_id", userId)
      .eq("is_active", true);

    const { data: streaks } = await supabase
      .from("habit_streaks")
      .select("current_streak, longest_streak, habit_id")
      .in("habit_id", (habits ?? []).map((h) => {
        // Need to get habit IDs — refetch with id
        return "";
      }).filter(Boolean));

    // Simpler: just get habits with streaks
    const { data: habitsWithStreaks } = await supabase
      .from("habits")
      .select("id, name")
      .eq("user_id", userId)
      .eq("is_active", true);

    for (const habit of habitsWithStreaks ?? []) {
      const { data: streak } = await supabase
        .from("habit_streaks")
        .select("current_streak, longest_streak")
        .eq("habit_id", habit.id)
        .single();

      const longest = (streak?.longest_streak as number) ?? 0;
      if (longest >= 7) {
        milestones.push({
          id: `habit-7-${habit.id}`,
          type: "habit",
          title: "Week Warrior",
          description: `7-day streak on ${habit.name}`,
          achievedAt: new Date().toISOString(),
          icon: "flame",
        });
      }
      if (longest >= 30) {
        milestones.push({
          id: `habit-30-${habit.id}`,
          type: "habit",
          title: "Monthly Master",
          description: `30-day streak on ${habit.name}`,
          achievedAt: new Date().toISOString(),
          icon: "trophy",
        });
      }
    }

    // 4. Account age milestone
    const { data: user } = await supabase
      .from("users")
      .select("created_at")
      .eq("id", userId)
      .single();

    if (user?.created_at) {
      const daysSinceJoin = Math.floor(
        (Date.now() - new Date(user.created_at as string).getTime()) / 86400000,
      );
      if (daysSinceJoin >= 7) {
        milestones.push({
          id: "time-7",
          type: "time",
          title: "One Week",
          description: "Growing with Groot for a week",
          achievedAt: new Date().toISOString(),
          icon: "calendar",
        });
      }
      if (daysSinceJoin >= 30) {
        milestones.push({
          id: "time-30",
          type: "time",
          title: "One Month",
          description: "A month of shared growth",
          achievedAt: new Date().toISOString(),
          icon: "calendar-check",
        });
      }
    }

    // 5. Weekly report milestone
    const { count: reportCount } = await supabase
      .from("weekly_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((reportCount ?? 0) >= 4) {
      milestones.push({
        id: "reports-4",
        type: "count",
        title: "Pattern Seeker",
        description: "4 weekly reports and insights",
        achievedAt: new Date().toISOString(),
        icon: "chart",
      });
    }
  } catch (error) {
    logger.error({ error, userId }, "Failed to calculate milestones");
  }

  return milestones;
}
