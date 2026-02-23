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
import {
  Sparkles,
  Flame,
  BookOpen,
  TrendingUp,
  Tag,
  PenLine,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useStories, useStoryStats } from "../../lib/api/queries";
import { getMoodColorFromName } from "../../constants/mood";
import { typography } from "../../constants/typography";
import type { Story } from "../../../shared/types/api";

// ── Helpers ──────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 7) return "This Week";
  if (diffDays < 14) return "Last Week";
  const weeksAgo = Math.floor(diffDays / 7);
  return `${weeksAgo} Weeks Ago`;
}

function groupByWeek(stories: Story[]): { week: string; items: Story[] }[] {
  const map = new Map<string, Story[]>();
  for (const story of stories) {
    const week = getWeekLabel(story.created_at);
    const existing = map.get(week);
    if (existing) {
      existing.push(story);
    } else {
      map.set(week, [story]);
    }
  }
  return Array.from(map.entries()).map(([week, items]) => ({ week, items }));
}

function getMoodFromMetadata(story: Story): string | null {
  if (story.metadata && typeof story.metadata === "object") {
    const mood = (story.metadata as Record<string, unknown>).mood;
    if (typeof mood === "string") return mood;
  }
  return null;
}

function getTagsFromMetadata(story: Story): string[] {
  if (story.metadata && typeof story.metadata === "object") {
    const tags = (story.metadata as Record<string, unknown>).tags;
    if (Array.isArray(tags)) return tags as string[];
  }
  return [];
}

// ── Component ────────────────────────────────

export default function StoriesScreen() {
  const { colors } = useTheme();
  const {
    data: storiesData,
    isLoading: storiesLoading,
    isRefetching: storiesRefetching,
    refetch: refetchStories,
  } = useStories();
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useStoryStats();

  const onRefresh = useCallback(() => {
    refetchStories();
    refetchStats();
  }, [refetchStories, refetchStats]);

  const isLoading = storiesLoading || statsLoading;
  const isRefetching = storiesRefetching;

  const grouped = useMemo(
    () => groupByWeek(storiesData?.stories ?? []),
    [storiesData?.stories],
  );

  // Determine today's story
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysStory = storiesData?.stories?.find((s) =>
    s.created_at.startsWith(todayStr),
  );

  // Trend percentage
  const trendPct = useMemo(() => {
    if (!statsData) return null;
    if (statsData.lastMonth === 0) return statsData.thisMonth > 0 ? 100 : 0;
    return Math.round(
      ((statsData.thisMonth - statsData.lastMonth) / statsData.lastMonth) * 100,
    );
  }, [statsData]);

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
        <Text style={s.pageTitle}>Stories</Text>

        {/* Stats strip */}
        {statsData && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.statsStrip}
          >
            <View style={s.statPill}>
              <Flame size={14} color={colors.accent} strokeWidth={1.5} />
              <Text style={s.statValue}>{statsData.streak}</Text>
              <Text style={s.statLabel}>day streak</Text>
            </View>
            <View style={s.statPill}>
              <BookOpen size={14} color={colors.chart1} strokeWidth={1.5} />
              <Text style={s.statValue}>{statsData.total}</Text>
              <Text style={s.statLabel}>total</Text>
            </View>
            <View style={s.statPill}>
              <TrendingUp size={14} color={colors.chart2} strokeWidth={1.5} />
              <Text style={s.statValue}>{statsData.thisMonth}</Text>
              <Text style={s.statLabel}>
                this month
                {trendPct !== null && trendPct !== 0 && (
                  <Text
                    style={{
                      color: trendPct > 0 ? colors.moodGood : colors.moodLow,
                    }}
                  >
                    {" "}
                    {trendPct > 0 ? "+" : ""}
                    {trendPct}%
                  </Text>
                )}
              </Text>
            </View>
            {statsData.topTags?.[0] && (
              <View style={s.statPill}>
                <Tag size={14} color={colors.chart4} strokeWidth={1.5} />
                <Text style={s.statValue}>{statsData.topTags[0].tag}</Text>
                <Text style={s.statLabel}>top theme</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Today's story hero */}
        <View style={s.section}>
          {todaysStory ? (
            <View style={s.heroCard}>
              <View style={s.heroHeader}>
                <Sparkles
                  size={16}
                  color={colors.accent}
                  strokeWidth={1.5}
                />
                <Text style={s.heroLabel}>Today's Story</Text>
              </View>
              <Text style={s.heroContent} numberOfLines={6}>
                {todaysStory.content}
              </Text>
            </View>
          ) : (
            <View style={s.promptCard}>
              <PenLine
                size={24}
                color={colors.mutedForeground}
                strokeWidth={1.5}
              />
              <Text style={s.promptTitle}>No story today yet</Text>
              <Text style={s.promptSubtitle}>
                Share your day with Groot and a story will be crafted for you.
              </Text>
            </View>
          )}
        </View>

        {/* Weekly grouped timeline */}
        {grouped.length === 0 ? (
          <View style={s.emptyState}>
            <BookOpen
              size={32}
              color={colors.mutedForeground}
              strokeWidth={1}
            />
            <Text style={s.emptyTitle}>Your story collection is empty</Text>
            <Text style={s.emptySubtitle}>
              As you share your experiences, Groot will weave them into
              meaningful stories.
            </Text>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.week} style={s.weekGroup}>
              <Text style={s.weekLabel}>{group.week}</Text>
              {group.items.map((story) => {
                const mood = getMoodFromMetadata(story);
                const moodColor = mood
                  ? getMoodColorFromName(mood, colors)
                  : colors.border;
                const tags = getTagsFromMetadata(story);

                return (
                  <View
                    key={story.id}
                    style={[s.storyCard, { borderLeftColor: moodColor }]}
                  >
                    <Text style={s.storyDate}>
                      {formatDate(story.created_at)}
                    </Text>
                    <Text style={s.storyContent} numberOfLines={4}>
                      {story.content}
                    </Text>
                    {tags.length > 0 && (
                      <View style={s.tagsRow}>
                        {tags.slice(0, 3).map((tag) => (
                          <View key={tag} style={s.tagBadge}>
                            <Text style={s.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}
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
      padding: 20,
      paddingBottom: 40,
    },
    pageTitle: {
      fontFamily: "Inter_700Bold",
      ...typography["2xl"],
      color: c.foreground,
      marginBottom: 16,
    },
    statsStrip: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 24,
      paddingRight: 20,
    },
    statPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    statValue: {
      fontFamily: "Inter_600SemiBold",
      ...typography.sm,
      color: c.foreground,
    },
    statLabel: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    section: {
      marginBottom: 24,
    },
    heroCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderLeftWidth: 3,
      borderLeftColor: c.accent,
    },
    heroHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 10,
    },
    heroLabel: {
      fontFamily: "Inter_600SemiBold",
      ...typography.sm,
      color: c.accent,
    },
    heroContent: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
      lineHeight: 22,
    },
    promptCard: {
      backgroundColor: c.secondary,
      borderRadius: 12,
      padding: 24,
      alignItems: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    promptTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.base,
      color: c.foreground,
      marginTop: 12,
      marginBottom: 6,
    },
    promptSubtitle: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
    weekGroup: {
      marginBottom: 24,
    },
    weekLabel: {
      fontFamily: "Inter_600SemiBold",
      ...typography.sm,
      color: c.mutedForeground,
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    storyCard: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderLeftWidth: 3,
    },
    storyDate: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
      marginBottom: 6,
    },
    storyContent: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
      lineHeight: 22,
    },
    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 10,
    },
    tagBadge: {
      backgroundColor: c.secondary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    tagText: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
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
