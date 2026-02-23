import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, TrendingUp, BarChart3 } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useMood } from "../../lib/api/queries";
import {
  getMoodColor,
  getMoodColorFromName,
  MOOD_LABELS,
} from "../../constants/mood";
import { typography } from "../../constants/typography";
import type { DailyMood, WeeklyTrend } from "../../../shared/types/api";

// ── Constants ────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = 20;
const DOT_GAP = 2;
const COLS = 20; // dots per row
const DOT_SIZE = Math.floor(
  (SCREEN_WIDTH - GRID_PADDING * 2 - DOT_GAP * (COLS - 1)) / COLS,
);

// ── Helpers ──────────────────────────────────

function buildYearGrid(
  year: number,
  dailyMoods: DailyMood[],
): { date: string; score: number | null }[] {
  const moodMap = new Map<string, number>();
  for (const dm of dailyMoods) {
    moodMap.set(dm.date, dm.score);
  }

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const grid: { date: string; score: number | null }[] = [];

  const current = new Date(start);
  const today = new Date();
  while (current <= end && current <= today) {
    const dateStr = current.toISOString().slice(0, 10);
    grid.push({
      date: dateStr,
      score: moodMap.get(dateStr) ?? null,
    });
    current.setDate(current.getDate() + 1);
  }

  return grid;
}

function getMoodDistribution(
  dailyMoods: DailyMood[],
): { score: number; label: string; count: number; pct: number }[] {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const dm of dailyMoods) {
    if (dm.score >= 1 && dm.score <= 5) {
      counts[dm.score] = (counts[dm.score] ?? 0) + 1;
    }
  }

  const total = dailyMoods.length || 1;
  return [5, 4, 3, 2, 1].map((score) => ({
    score,
    label: MOOD_LABELS[score] ?? "Unknown",
    count: counts[score] ?? 0,
    pct: Math.round(((counts[score] ?? 0) / total) * 100),
  }));
}

function getTrendDescription(weeklyTrend: WeeklyTrend[]): string {
  if (weeklyTrend.length < 2) return "Not enough data for trend analysis yet.";

  const recent = weeklyTrend.slice(-4);
  const firstEntry = recent[0];
  const lastEntry = recent[recent.length - 1];
  if (!firstEntry || !lastEntry) return "Not enough data for trend analysis yet.";
  const first = firstEntry.avgScore;
  const last = lastEntry.avgScore;
  const diff = last - first;

  if (Math.abs(diff) < 0.3) return "Your mood has been steady over recent weeks.";
  if (diff > 0.5) return "Your mood has been trending upward recently. Keep it up!";
  if (diff > 0) return "Your mood is slightly improving week over week.";
  if (diff < -0.5) return "Your mood has dipped recently. Remember to take care of yourself.";
  return "Your mood has been slightly lower this week.";
}

// ── Component ────────────────────────────────

export default function MoodScreen() {
  const { colors } = useTheme();
  const currentYear = new Date().getFullYear();
  const [year] = useState(currentYear);
  const { data, isLoading, isRefetching, refetch } = useMood(year);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const yearGrid = useMemo(
    () => buildYearGrid(year, data?.dailyMoods ?? []),
    [year, data?.dailyMoods],
  );

  const distribution = useMemo(
    () => getMoodDistribution(data?.dailyMoods ?? []),
    [data?.dailyMoods],
  );

  const trendText = useMemo(
    () => getTrendDescription(data?.weeklyTrend ?? []),
    [data?.weeklyTrend],
  );

  const s = styles(colors);

  if (isLoading) {
    return (
      <SafeAreaView style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
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
        {/* Header */}
        <Text style={s.pageTitle}>Mood</Text>

        {/* Recent mood */}
        {data?.recentMood && (
          <View style={s.recentMoodRow}>
            <View
              style={[
                s.recentMoodDot,
                {
                  backgroundColor: getMoodColorFromName(
                    data.recentMood,
                    colors,
                  ),
                },
              ]}
            />
            <Text style={s.recentMoodText}>
              Currently feeling{" "}
              <Text style={s.recentMoodLabel}>
                {data.recentMood.toLowerCase()}
              </Text>
            </Text>
          </View>
        )}

        {/* Year in pixels */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Heart size={16} color={colors.primary} strokeWidth={1.5} />
            <Text style={s.sectionTitle}>{year} in Pixels</Text>
          </View>

          {yearGrid.length === 0 ? (
            <View style={s.emptyPixels}>
              <Text style={s.emptySubtitle}>
                No mood data for {year} yet. Keep chatting with Groot to track
                your moods.
              </Text>
            </View>
          ) : (
            <View style={s.pixelGrid}>
              {yearGrid.map((day) => (
                <View
                  key={day.date}
                  style={[
                    s.pixel,
                    {
                      backgroundColor:
                        day.score !== null
                          ? getMoodColor(day.score, colors)
                          : colors.moodNone,
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Legend */}
          <View style={s.legend}>
            <Text style={s.legendLabel}>Bad</Text>
            {[1, 2, 3, 4, 5].map((score) => (
              <View
                key={score}
                style={[
                  s.legendDot,
                  { backgroundColor: getMoodColor(score, colors) },
                ]}
              />
            ))}
            <Text style={s.legendLabel}>Great</Text>
          </View>
        </View>

        {/* Weekly trend */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <TrendingUp size={16} color={colors.chart2} strokeWidth={1.5} />
            <Text style={s.sectionTitle}>Weekly Trend</Text>
          </View>
          <View style={s.trendCard}>
            <Text style={s.trendText}>{trendText}</Text>
            {(data?.weeklyTrend?.length ?? 0) > 0 && (
              <View style={s.trendWeeks}>
                {(data?.weeklyTrend ?? []).slice(-6).map((week) => {
                  const scoreLabel = MOOD_LABELS[Math.round(week.avgScore)] ?? "?";
                  return (
                    <View key={week.weekStart} style={s.trendWeekItem}>
                      <View
                        style={[
                          s.trendWeekDot,
                          {
                            backgroundColor: getMoodColor(
                              Math.round(week.avgScore),
                              colors,
                            ),
                          },
                        ]}
                      />
                      <Text style={s.trendWeekScore}>
                        {week.avgScore.toFixed(1)}
                      </Text>
                      <Text style={s.trendWeekLabel}>
                        {new Date(week.weekStart).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Distribution */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <BarChart3 size={16} color={colors.chart3} strokeWidth={1.5} />
            <Text style={s.sectionTitle}>Distribution</Text>
          </View>
          <View style={s.distributionCard}>
            {distribution.map((item) => (
              <View key={item.score} style={s.distRow}>
                <View style={s.distLabelRow}>
                  <View
                    style={[
                      s.distDot,
                      {
                        backgroundColor: getMoodColor(item.score, colors),
                      },
                    ]}
                  />
                  <Text style={s.distLabel}>{item.label}</Text>
                </View>
                <View style={s.distBarContainer}>
                  <View
                    style={[
                      s.distBar,
                      {
                        width: `${Math.max(item.pct, 2)}%`,
                        backgroundColor: getMoodColor(item.score, colors),
                      },
                    ]}
                  />
                </View>
                <Text style={s.distPct}>{item.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
    },
    scroll: {
      padding: GRID_PADDING,
      paddingBottom: 40,
    },
    pageTitle: {
      fontFamily: "Inter_700Bold",
      ...typography["2xl"],
      color: c.foreground,
      marginBottom: 12,
    },
    recentMoodRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    recentMoodDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    recentMoodText: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
    },
    recentMoodLabel: {
      fontFamily: "Inter_500Medium",
      color: c.foreground,
    },
    section: {
      marginBottom: 28,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 12,
    },
    sectionTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.base,
      color: c.foreground,
    },
    pixelGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: DOT_GAP,
    },
    pixel: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 4,
    },
    emptyPixels: {
      alignItems: "center",
      paddingVertical: 24,
    },
    legend: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 12,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 3,
    },
    legendLabel: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    trendCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    trendText: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
      lineHeight: 22,
      marginBottom: 12,
    },
    trendWeeks: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    trendWeekItem: {
      alignItems: "center",
      flex: 1,
    },
    trendWeekDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginBottom: 4,
    },
    trendWeekScore: {
      fontFamily: "Inter_600SemiBold",
      ...typography.xs,
      color: c.foreground,
    },
    trendWeekLabel: {
      fontFamily: "Inter_400Regular",
      fontSize: 10,
      lineHeight: 14,
      color: c.mutedForeground,
      marginTop: 2,
    },
    distributionCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      gap: 10,
    },
    distRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    distLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      width: 60,
      gap: 6,
    },
    distDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    distLabel: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.foreground,
    },
    distBarContainer: {
      flex: 1,
      height: 8,
      backgroundColor: c.secondary,
      borderRadius: 4,
      overflow: "hidden",
    },
    distBar: {
      height: "100%",
      borderRadius: 4,
    },
    distPct: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
      width: 34,
      textAlign: "right",
    },
    emptySubtitle: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
  });
