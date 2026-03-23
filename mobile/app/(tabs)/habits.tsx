import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight, Flame } from "lucide-react-native";

import { useHabits, useMoodData } from "../../lib/api/queries";
import { NotoMascot } from "../../components/ui/noto-mascot";
import { fonts, typography } from "../../constants/typography";
import {
  notoTheme,
  colors,
  radii,
  shadows,
  spacing,
} from "../../lib/theme/tokens";

const HEATMAP_AMBER = "#D4960A"; // Darker amber for WCAG AA contrast
const HEATMAP_EMPTY = colors.iconButtonBg;
const HEATMAP_BORDER = notoTheme.border;

const MOOD_LABELS: Record<number, string> = {
  1: "Low",
  2: "Meh",
  3: "Okay",
  4: "Good",
  5: "Great",
};

function getLast7Dates(): string[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0]!;
  });
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()]!;
}

function getMoodDotColor(score: number): string {
  if (score >= 4.5) return "#FFBB2C";
  if (score >= 3.5) return "#8AA230";
  if (score >= 2.5) return "#787163";
  return "#764539";
}

export default function HabitsScreen() {
  const router = useRouter();
  const {
    data: habitsData,
    isLoading: habitsLoading,
    refetch: refetchHabits,
  } = useHabits(true);
  const { data: moodData, refetch: refetchMood } = useMoodData();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([refetchHabits(), refetchMood()]).finally(() =>
      setRefreshing(false),
    );
  }, [refetchHabits, refetchMood]);

  const habits = habitsData?.habits ?? [];

  const captureStreak = useMemo(
    () => habits.find((h) => h.name.toLowerCase() === "daily_capture"),
    [habits],
  );

  const otherHabits = useMemo(
    () => habits.filter((h) => h.name.toLowerCase() !== "daily_capture"),
    [habits],
  );

  const last7 = useMemo(() => getLast7Dates(), []);

  // Mood snapshot: last 7 daily moods
  const last7Moods = useMemo(() => {
    if (!moodData?.dailyMoods) return [];
    return moodData.dailyMoods.slice(-7);
  }, [moodData?.dailyMoods]);

  const avgMood = useMemo(() => {
    if (last7Moods.length === 0) return null;
    const sum = last7Moods.reduce((a, m) => a + m.score, 0);
    return Math.round((sum / last7Moods.length) * 10) / 10;
  }, [last7Moods]);

  if (habitsLoading && !habitsData) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={notoTheme.foreground} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C0BDB8"
            colors={["#FFBB2C"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Habits</Text>
        </View>

        {/* Capture Streak Hero */}
        <View
          style={styles.streakHero}
          accessibilityLabel={`Day ${captureStreak?.current_streak ?? 0} capture streak`}
        >
          <View style={styles.streakRing}>
            <Text style={styles.streakNumber}>
              {captureStreak?.current_streak ?? 0}
            </Text>
          </View>
          <View style={styles.streakCopy}>
            <Text style={styles.streakTitle}>
              Day {captureStreak?.current_streak ?? 0} of capturing
            </Text>
            <Text style={styles.streakSubtitle}>
              {captureStreak && captureStreak.current_streak > 0
                ? `Best streak: ${captureStreak.longest_streak} days`
                : "Start journaling to build your streak"}
            </Text>
          </View>
        </View>

        {/* Active Habits */}
        {otherHabits.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Active Habits</Text>
            {otherHabits.map((habit) => (
              <View
                key={habit.id}
                style={styles.habitCard}
                accessibilityLabel={`${habit.name} habit, ${habit.current_streak} day streak`}
              >
                <View style={styles.habitHeader}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <View style={styles.streakBadge}>
                    <Flame
                      size={12}
                      color={HEATMAP_AMBER}
                      strokeWidth={2.5}
                    />
                    <Text style={styles.streakBadgeText}>
                      {habit.current_streak}
                    </Text>
                  </View>
                </View>
                {habit.target_unit && (
                  <Text style={styles.habitMeta}>
                    {habit.frequency ?? "daily"} · {habit.target_value ?? ""}{" "}
                    {habit.target_unit}
                  </Text>
                )}
                {/* 7-day heatmap strip */}
                <View style={styles.heatmapRow}>
                  {last7.map((dateStr) => {
                    const hasCheckin =
                      habit.recentCheckins?.includes(dateStr) ?? false;
                    return (
                      <View key={dateStr} style={styles.heatmapCell}>
                        <View
                          style={[
                            styles.heatmapDot,
                            hasCheckin
                              ? styles.heatmapDotFilled
                              : styles.heatmapDotEmpty,
                          ]}
                          accessibilityLabel={`${dateStr}, ${hasCheckin ? "checked in" : "no check-in"}`}
                        />
                        <Text style={styles.heatmapDayLabel}>
                          {getDayLabel(dateStr)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Empty state for habits */}
        {otherHabits.length === 0 && (
          <Pressable
            style={styles.emptyHabits}
            onPress={() => router.push("/(tabs)/chat")}
            accessibilityLabel="Tell Groot about a habit you want to track"
            accessibilityRole="button"
          >
            <NotoMascot size={80} compact />
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySubtitle}>
              Tell Groot about a habit you want to track
            </Text>
          </Pressable>
        )}

        {/* Mood Snapshot Card */}
        <Pressable
          style={styles.moodCard}
          onPress={() => router.push("/mood")}
          accessibilityLabel={
            avgMood
              ? `Mood average ${avgMood} out of 5. Tap for details.`
              : "Mood overview. Tap for details."
          }
          accessibilityRole="button"
        >
          <View style={styles.moodHeader}>
            <Text style={styles.moodTitle}>Mood</Text>
            <ChevronRight size={18} color={colors.textFaded} strokeWidth={2} />
          </View>
          {last7Moods.length > 0 ? (
            <>
              <View style={styles.moodDotsRow}>
                {last7Moods.map((m, i) => (
                  <View key={i} style={styles.moodDotWrap}>
                    <View
                      style={[
                        styles.moodDot,
                        {
                          height: 8 + m.score * 6,
                          backgroundColor: getMoodDotColor(m.score),
                        },
                      ]}
                    />
                    <Text style={styles.moodDotLabel}>
                      {getDayLabel(m.date)}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.moodAvg}>
                Avg: {avgMood}/5 ·{" "}
                {MOOD_LABELS[Math.round(avgMood ?? 3)] ?? "Okay"}
              </Text>
            </>
          ) : (
            <Text style={styles.moodEmpty}>
              Mood data will appear as you journal
            </Text>
          )}
        </Pressable>

        <View style={styles.bottomGap} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 36,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: notoTheme.foreground,
    letterSpacing: -0.9,
  },
  streakHero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: notoTheme.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: notoTheme.border,
    ...shadows.sm,
  },
  streakRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: notoTheme.accent,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF9E6",
  },
  streakNumber: {
    fontFamily: fonts.bold,
    ...typography.title,
    color: notoTheme.foreground,
  },
  streakCopy: {
    flex: 1,
  },
  streakTitle: {
    fontFamily: fonts.semiBold,
    ...typography.base,
    color: notoTheme.foreground,
  },
  streakSubtitle: {
    fontFamily: fonts.regular,
    ...typography.xs,
    color: colors.textSubdued,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    ...typography.caption,
    color: colors.textFaded,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  habitCard: {
    backgroundColor: notoTheme.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: notoTheme.border,
    ...shadows.sm,
  },
  habitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  habitName: {
    fontFamily: fonts.semiBold,
    ...typography.base,
    color: notoTheme.foreground,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF9E6",
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  streakBadgeText: {
    fontFamily: fonts.bold,
    ...typography.xs,
    color: HEATMAP_AMBER,
  },
  habitMeta: {
    fontFamily: fonts.medium,
    ...typography.caption,
    color: colors.textSubdued,
    marginTop: 4,
    textTransform: "capitalize",
  },
  heatmapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  heatmapCell: {
    alignItems: "center",
    gap: 4,
  },
  heatmapDot: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  heatmapDotFilled: {
    backgroundColor: HEATMAP_AMBER,
  },
  heatmapDotEmpty: {
    backgroundColor: HEATMAP_EMPTY,
    borderWidth: 1,
    borderColor: HEATMAP_BORDER,
  },
  heatmapDayLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textFaded,
  },
  emptyHabits: {
    alignItems: "center",
    paddingVertical: 32,
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    ...typography.lg,
    color: notoTheme.foreground,
    marginTop: 16,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: colors.textSubdued,
    marginTop: 6,
    textAlign: "center",
  },
  moodCard: {
    backgroundColor: notoTheme.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: notoTheme.border,
    ...shadows.sm,
  },
  moodHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  moodTitle: {
    fontFamily: fonts.bold,
    ...typography.lg,
    color: notoTheme.foreground,
  },
  moodDotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 48,
    marginBottom: spacing.sm,
  },
  moodDotWrap: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  moodDot: {
    width: 20,
    borderRadius: 6,
  },
  moodDotLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textFaded,
  },
  moodAvg: {
    fontFamily: fonts.medium,
    ...typography.xs,
    color: colors.textSubdued,
    textAlign: "center",
  },
  moodEmpty: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: colors.textSubdued,
    textAlign: "center",
    paddingVertical: 12,
  },
  bottomGap: {
    height: 100,
  },
});
