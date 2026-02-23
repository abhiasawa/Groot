import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
        </Pressable>
        <Text style={s.headerTitle}>Insights</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !data?.reports?.length ? (
        <ScrollView
          contentContainerStyle={s.center}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <BarChart3
            size={32}
            color={colors.mutedForeground}
            strokeWidth={1}
          />
          <Text style={s.emptyTitle}>No reports yet</Text>
          <Text style={s.emptySubtitle}>
            Weekly insights are generated automatically as you journal with
            Groot. Check back after your first full week.
          </Text>
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
          {data.reports.map((report: Report) => {
            const moodColor = report.mood_trend
              ? getMoodColorFromName(report.mood_trend, colors)
              : null;

            return (
              <View key={report.id} style={s.reportCard}>
                {/* Week range header */}
                <View style={s.reportHeader}>
                  <View style={s.reportDateRow}>
                    <Calendar
                      size={14}
                      color={colors.mutedForeground}
                      strokeWidth={1.5}
                    />
                    <Text style={s.reportDate}>
                      {formatWeekRange(report.week_start, report.week_end)}
                    </Text>
                  </View>
                  {report.mood_trend && moodColor && (
                    <View style={s.moodPill}>
                      <View
                        style={[s.moodDot, { backgroundColor: moodColor }]}
                      />
                      <Text style={s.moodLabel}>{report.mood_trend}</Text>
                    </View>
                  )}
                </View>

                {/* Summary */}
                <Text style={s.reportSummary} numberOfLines={4}>
                  {report.summary}
                </Text>

                {/* Topics */}
                {report.key_topics && report.key_topics.length > 0 && (
                  <View style={s.topicsRow}>
                    <Hash
                      size={12}
                      color={colors.mutedForeground}
                      strokeWidth={1.5}
                    />
                    {report.key_topics.slice(0, 4).map((topic) => (
                      <View key={topic} style={s.topicBadge}>
                        <Text style={s.topicText}>{topic}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Insights */}
                {report.insights && (
                  <View style={s.insightsRow}>
                    <TrendingUp
                      size={12}
                      color={colors.chart2}
                      strokeWidth={1.5}
                    />
                    <Text style={s.insightsText} numberOfLines={2}>
                      {report.insights}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
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
      paddingHorizontal: 40,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.lg,
      color: c.foreground,
    },
    scroll: {
      padding: 20,
      paddingBottom: 40,
    },
    reportCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
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
      color: c.foreground,
    },
    moodPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.secondary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    moodDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    moodLabel: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.foreground,
    },
    reportSummary: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
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
    topicBadge: {
      backgroundColor: c.secondary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    topicText: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
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
      color: c.mutedForeground,
      fontStyle: "italic",
      lineHeight: 18,
    },
    emptyTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.lg,
      color: c.foreground,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
  });
