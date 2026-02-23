import React, { useCallback } from "react";
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
import { ArrowLeft, Flame, Target } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useTheme } from "../lib/theme/provider";
import { useHabits } from "../lib/api/queries";
import { typography } from "../constants/typography";
import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PressScale } from "../components/ui/press-scale";
import { SectionHeader } from "../components/ui/section-header";
import { PillBadge } from "../components/ui/pill-badge";
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

  if (isLoading) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: colors.gradientStart }]}>
        <GradientBackground>
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: colors.gradientStart }]}>
      <GradientBackground>
        {/* Header */}
        <View style={s.header}>
          <PressScale onPress={() => router.back()} style={s.backButton}>
            <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
          </PressScale>
          <View style={s.headerTitleGroup}>
            <Text style={[s.pageTitle, { color: colors.foreground }]}>
              Habits
            </Text>
            <Text style={[s.pageSubtitle, { color: colors.mutedForeground }]}>
              Build better routines
            </Text>
          </View>
        </View>

        {!data?.habits?.length ? (
          <ScrollView
            contentContainerStyle={s.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <Animated.View
              entering={FadeInDown.delay(100).duration(420)}
              style={s.emptyInner}
            >
              <View
                style={[
                  s.emptyIconCircle,
                  { backgroundColor: colors.glassSurface },
                ]}
              >
                <Target
                  size={36}
                  color={colors.mutedForeground}
                  strokeWidth={1}
                />
              </View>
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>
                No habits tracked yet
              </Text>
              <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
                Tell Groot about habits you want to build, and they will appear
                here with streak tracking.
              </Text>
            </Animated.View>
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
            <SectionHeader title="Your Habits" />

            {data.habits.map((habit: Habit, index: number) => {
              const checkinSet = new Set(habit.recentCheckins ?? []);
              const hasStreak = habit.current_streak > 0;
              const staggerDelay = index * 80;

              return (
                <GlassCard
                  key={habit.id}
                  delay={staggerDelay}
                  accentColor={hasStreak ? colors.moodGood : undefined}
                  style={s.habitCard}
                >
                  {/* Name + badges row */}
                  <View style={s.habitHeader}>
                    <View style={s.habitNameRow}>
                      <Text
                        style={[s.habitName, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {habit.name}
                      </Text>
                      {habit.frequency && (
                        <PillBadge label={habit.frequency} small />
                      )}
                      {habit.category ? (
                        <PillBadge label={habit.category} small />
                      ) : null}
                    </View>
                    <PillBadge
                      label={`${habit.current_streak}`}
                      color={hasStreak ? `${colors.accent}20` : undefined}
                      textColor={hasStreak ? colors.accent : colors.mutedForeground}
                      style={s.streakPill}
                    />
                  </View>

                  {/* Target info */}
                  <Text style={[s.habitTarget, { color: colors.mutedForeground }]}>
                    {habit.target_value} {habit.target_unit}
                  </Text>

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
                          <Text
                            style={[
                              s.heatmapLabel,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {getDayLabel(day)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Longest streak */}
                  {habit.longest_streak > 0 && (
                    <View style={s.longestRow}>
                      <Flame
                        size={12}
                        color={colors.accent}
                        strokeWidth={1.5}
                      />
                      <Text
                        style={[
                          s.longestStreak,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Longest streak: {habit.longest_streak} days
                      </Text>
                    </View>
                  )}
                </GlassCard>
              );
            })}
          </ScrollView>
        )}
      </GradientBackground>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleGroup: {
    flex: 1,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    ...typography.title,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    marginTop: 2,
  },

  // ── Content ──
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },

  // ── Habit Card ──
  habitCard: {
    marginBottom: 12,
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  habitNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  habitName: {
    fontFamily: "Inter_600SemiBold",
    ...typography.base,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
  },
  habitTarget: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    marginBottom: 14,
  },

  // ── Heatmap ──
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
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 14,
  },

  // ── Longest streak ──
  longestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  longestStreak: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
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
    fontFamily: "Inter_600SemiBold",
    ...typography.lg,
    marginTop: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
});
