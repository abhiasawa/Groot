import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Flame, Target } from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useHabits } from "../lib/api/queries";
import { typography } from "../constants/typography";
import type { Habit } from "../../shared/types/api";

// ── Helpers ──────────────────────────────────

/** Build last 7 days array for the mini heatmap */
function getLast7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getDayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "narrow" });
}

// ── Component ────────────────────────────────

export default function HabitsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useHabits();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const last7Days = getLast7Days();
  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
        </Pressable>
        <Text style={s.headerTitle}>Habits</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !data?.habits?.length ? (
        <ScrollView
          contentContainerStyle={s.center}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <Target size={32} color={colors.mutedForeground} strokeWidth={1} />
          <Text style={s.emptyTitle}>No habits tracked yet</Text>
          <Text style={s.emptySubtitle}>
            Tell Groot about habits you want to build, and they will appear
            here with streak tracking.
          </Text>
        </ScrollView>
      ) : (
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
          {data.habits.map((habit: Habit) => {
            const checkinSet = new Set(habit.recentCheckins ?? []);

            return (
              <View key={habit.id} style={s.habitCard}>
                <View style={s.habitHeader}>
                  <View style={s.habitNameRow}>
                    <Text style={s.habitName}>{habit.name}</Text>
                    {habit.frequency && (
                      <View style={s.frequencyBadge}>
                        <Text style={s.frequencyText}>{habit.frequency}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.streakBadge}>
                    <Flame
                      size={14}
                      color={colors.accent}
                      strokeWidth={1.5}
                    />
                    <Text style={s.streakText}>{habit.current_streak}</Text>
                  </View>
                </View>

                <View style={s.habitMeta}>
                  <Text style={s.habitCategory}>{habit.category}</Text>
                  <Text style={s.habitTarget}>
                    {habit.target_value} {habit.target_unit}
                  </Text>
                </View>

                {/* 7-day mini heatmap */}
                <View style={s.heatmapRow}>
                  {last7Days.map((day) => {
                    const done = checkinSet.has(day);
                    return (
                      <View key={day} style={s.heatmapDay}>
                        <View
                          style={[
                            s.heatmapDot,
                            {
                              backgroundColor: done
                                ? colors.moodGood
                                : colors.moodNone,
                            },
                          ]}
                        />
                        <Text style={s.heatmapLabel}>{getDayLabel(day)}</Text>
                      </View>
                    );
                  })}
                </View>

                {habit.longest_streak > 0 && (
                  <Text style={s.longestStreak}>
                    Longest streak: {habit.longest_streak} days
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const styles = (c: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.lg,
      color: c.foreground,
    },
    scroll: {
      padding: 20,
      paddingBottom: 40,
    },
    habitCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    habitHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    habitNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    habitName: {
      fontFamily: "Inter_600SemiBold",
      ...typography.base,
      color: c.foreground,
    },
    frequencyBadge: {
      backgroundColor: c.secondary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    frequencyText: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    streakBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.secondary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    streakText: {
      fontFamily: "Inter_700Bold",
      ...typography.sm,
      color: c.accent,
    },
    habitMeta: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 12,
    },
    habitCategory: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    habitTarget: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    heatmapRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    heatmapDay: {
      alignItems: "center",
      gap: 4,
    },
    heatmapDot: {
      width: 24,
      height: 24,
      borderRadius: 6,
    },
    heatmapLabel: {
      fontFamily: "Inter_400Regular",
      fontSize: 10,
      lineHeight: 14,
      color: c.mutedForeground,
    },
    longestStreak: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
      marginTop: 4,
    },
    emptyTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.lg,
      color: c.foreground,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
  });
