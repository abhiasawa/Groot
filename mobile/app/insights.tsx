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
import { useRouter, useSegments } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BarChart3, Calendar, Hash, TrendingUp } from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useMemories, useReports, useTasks, useTopics } from "../lib/api/queries";
import { getMoodColorFromName } from "../constants/mood";
import { typography } from "../constants/typography";
import { GradientBackground } from "../components/ui/gradient-background";
import { GlassCard } from "../components/ui/glass-card";
import { SectionHeader } from "../components/ui/section-header";
import { PillBadge } from "../components/ui/pill-badge";
import { DeepScreenHeader } from "../components/ui/deep-screen-header";
import { TabSwipeView } from "../components/ui/tab-swipe-view";
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
  const segments = useSegments();
  const { data, isLoading, isRefetching, refetch } = useReports();
  const { data: memoriesData, refetch: refetchMemories } = useMemories({ limit: 200 });
  const { data: tasksData, refetch: refetchTasks } = useTasks();
  const { data: topicsData, refetch: refetchTopics } = useTopics();
  const isTabRoute = segments[0] === "(tabs)";

  const onRefresh = useCallback(() => {
    Promise.all([refetch(), refetchMemories(), refetchTasks(), refetchTopics()]).catch(() => {});
  }, [refetch, refetchMemories, refetchTasks, refetchTopics]);

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

  const liveInsights = useMemo(() => {
    const memories = memoriesData?.memories ?? [];
    const tasks = tasksData?.tasks ?? [];
    const topics = [...(topicsData?.topics ?? [])].sort((a, b) => b.memoryCount - a.memoryCount);

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const entriesLast7d = memories.filter((memory) => new Date(memory.created_at) >= sevenDaysAgo);
    const audioCount = entriesLast7d.filter((memory) => memory.message_type === "audio").length;
    const imageCount = entriesLast7d.filter((memory) => memory.message_type === "image").length;
    const textCount = entriesLast7d.filter((memory) => memory.message_type === "text").length;
    const openTasks = tasks.filter((task) => !task.is_completed).length;

    const dateSet = new Set(memories.map((memory) => memory.created_at.slice(0, 10)));
    let streakDays = 0;
    const cursor = new Date(now);
    while (streakDays < 30) {
      const dateKey = cursor.toISOString().slice(0, 10);
      if (!dateSet.has(dateKey)) break;
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    let guidance = "Keep writing daily to unlock stronger weekly trends.";
    if (openTasks >= 5) guidance = "Task load is high. Close 1-2 tasks before capturing more.";
    else if (entriesLast7d.length >= 5) guidance = "Momentum is strong. Turn one repeated theme into a concrete task.";
    else if (audioCount >= Math.max(textCount, 2)) guidance = "Voice captures are dominant. Add one short text reflection for clarity.";

    return {
      hasData: memories.length > 0 || tasks.length > 0 || topics.length > 0,
      entriesLast7d: entriesLast7d.length,
      audioCount,
      imageCount,
      textCount,
      openTasks,
      streakDays,
      topTopicName: topics[0]?.name ?? "No topic yet",
      guidance,
    };
  }, [memoriesData?.memories, tasksData?.tasks, topicsData?.topics]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TabSwipeView currentTab="insights" enabled={isTabRoute}>
          <GradientBackground>
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </GradientBackground>
        </TabSwipeView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TabSwipeView currentTab="insights" enabled={isTabRoute}>
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
          {isTabRoute ? (
            <View style={styles.tabHeader}>
              <Text style={[styles.tabTitle, { color: colors.foreground }]}>Insights</Text>
              <Text style={[styles.tabSubtitle, { color: colors.mutedForeground }]}>
                Weekly synthesis from your memory stream.
              </Text>
            </View>
          ) : (
            <DeepScreenHeader
              title="Insights"
              subtitle="Weekly synthesis from your memory stream."
              onBack={() => router.back()}
              tags={["Weekly Reports", "Trends"]}
            />
          )}

          {!reports.length ? (
            liveInsights.hasData ? (
              <>
                <SectionHeader title="Live Insights" />
                <GlassCard padding={18} accentColor={colors.primary} style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Stat label="7d Entries" value={liveInsights.entriesLast7d} />
                    <Stat label="Open Tasks" value={liveInsights.openTasks} />
                    <Stat label="Streak" value={liveInsights.streakDays} />
                  </View>
                </GlassCard>

                <GlassCard padding={16} style={styles.reportCard}>
                  <Text style={[styles.liveTitle, { color: colors.foreground }]}>Capture Mix</Text>
                  <Text style={[styles.liveBody, { color: colors.mutedForeground }]}>
                    Text {liveInsights.textCount} • Voice {liveInsights.audioCount} • Photo {liveInsights.imageCount}
                  </Text>
                  <Text style={[styles.liveBody, { color: colors.mutedForeground }]}>
                    Top topic: {liveInsights.topTopicName}
                  </Text>
                </GlassCard>

                <GlassCard padding={16} style={styles.reportCard}>
                  <View style={styles.insightsRow}>
                    <TrendingUp size={12} color={colors.chart2} strokeWidth={1.6} />
                    <Text style={[styles.insightsText, { color: colors.mutedForeground }]}>
                      {liveInsights.guidance}
                    </Text>
                  </View>
                </GlassCard>
              </>
            ) : (
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
                      No insights yet
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                      Add journal entries and tasks. Insights will start filling automatically.
                    </Text>
                  </View>
                </GlassCard>
              </Animated.View>
            )
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
        </GradientBackground>
      </TabSwipeView>
    </SafeAreaView>
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
  tabHeader: {
    marginBottom: 16,
  },
  tabTitle: {
    fontFamily: "Sora_700Bold",
    ...typography["2xl"],
  },
  tabSubtitle: {
    marginTop: 2,
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
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
  liveTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
    marginBottom: 6,
  },
  liveBody: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 20,
  },
});
