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
import { BarChart3, Calendar, Hash, TrendingUp } from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useReports } from "../lib/api/queries";
import { getMoodColorFromName } from "../constants/mood";
import { typography } from "../constants/typography";
import { GradientBackground } from "../components/ui/gradient-background";
import { GlassCard } from "../components/ui/glass-card";
import { SectionHeader } from "../components/ui/section-header";
import { PillBadge } from "../components/ui/pill-badge";
import { DeepScreenHeader } from "../components/ui/deep-screen-header";
import type { Report } from "../../shared/types/api";

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} - ${e.toLocaleDateString("en-US", opts)}`;
}

export default function InsightsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useReports();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const reports = data?.reports ?? [];
  const latest = reports[0];
  const archive = reports.slice(1);

  const summary = useMemo(() => {
    const topics = new Set<string>();
    reports.forEach((r) => (r.key_topics ?? []).forEach((t) => topics.add(t)));
    return {
      totalReports: reports.length,
      uniqueTopics: topics.size,
    };
  }, [reports]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <GradientBackground>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
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
            title="Insights"
            subtitle="Weekly synthesis from your memory stream."
            onBack={() => router.back()}
            tags={["Weekly Reports", "Trends"]}
          />

          {!reports.length ? (
            <Animated.View entering={FadeInDown.duration(420)}>
              <GlassCard padding={26}>
                <View style={styles.emptyState}>
                  <View
                    style={[
                      styles.emptyIconContainer,
                      { backgroundColor: colors.glassSurface },
                    ]}
                  >
                    <BarChart3 size={32} color={colors.mutedForeground} strokeWidth={1.1} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    No reports yet
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                    Weekly insights appear automatically as you keep journaling.
                    Check back after your first full week.
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>
          ) : (
            <>
              <GlassCard padding={18} accentColor={colors.primary} style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Stat label="Reports" value={summary.totalReports} />
                  <Stat label="Topics" value={summary.uniqueTopics} />
                </View>
              </GlassCard>

              {latest ? (
                <>
                  <SectionHeader title="Latest Brief" />
                  <GlassCard
                    accentColor={
                      latest.mood_trend ? getMoodColorFromName(latest.mood_trend, colors) : colors.primary
                    }
                    padding={18}
                    style={styles.reportCard}
                  >
                    <View style={styles.reportHeader}>
                      <View style={styles.reportDateRow}>
                        <Calendar size={14} color={colors.mutedForeground} strokeWidth={1.6} />
                        <Text style={[styles.reportDate, { color: colors.foreground }]}>
                          {formatWeekRange(latest.week_start, latest.week_end)}
                        </Text>
                      </View>
                      {latest.mood_trend ? (
                        <PillBadge
                          label={latest.mood_trend}
                          color={getMoodColorFromName(latest.mood_trend, colors)}
                          textColor="#FFFFFF"
                          small
                        />
                      ) : null}
                    </View>

                    <Text style={[styles.reportSummary, { color: colors.foreground }]}>
                      {latest.summary}
                    </Text>

                    {(latest.key_topics?.length ?? 0) > 0 ? (
                      <View style={styles.topicsRow}>
                        <Hash size={12} color={colors.mutedForeground} strokeWidth={1.5} />
                        {latest.key_topics?.slice(0, 4).map((topic) => (
                          <PillBadge key={topic} label={topic} small />
                        ))}
                      </View>
                    ) : null}

                    {latest.insights ? (
                      <View style={styles.insightsRow}>
                        <TrendingUp size={12} color={colors.chart2} strokeWidth={1.6} />
                        <Text style={[styles.insightsText, { color: colors.mutedForeground }]}>
                          {latest.insights}
                        </Text>
                      </View>
                    ) : null}
                  </GlassCard>
                </>
              ) : null}

              {archive.length > 0 ? (
                <>
                  <SectionHeader title="Archive" />
                  {archive.map((report: Report, index: number) => {
                    const moodColor = report.mood_trend
                      ? getMoodColorFromName(report.mood_trend, colors)
                      : null;

                    return (
                      <GlassCard
                        key={report.id}
                        accentColor={moodColor ?? undefined}
                        delay={index * 60}
                        padding={16}
                        style={styles.reportCard}
                      >
                        <View style={styles.reportHeader}>
                          <View style={styles.reportDateRow}>
                            <Calendar size={13} color={colors.mutedForeground} strokeWidth={1.5} />
                            <Text style={[styles.reportDate, { color: colors.foreground }]}>
                              {formatWeekRange(report.week_start, report.week_end)}
                            </Text>
                          </View>
                          {report.mood_trend && moodColor ? (
                            <PillBadge
                              label={report.mood_trend}
                              color={moodColor}
                              textColor="#FFFFFF"
                              small
                            />
                          ) : null}
                        </View>
                        <Text
                          style={[styles.reportSummary, { color: colors.foreground }]}
                          numberOfLines={4}
                        >
                          {report.summary}
                        </Text>
                      </GlassCard>
                    );
                  })}
                </>
              ) : null}
            </>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  summaryCard: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontFamily: "Sora_700Bold",
    ...typography.xl,
  },
  statLabel: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    marginTop: 2,
  },
  reportCard: {
    marginBottom: 12,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  reportDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  reportDate: {
    fontFamily: "Sora_600SemiBold",
    ...typography.sm,
  },
  reportSummary: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
    marginBottom: 10,
  },
  topicsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  insightsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 2,
  },
  insightsText: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    fontStyle: "italic",
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 20,
  },
});
