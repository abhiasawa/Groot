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
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  TrendingUp,
  Hash,
} from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useReports } from "../lib/api/queries";
import { getMoodColorFromName } from "../constants/mood";
import { typography } from "../constants/typography";
import { GradientBackground } from "../components/ui/gradient-background";
import { GlassCard } from "../components/ui/glass-card";
import { PressScale } from "../components/ui/press-scale";
import { SectionHeader } from "../components/ui/section-header";
import { PillBadge } from "../components/ui/pill-badge";
import type { Report } from "../../shared/types/api";

// ── Helpers ──────────────────────────────────

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} - ${e.toLocaleDateString("en-US", opts)}`;
}

// ── Component ────────────────────────────────

export default function InsightsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useReports();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <PressScale onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
          </PressScale>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Insights
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.mutedForeground }]}
            >
              Your weekly reflections
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !data?.reports?.length ? (
          <ScrollView
            contentContainerStyle={styles.center}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <Animated.View
              entering={FadeInDown.duration(420)}
              style={[
                styles.emptyIconContainer,
                { backgroundColor: colors.glassSurface },
              ]}
            >
              <BarChart3
                size={32}
                color={colors.mutedForeground}
                strokeWidth={1}
              />
            </Animated.View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No reports yet
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
            >
              Weekly insights are generated automatically as you journal with
              Groot. Check back after your first full week.
            </Text>
          </ScrollView>
        ) : (
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
            <SectionHeader title="Weekly Reports" />

            {data.reports.map((report: Report, index: number) => {
              const moodColor = report.mood_trend
                ? getMoodColorFromName(report.mood_trend, colors)
                : null;

              return (
                <GlassCard
                  key={report.id}
                  accentColor={moodColor ?? undefined}
                  delay={index * 100}
                  style={styles.reportCard}
                >
                  {/* Week range header */}
                  <View style={styles.reportHeader}>
                    <View style={styles.reportDateRow}>
                      <Calendar
                        size={14}
                        color={colors.mutedForeground}
                        strokeWidth={1.5}
                      />
                      <Text
                        style={[
                          styles.reportDate,
                          { color: colors.foreground },
                        ]}
                      >
                        {formatWeekRange(report.week_start, report.week_end)}
                      </Text>
                    </View>
                    {report.mood_trend && moodColor && (
                      <PillBadge
                        label={report.mood_trend}
                        color={moodColor}
                        textColor="#FFFFFF"
                        small
                      />
                    )}
                  </View>

                  {/* Summary */}
                  <Text
                    style={[
                      styles.reportSummary,
                      { color: colors.foreground },
                    ]}
                    numberOfLines={4}
                  >
                    {report.summary}
                  </Text>

                  {/* Topics */}
                  {report.key_topics && report.key_topics.length > 0 && (
                    <View style={styles.topicsRow}>
                      <Hash
                        size={12}
                        color={colors.mutedForeground}
                        strokeWidth={1.5}
                      />
                      {report.key_topics.slice(0, 4).map((topic) => (
                        <PillBadge key={topic} label={topic} small />
                      ))}
                    </View>
                  )}

                  {/* Insights */}
                  {report.insights && (
                    <View style={styles.insightsRow}>
                      <TrendingUp
                        size={12}
                        color={colors.chart2}
                        strokeWidth={1.5}
                      />
                      <Text
                        style={[
                          styles.insightsText,
                          { color: colors.mutedForeground },
                        ]}
                        numberOfLines={2}
                      >
                        {report.insights}
                      </Text>
                    </View>
                  )}
                </GlassCard>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

// ── Styles ───────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    ...typography.lg,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    marginTop: 2,
  },
  headerSpacer: {
    width: 24,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  reportCard: {
    marginBottom: 12,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  reportDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reportDate: {
    fontFamily: "Inter_600SemiBold",
    ...typography.sm,
  },
  reportSummary: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    lineHeight: 22,
    marginBottom: 12,
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
    marginTop: 4,
  },
  insightsText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    fontStyle: "italic",
    lineHeight: 18,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    ...typography.lg,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
});
