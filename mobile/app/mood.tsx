import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { useMoodData } from "../lib/api/queries";
import { NotoMascot } from "../components/ui/noto-mascot";
import { fonts, typography } from "../constants/typography";
import {
  notoTheme,
  colors,
  radii,
  shadows,
  spacing,
  ICON_BUTTON_SIZE,
} from "../lib/theme/tokens";

const MOOD_LABELS: Record<number, string> = {
  1: "Bad",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Great",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMoodColor(score: number): string {
  if (score >= 4.5) return "#FFBB2C";
  if (score >= 3.5) return "#8AA230";
  if (score >= 2.5) return "#787163";
  return "#764539";
}

export default function MoodScreen() {
  const router = useRouter();
  const { data, isLoading } = useMoodData();

  const last7Days = useMemo(() => {
    if (!data?.dailyMoods) return [];
    return data.dailyMoods.slice(-7);
  }, [data?.dailyMoods]);

  const avgMood = useMemo(() => {
    if (last7Days.length === 0) return null;
    const sum = last7Days.reduce((a, m) => a + m.score, 0);
    return Math.round((sum / last7Days.length) * 10) / 10;
  }, [last7Days]);

  const currentMoodLabel = data?.recentMood
    ? data.recentMood.charAt(0).toUpperCase() + data.recentMood.slice(1)
    : null;

  // Day-of-week distribution
  const dayDistribution = useMemo(() => {
    if (!data?.dailyMoods || data.dailyMoods.length === 0) return null;

    const dayScores: number[][] = [[], [], [], [], [], [], []];
    for (const m of data.dailyMoods) {
      const d = new Date(m.date + "T00:00:00");
      const day = (d.getDay() + 6) % 7; // Monday-based (0=Mon, 6=Sun)
      dayScores[day]!.push(m.score);
    }

    return DAY_NAMES.map((name, i) => {
      const scores = dayScores[i]!;
      const avg =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
      return { name, avg, count: scores.length };
    });
  }, [data?.dailyMoods]);

  if (isLoading && !data) {
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
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft
              size={18}
              color={notoTheme.foreground}
              strokeWidth={2.2}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Mood</Text>
        </View>

        {/* Current mood / average hero */}
        <View style={styles.currentMood}>
          {avgMood ? (
            <>
              <Text style={styles.currentScore}>{avgMood}</Text>
              <Text style={styles.currentLabel}>
                {currentMoodLabel ??
                  MOOD_LABELS[Math.round(avgMood)] ??
                  "Okay"}
              </Text>
              <Text style={styles.currentMeta}>7-day average out of 5</Text>
            </>
          ) : (
            <>
              <NotoMascot size={80} compact />
              <Text style={styles.emptyTitle}>No mood data yet</Text>
              <Text style={styles.emptySubtitle}>
                Your mood will be tracked as you journal with Groot
              </Text>
            </>
          )}
        </View>

        {/* 7-day trend bars */}
        {last7Days.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Last 7 Days</Text>
            <View style={styles.trendCard}>
              <View
                style={styles.trendBars}
                accessibilityLabel={`Mood trend chart, 7 days, average ${avgMood}`}
              >
                {last7Days.map((m, i) => {
                  const d = new Date(m.date + "T00:00:00");
                  const dayLabel = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][
                    d.getDay()
                  ]!;
                  return (
                    <View key={i} style={styles.trendBarWrap}>
                      <View style={styles.trendBarBg}>
                        <View
                          style={[
                            styles.trendBarFill,
                            {
                              height: `${(m.score / 5) * 100}%`,
                              backgroundColor: getMoodColor(m.score),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.trendBarLabel}>{dayLabel}</Text>
                      <Text style={styles.trendBarScore}>{m.score}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Day-of-week distribution */}
        {dayDistribution && dayDistribution.some((d) => d.count > 0) && (
          <>
            <Text style={styles.sectionTitle}>By Day of Week</Text>
            <View style={styles.distCard}>
              {dayDistribution.map((d) => (
                <View key={d.name} style={styles.distRow}>
                  <Text style={styles.distLabel}>{d.name}</Text>
                  <View style={styles.distBarBg}>
                    {d.avg > 0 && (
                      <View
                        style={[
                          styles.distBarFill,
                          { width: `${(d.avg / 5) * 100}%` },
                        ]}
                      />
                    )}
                  </View>
                  <Text style={styles.distScore}>
                    {d.avg > 0 ? d.avg.toFixed(1) : "\u2014"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Weekly averages */}
        {data?.weeklyTrend && data.weeklyTrend.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Weekly Averages</Text>
            <View style={styles.distCard}>
              {data.weeklyTrend.slice(-8).map((w) => (
                <View key={w.weekStart} style={styles.distRow}>
                  <Text style={[styles.distLabel, styles.distLabelWide]}>
                    {new Date(w.weekStart + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </Text>
                  <View style={styles.distBarBg}>
                    <View
                      style={[
                        styles.distBarFill,
                        { width: `${(w.avgScore / 5) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.distScore}>{w.avgScore}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 60 }} />
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing["2xl"],
  },
  backButton: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    borderRadius: ICON_BUTTON_SIZE / 2,
    backgroundColor: colors.iconButtonBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: notoTheme.foreground,
    letterSpacing: -0.9,
  },
  currentMood: {
    alignItems: "center",
    backgroundColor: notoTheme.card,
    borderRadius: radii.xl,
    padding: spacing["3xl"],
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: notoTheme.border,
    ...shadows.sm,
  },
  currentScore: {
    fontFamily: fonts.bold,
    ...typography.hero,
    color: notoTheme.foreground,
  },
  currentLabel: {
    fontFamily: fonts.semiBold,
    ...typography.xl,
    color: notoTheme.foreground,
    marginTop: 4,
  },
  currentMeta: {
    fontFamily: fonts.regular,
    ...typography.xs,
    color: colors.textSubdued,
    marginTop: 4,
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
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    ...typography.caption,
    color: colors.textFaded,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  trendCard: {
    backgroundColor: notoTheme.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: notoTheme.border,
    ...shadows.sm,
  },
  trendBars: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
  },
  trendBarWrap: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  trendBarBg: {
    width: 24,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.iconButtonBg,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  trendBarFill: {
    width: "100%",
    borderRadius: 8,
  },
  trendBarLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textFaded,
  },
  trendBarScore: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.textSubdued,
  },
  distCard: {
    backgroundColor: notoTheme.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: notoTheme.border,
    ...shadows.sm,
  },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  distLabel: {
    fontFamily: fonts.medium,
    ...typography.caption,
    color: colors.textSubdued,
    width: 36,
  },
  distLabelWide: {
    width: 52,
  },
  distBarBg: {
    flex: 1,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.iconButtonBg,
    overflow: "hidden",
  },
  distBarFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: notoTheme.accent,
  },
  distScore: {
    fontFamily: fonts.bold,
    ...typography.caption,
    color: colors.textSubdued,
    width: 28,
    textAlign: "right",
  },
});
