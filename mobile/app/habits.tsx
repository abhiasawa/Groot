import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Flame, Target, Sparkles } from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useHabits } from "../lib/api/queries";
import { typography } from "../constants/typography";
import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { SectionHeader } from "../components/ui/section-header";
import { PillBadge } from "../components/ui/pill-badge";
import { DeepScreenHeader } from "../components/ui/deep-screen-header";
import type { Habit } from "../../shared/types/api";

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

function formatHabitTarget(habit: Habit): string {
  const value = habit.target_value;
  const unit = habit.target_unit;
  if (value != null && unit) return `${value} ${unit}`;
  if (value != null) return String(value);
  if (unit) return `Track in ${unit}`;
  return "No daily target set yet";
}

export default function HabitsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useHabits();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const habits = data?.habits ?? [];
  const last7Days = getLast7Days();
  const todayStr = new Date().toISOString().slice(0, 10);

  const summary = useMemo(() => {
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.longest_streak), 0);
    const checkedToday = habits.filter((h) => h.recentCheckins?.includes(todayStr)).length;
    return {
      total: habits.length,
      bestStreak,
      checkedToday,
    };
  }, [habits, todayStr]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <GradientBackground>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <DeepScreenHeader
            title="Habits"
            subtitle="Build consistency through small daily actions."
            onBack={() => router.back()}
            tags={["Routine", "Streaks"]}
          />

          {!habits.length ? (
            <Animated.View entering={FadeInDown.delay(100).duration(420)}>
              <GlassCard padding={26}>
                <View style={styles.emptyInner}>
                  <View
                    style={[
                      styles.emptyIconCircle,
                      { backgroundColor: colors.glassSurface },
                    ]}
                  >
                    <Target size={36} color={colors.mutedForeground} strokeWidth={1.1} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    No habits tracked yet
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                    Tell Groot about habits you want to build and this dashboard
                    will turn into your streak tracker.
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>
          ) : (
            <>
              <GlassCard padding={18} accentColor={colors.primary} style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Sparkles size={14} color={colors.accent} strokeWidth={1.8} />
                  <Text style={[styles.summaryLabel, { color: colors.accent }]}>
                    Habit Overview
                  </Text>
                </View>
                <View style={styles.summaryStats}>
                  <SummaryStat value={summary.total} label="Active" />
                  <SummaryStat value={summary.checkedToday} label="Today" />
                  <SummaryStat value={summary.bestStreak} label="Best Streak" />
                </View>
              </GlassCard>

              <SectionHeader title="Your Habit Stack" />
              {habits.map((habit: Habit, index: number) => {
                const checkinSet = new Set(habit.recentCheckins ?? []);
                const hasStreak = habit.current_streak > 0;
                const staggerDelay = index * 70;

                return (
                  <GlassCard
                    key={habit.id}
                    delay={staggerDelay}
                    accentColor={hasStreak ? colors.moodGood : undefined}
                    style={styles.habitCard}
                  >
                    <View style={styles.habitHeader}>
                      <View style={styles.habitNameRow}>
                        <Text
                          style={[styles.habitName, { color: colors.foreground }]}
                          numberOfLines={1}
                        >
                          {habit.name}
                        </Text>
                        {habit.frequency ? <PillBadge label={habit.frequency} small /> : null}
                        {habit.category ? <PillBadge label={habit.category} small /> : null}
                      </View>
                      <PillBadge
                        label={`${habit.current_streak} day streak`}
                        color={hasStreak ? `${colors.accent}20` : undefined}
                        textColor={hasStreak ? colors.accent : colors.mutedForeground}
                        small
                      />
                    </View>

                    <Text style={[styles.habitTarget, { color: colors.mutedForeground }]}>
                      {formatHabitTarget(habit)}
                    </Text>

                    <View style={styles.heatmapRow}>
                      {last7Days.map((day) => {
                        const done = checkinSet.has(day);
                        return (
                          <View key={day} style={styles.heatmapDay}>
                            <View
                              style={[
                                styles.heatmapDot,
                                {
                                  backgroundColor: done ? colors.moodGood : colors.moodNone,
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.heatmapLabel,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {getDayLabel(day)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {habit.longest_streak > 0 ? (
                      <View style={styles.longestRow}>
                        <Flame size={12} color={colors.accent} strokeWidth={1.5} />
                        <Text style={[styles.longestStreak, { color: colors.mutedForeground }]}>
                          Longest streak: {habit.longest_streak} days
                        </Text>
                      </View>
                    ) : null}
                  </GlassCard>
                );
              })}
            </>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

function SummaryStat({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.summaryStat}>
      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.summaryCaption, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  summaryCard: {
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  summaryLabel: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryStat: {
    flex: 1,
  },
  summaryValue: {
    fontFamily: "Sora_700Bold",
    ...typography.xl,
  },
  summaryCaption: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
  },
  habitCard: {
    marginBottom: 12,
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 8,
  },
  habitNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  habitName: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
  habitTarget: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginBottom: 14,
  },
  heatmapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  heatmapDay: {
    alignItems: "center",
    gap: 4,
  },
  heatmapDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  heatmapLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    lineHeight: 14,
  },
  longestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  longestStreak: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  emptyInner: {
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
    marginTop: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 20,
  },
});
