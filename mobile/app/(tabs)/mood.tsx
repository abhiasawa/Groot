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
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { SectionHeader } from "../../components/ui/section-header";
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

  const moodAccentColor = data?.recentMood
    ? getMoodColorFromName(data.recentMood, colors)
    : undefined;

  const s = styles(colors);

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <GradientBackground>
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <GradientBackground>
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
          {/* Page header */}
          <View style={s.header}>
            <Text style={s.pageTitle}>Mood</Text>
            <Text style={s.pageSubtitle}>Track how you're feeling</Text>
          </View>

          {/* Current mood hero */}
          {data?.recentMood && (
            <GlassCard accentColor={moodAccentColor} delay={0}>
              <Text style={s.heroLabel}>Currently feeling...</Text>
              <View style={s.heroRow}>
                <View
                  style={[
                    s.heroDot,
                    {
                      backgroundColor: moodAccentColor,
                    },
                  ]}
                />
                <Text
                  style={[
                    s.heroMoodName,
                    { color: moodAccentColor },
                  ]}
                >
                  {data.recentMood}
                </Text>
              </View>
            </GlassCard>
          )}

          {/* Year in Pixels */}
          <GlassCard delay={100} style={s.sectionGap}>
            <SectionHeader title={`${year} in Pixels`} />

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
          </GlassCard>

          {/* Weekly Trend */}
          <GlassCard delay={200} style={s.sectionGap}>
            <SectionHeader title="Weekly Trend" />

            <Text style={s.trendText}>{trendText}</Text>

            {(data?.weeklyTrend?.length ?? 0) > 0 && (
              <View style={s.trendWeeks}>
                {(data?.weeklyTrend ?? []).slice(-6).map((week) => {
                  const scoreLabel =
                    MOOD_LABELS[Math.round(week.avgScore)] ?? "?";
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
          </GlassCard>

          {/* Distribution */}
          <GlassCard delay={300} style={s.sectionGap}>
            <SectionHeader title="Distribution" />

            <View style={s.distributionList}>
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
          </GlassCard>
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const styles = (c: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    safe: {
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

    // ── Header ──
    header: {
      marginBottom: 20,
    },
    pageTitle: {
      fontFamily: "Inter_700Bold",
      ...typography.title,
      color: c.foreground,
      letterSpacing: -0.3,
    },
    pageSubtitle: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      marginTop: 4,
    },

    // ── Section spacing ──
    sectionGap: {
      marginTop: 20,
    },

    // ── Hero (current mood) ──
    heroLabel: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      marginBottom: 8,
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    heroDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    heroMoodName: {
      fontFamily: "Inter_700Bold",
      ...typography.xl,
      textTransform: "capitalize",
    },

    // ── Year in Pixels ──
    pixelGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: DOT_GAP,
    },
    pixel: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 3,
    },
    emptyPixels: {
      alignItems: "center",
      paddingVertical: 24,
    },
    emptySubtitle: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
    legend: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 14,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 4,
    },
    legendLabel: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },

    // ── Weekly Trend ──
    trendText: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
      lineHeight: 22,
      marginBottom: 14,
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

    // ── Distribution ──
    distributionList: {
      gap: 12,
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
      height: 10,
      backgroundColor: c.secondary,
      borderRadius: 6,
      overflow: "hidden",
    },
    distBar: {
      height: "100%",
      borderRadius: 6,
    },
    distPct: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
      width: 34,
      textAlign: "right",
    },
  });
