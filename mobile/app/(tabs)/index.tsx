import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sparkles, Circle, CheckCircle2, Flame, Leaf } from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useTheme } from "../../lib/theme/provider";
import { useHome, useHabits, useTasks, qk } from "../../lib/api/queries";
import { apiFetch } from "../../lib/api/client";
import { getMoodColorFromName } from "../../constants/mood";
import { Sheet } from "../../components/ui/sheet";
import { SectionLabel } from "../../components/ui/section-label";
import { PressScale } from "../../components/ui/press-scale";
import type { HomeData, Task, Habit, ToggleTaskPayload, OkResponse } from "../../../shared/types/api";

// ── Helpers ──────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

function getMoodText(mood: string): string {
  return `You're feeling ${mood.toLowerCase()} today.`;
}

// ── Component ────────────────────────────────

export default function TodayScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { data: homeData, isLoading, isRefetching, refetch } = useHome();
  const { data: tasksData } = useTasks();
  const { data: habitsData } = useHabits();

  const toggleTask = useMutation<OkResponse, Error, ToggleTaskPayload>({
    mutationFn: (payload) =>
      apiFetch<OkResponse>("/api/tasks", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tasks });
      queryClient.invalidateQueries({ queryKey: qk.home });
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Loading state ──────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const home = homeData as HomeData | undefined;

  // ── Empty state ────────────────────────────

  if (!home) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.emptyContainer}>
          <View
            style={[s.emptyIcon, { backgroundColor: colors.tint }]}
          >
            <Leaf size={48} color={colors.primary} strokeWidth={1.2} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>
            Your garden awaits
          </Text>
          <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
            Send your first message to Groot on WhatsApp or Telegram to start
            building your second brain.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Data ────────────────────────────────────

  const moodColor = home.recentMood
    ? getMoodColorFromName(home.recentMood, colors)
    : undefined;

  const pendingTasks = (tasksData?.tasks ?? []).filter((t: Task) => !t.is_completed).slice(0, 3);
  const habits = habitsData?.habits ?? [];

  // Best streak among all habits
  const topStreak = habits.length > 0
    ? Math.max(...habits.map((h: Habit) => h.current_streak))
    : 0;

  // ── Render ──────────────────────────────────

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ───────────────────── */}
        <View style={s.greetingSection}>
          <Text style={[s.greetingLine, { color: colors.foreground }]}>
            {getGreeting()}
          </Text>
          <Text style={[s.nameText, { color: colors.primary }]}>
            {home.displayName ?? "there"}.
          </Text>
        </View>

        {/* ── Mood ───────────────────────── */}
        {home.recentMood && moodColor && (
          <View style={s.moodRow}>
            <View style={[s.moodDot, { backgroundColor: moodColor }]} />
            <Text style={[s.moodText, { color: colors.mutedForeground }]}>
              {getMoodText(home.recentMood)}
            </Text>
          </View>
        )}

        {/* ── Compact Stats ──────────────── */}
        <Sheet style={s.statsSheet}>
          <View style={s.statsRow}>
            <StatItem
              value={home.memoriesCount ?? 0}
              label="memories"
              color={colors.mutedForeground}
            />
            <StatDivider color={colors.border} />
            <StatItem
              value={home.pendingTasks ?? 0}
              label="tasks"
              color={colors.mutedForeground}
            />
            <StatDivider color={colors.border} />
            <StatItem
              value={topStreak}
              label={`day${topStreak !== 1 ? "s" : ""} streak`}
              color={colors.mutedForeground}
              suffix="🔥"
            />
          </View>
        </Sheet>

        {/* ── Flashback ──────────────────── */}
        {home.flashback && (
          <View style={s.section}>
            <SectionLabel>From your memory</SectionLabel>
            <Sheet accentColor={colors.accent}>
              <View style={s.flashbackHeader}>
                <Sparkles
                  size={14}
                  color={colors.accent}
                  strokeWidth={1.5}
                />
                <Text style={[s.flashbackDate, { color: colors.mutedForeground }]}>
                  {new Date(home.flashback.created_at).toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" },
                  )}
                </Text>
              </View>
              <Text
                style={[s.flashbackContent, { color: colors.foreground }]}
                numberOfLines={4}
              >
                {home.flashback.content}
              </Text>
            </Sheet>
          </View>
        )}

        {/* ── Tasks ──────────────────────── */}
        {pendingTasks.length > 0 && (
          <View style={s.section}>
            <SectionLabel>Open tasks</SectionLabel>
            <Sheet padding={12}>
              {pendingTasks.map((task: Task) => (
                <TouchableOpacity
                  key={task.id}
                  style={s.taskRow}
                  activeOpacity={0.6}
                  onPress={() =>
                    toggleTask.mutate({
                      taskId: task.id,
                      is_completed: true,
                    })
                  }
                >
                  <Circle
                    size={20}
                    color={colors.mutedForeground}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={[s.taskText, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {task.content}
                  </Text>
                </TouchableOpacity>
              ))}
              {(home.pendingTasks ?? 0) > 3 && (
                <Text style={[s.viewAll, { color: colors.primary }]}>
                  View all {home.pendingTasks} tasks →
                </Text>
              )}
            </Sheet>
          </View>
        )}

        {/* ── Habits ─────────────────────── */}
        {habits.length > 0 && (
          <View style={s.section}>
            <SectionLabel>Habits today</SectionLabel>
            <Sheet padding={12}>
              {habits.slice(0, 4).map((habit: Habit) => (
                <View key={habit.id} style={s.habitRow}>
                  <View style={s.habitLeft}>
                    <Flame
                      size={16}
                      color={
                        habit.current_streak > 0
                          ? colors.accent
                          : colors.mutedForeground
                      }
                      strokeWidth={1.5}
                    />
                    <Text
                      style={[s.habitName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {habit.name}
                    </Text>
                  </View>
                  <Text style={[s.habitStreak, { color: colors.mutedForeground }]}>
                    {habit.current_streak > 0
                      ? `${habit.current_streak}d`
                      : "—"}
                  </Text>
                </View>
              ))}
            </Sheet>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────

function StatItem({
  value,
  label,
  color,
  suffix,
}: {
  value: number;
  label: string;
  color: string;
  suffix?: string;
}) {
  return (
    <View style={s.statItem}>
      <Text style={[s.statValue, { color }]}>
        {value}
        {suffix ? ` ${suffix}` : ""}
      </Text>
      <Text style={[s.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

function StatDivider({ color }: { color: string }) {
  return <View style={[s.statDivider, { backgroundColor: color }]} />;
}

// ── Styles ───────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
  },

  // Greeting
  greetingSection: { marginBottom: 4 },
  greetingLine: {
    fontFamily: "Inter_400Regular",
    fontSize: 22,
  },
  nameText: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    marginTop: -2,
  },

  // Mood
  moodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },

  // Stats
  statsSheet: { marginBottom: 8 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center" },
  statValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    opacity: 0.5,
  },

  // Sections
  section: { marginTop: 24 },

  // Flashback
  flashbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  flashbackDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  flashbackContent: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 22,
  },

  // Tasks
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  taskText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    flex: 1,
  },
  viewAll: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "right",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  // Habits
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  habitLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  habitName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
  },
  habitStreak: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
