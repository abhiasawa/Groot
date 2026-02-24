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
import * as Haptics from "expo-haptics";

import { useTheme } from "../../lib/theme/provider";
import { useMood } from "../../lib/api/queries";
import { useRecordMood } from "../../lib/api/mutations";
import {
  getMoodColor,
  getMoodColorFromName,
  MOOD_LABELS,
  MOOD_FACE_LABELS,
} from "../../constants/mood";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { SectionHeader } from "../../components/ui/section-header";
import { PressScale } from "../../components/ui/press-scale";
import { MoodFace } from "../../components/illustrations/mood-faces";
import { TabSwipeView } from "../../components/ui/tab-swipe-view";
import type { DailyMood, WeeklyTrend } from "../../../shared/types/api";

// ── Constants ────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = 20;
const DOT_GAP = 3;
const COLS = 14; // dots per row — larger for readability
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

// Score → mood name used for the check-in
const CHECKIN_MOODS: Record<number, string> = {
  1: "bad",
  2: "low",
  3: "okay",
  4: "good",
  5: "great",
};

export default function MoodScreen() {
  const { colors } = useTheme();
  const currentYear = new Date().getFullYear();
  const [year] = useState(currentYear);
  const { data, isLoading, refetch } = useMood(year);
  const recordMood = useRecordMood();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [justRecorded, setJustRecorded] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    setJustRecorded(null);
    refetch().finally(() => setIsPullRefreshing(false));
  }, [refetch]);

  const handleCheckin = useCallback(
    (score: number) => {
      const moodName = CHECKIN_MOODS[score] ?? "okay";
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setJustRecorded(moodName);
      recordMood.mutate({ mood: moodName });
    },
    [recordMood],
  );

  // If user just recorded or server has a recent mood, show it
  const activeMood = justRecorded ?? data?.recentMood ?? null;

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

  const s = useMemo(() => styles(colors), [colors]);

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
    <TabSwipeView currentTab="mood">
      <SafeAreaView style={s.safe}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Page header */}
          <View style={s.headerRow}>
            <Text style={s.pageTitle}>Mood</Text>
          </View>

          {/* Mood check-in / current mood */}
          {activeMood ? (
            <GlassCard accentColor={getMoodColorFromName(activeMood, colors)} delay={0}>
              <Text style={s.heroLabel}>Currently feeling...</Text>
              <View style={s.heroRow}>
                <MoodFace
                  score={Object.entries(CHECKIN_MOODS).find(([, v]) => v === activeMood)?.[0]
                    ? Number(Object.entries(CHECKIN_MOODS).find(([, v]) => v === activeMood)![0])
                    : 3}
                  size={32}
                  color={getMoodColorFromName(activeMood, colors)}
                />
                <Text
                  style={[
                    s.heroMoodName,
                    { color: getMoodColorFromName(activeMood, colors) },
                  ]}
                >
                  {activeMood}
                </Text>
              </View>
              <PressScale
                onPress={() => setJustRecorded(null)}
                haptic={false}
                style={s.changeMoodBtn}
              >
                <Text style={[s.changeMoodText, { color: colors.mutedForeground }]}>
                  Change
                </Text>
              </PressScale>
            </GlassCard>
          ) : (
            <GlassCard delay={0} padding={20}>
              <Text style={s.checkinTitle}>How are you feeling?</Text>
              <View style={s.checkinRow}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <PressScale key={score} onPress={() => handleCheckin(score)} scale={0.9}>
                    <View style={s.checkinItem}>
                      <MoodFace score={score} size={36} color={getMoodColor(score, colors)} />
                      <Text style={[s.checkinLabel, { color: colors.mutedForeground }]}>
                        {MOOD_FACE_LABELS[score]}
                      </Text>
                    </View>
                  </PressScale>
                ))}
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
                        opacity: day.score !== null ? 1 : 0.35,
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Legend */}
            <View style={s.legend}>
              {[
                { score: 1, label: "Bad" },
                { score: 2, label: "Low" },
                { score: 3, label: "Okay" },
                { score: 4, label: "Good" },
                { score: 5, label: "Great" },
              ].map((item) => (
                <View key={item.score} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: getMoodColor(item.score, colors) }]} />
                  <Text style={s.legendLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          {/* Weekly Trend */}
          <GlassCard delay={200} style={s.sectionGap}>
            <SectionHeader title="Weekly Trend" />

            <Text style={s.trendText}>{trendText}</Text>

            {(data?.weeklyTrend?.length ?? 0) > 0 && (
              <View style={s.trendWeeks}>
                {(data?.weeklyTrend ?? []).slice(-6).map((week) => {
                  return (
                    <View key={week.weekStart} style={s.trendWeekItem}>
                      <MoodFace
                        score={Math.round(week.avgScore)}
                        size={18}
                        color={getMoodColor(Math.round(week.avgScore), colors)}
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
                    <MoodFace score={item.score} size={16} color={getMoodColor(item.score, colors)} />
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
    </TabSwipeView>
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
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    pageTitle: {
      fontFamily: "Sora_700Bold",
      ...typography.title,
      color: c.foreground,
      letterSpacing: -0.3,
    },
    // ── Section spacing ──
    sectionGap: {
      marginTop: 20,
    },

    // ── Hero (current mood) ──
    heroLabel: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      marginBottom: 8,
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    heroMoodName: {
      fontFamily: "Sora_700Bold",
      ...typography.xl,
      textTransform: "capitalize",
    },
    changeMoodBtn: {
      marginTop: 12,
    },
    changeMoodText: {
      fontFamily: "Manrope_500Medium",
      ...typography.xs,
    },

    // ── Check-in ──
    checkinTitle: {
      fontFamily: "Sora_600SemiBold",
      ...typography.base,
      color: c.foreground,
      marginBottom: 16,
    },
    checkinRow: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    checkinItem: {
      alignItems: "center",
      gap: 6,
      minWidth: 52,
    },
    checkinLabel: {
      fontFamily: "Manrope_500Medium",
      fontSize: 11,
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
      borderRadius: DOT_SIZE / 4,
    },
    emptyPixels: {
      alignItems: "center",
      paddingVertical: 24,
    },
    emptySubtitle: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
    legend: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      marginTop: 14,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 3,
    },
    legendLabel: {
      fontFamily: "Manrope_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },

    // ── Weekly Trend ──
    trendText: {
      fontFamily: "Manrope_400Regular",
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
    trendWeekScore: {
      fontFamily: "Sora_600SemiBold",
      ...typography.xs,
      color: c.foreground,
    },
    trendWeekLabel: {
      fontFamily: "Manrope_400Regular",
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
    distLabel: {
      fontFamily: "Manrope_500Medium",
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
      fontFamily: "Manrope_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
      width: 34,
      textAlign: "right",
    },
  });
