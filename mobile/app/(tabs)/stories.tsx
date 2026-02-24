import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Sparkles,
  Flame,
  BookOpen,
  TrendingUp,
  Tag,
  PenLine,
  X,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useStories, useStoryStats } from "../../lib/api/queries";
import { getMoodColorFromName } from "../../constants/mood";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { PressScale } from "../../components/ui/press-scale";
import { PillBadge } from "../../components/ui/pill-badge";
import { SectionHeader } from "../../components/ui/section-header";
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
    const mood =
      (story.metadata as Record<string, unknown>).detectedMood ??
      (story.metadata as Record<string, unknown>).mood;
    if (typeof mood === "string") return mood;
  }
  return null;
}

function getTagsFromMetadata(story: Story): string[] {
  if (story.metadata && typeof story.metadata === "object") {
    const tags =
      (story.metadata as Record<string, unknown>).memoryTags ??
      (story.metadata as Record<string, unknown>).tags;
    if (Array.isArray(tags)) return tags as string[];
  }
  return [];
}

function getStoryText(story: Story): string {
  const content = story.content?.trim();
  if (content) return content;
  const mediaDescription = story.media_description?.trim();
  if (mediaDescription) return mediaDescription;
  return "No story text available yet.";
}

// ── Component ────────────────────────────────

export default function StoriesScreen() {
  const { colors } = useTheme();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
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

  const closeStoryDetail = useCallback(() => {
    setSelectedStory(null);
  }, []);

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
      <SafeAreaView style={s.safeArea}>
        <GradientBackground>
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
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
          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={s.pageTitle}>Stories</Text>
            <Text style={s.pageSubtitle}>Your storyworthy moments</Text>
          </View>

          {/* ── Stats Grid ── */}
          {statsData && (
            <View style={s.statsGrid}>
              <View style={s.statTile}>
                <View
                  style={[
                    s.statIconPill,
                    { backgroundColor: colors.accent + "1A" },
                  ]}
                >
                  <Flame size={14} color={colors.accent} strokeWidth={1.7} />
                </View>
                <Text style={s.statValue}>{statsData.streak}</Text>
                <Text style={s.statLabel}>Streak</Text>
                <Text style={s.statHint}>Consecutive days</Text>
              </View>

              <View style={s.statTile}>
                <View
                  style={[
                    s.statIconPill,
                    { backgroundColor: colors.chart1 + "1A" },
                  ]}
                >
                  <BookOpen size={14} color={colors.chart1} strokeWidth={1.7} />
                </View>
                <Text style={s.statValue}>{statsData.total}</Text>
                <Text style={s.statLabel}>Stories Total</Text>
                <Text style={s.statHint}>All-time count</Text>
              </View>

              <View style={s.statTile}>
                <View
                  style={[
                    s.statIconPill,
                    { backgroundColor: colors.chart2 + "1A" },
                  ]}
                >
                  <TrendingUp size={14} color={colors.chart2} strokeWidth={1.7} />
                </View>
                <Text style={s.statValue}>
                  {statsData.thisMonth}
                  {trendPct !== null && trendPct !== 0 && (
                    <Text
                      style={{
                        ...typography.caption,
                        color: trendPct > 0 ? colors.moodGood : colors.moodLow,
                        fontFamily: "Manrope_500Medium",
                      }}
                    >
                      {" "}
                      {trendPct > 0 ? "+" : ""}
                      {trendPct}%
                    </Text>
                  )}
                </Text>
                <Text style={s.statLabel}>This Month</Text>
                <Text style={s.statHint}>Compared to last month</Text>
              </View>

              <View style={s.statTile}>
                <View
                  style={[
                    s.statIconPill,
                    { backgroundColor: colors.chart4 + "1A" },
                  ]}
                >
                  <Tag size={14} color={colors.chart4} strokeWidth={1.7} />
                </View>
                <Text style={s.statValue} numberOfLines={1}>
                  {statsData.topTags?.[0]?.tag ?? "No theme yet"}
                </Text>
                <Text style={s.statLabel}>Top Theme</Text>
                <Text style={s.statHint}>Most frequent tag</Text>
              </View>
            </View>
          )}

          {/* ── Today's Story Hero ── */}
          <View style={s.section}>
            {todaysStory ? (
              <GlassCard
                delay={100}
                padding={20}
                accentColor={colors.accent}
              >
                <View style={s.heroHeader}>
                  <Sparkles
                    size={16}
                    color={colors.accent}
                    strokeWidth={1.5}
                  />
                  <Text style={s.heroLabel}>TODAY HIGHLIGHT</Text>
                </View>
                <Text style={s.heroContent} numberOfLines={6}>
                  {getStoryText(todaysStory)}
                </Text>
              </GlassCard>
            ) : (
              <GlassCard delay={100} padding={28}>
                <View style={s.promptInner}>
                  <PenLine
                    size={28}
                    color={colors.mutedForeground}
                    strokeWidth={1.5}
                  />
                  <Text style={s.promptTitle}>No story today yet</Text>
                  <Text style={s.promptSubtitle}>
                    Share your day with Groot and a story will be crafted for
                    you.
                  </Text>
                </View>
              </GlassCard>
            )}
          </View>

          {/* ── Weekly Timeline ── */}
          {grouped.length === 0 ? (
            <View style={s.emptyState}>
              <BookOpen
                size={36}
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
                <SectionHeader title={group.week} />
                {group.items.map((story, storyIndex) => {
                  const mood = getMoodFromMetadata(story);
                  const moodColor = mood
                    ? getMoodColorFromName(mood, colors)
                    : undefined;
                  const tags = getTagsFromMetadata(story);
                  const staggerDelay = 150 + storyIndex * 50;

                  return (
                    <PressScale
                      key={story.id}
                      scale={0.985}
                      onPress={() => setSelectedStory(story)}
                    >
                      <GlassCard
                        delay={staggerDelay}
                        padding={16}
                        accentColor={moodColor}
                        style={s.storyCardOuter}
                      >
                        <Text style={s.storyDate}>
                          {formatDate(story.created_at)}
                        </Text>
                        <Text style={s.storyContent} numberOfLines={4}>
                          {getStoryText(story)}
                        </Text>
                        {tags.length > 0 && (
                          <View style={s.tagsRow}>
                            {tags.slice(0, 3).map((tag) => (
                              <PillBadge key={tag} label={tag} small />
                            ))}
                          </View>
                        )}
                      </GlassCard>
                    </PressScale>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>

        {/* ── Story Detail Modal ── */}
        <Modal
          visible={!!selectedStory}
          transparent
          animationType="fade"
          onRequestClose={closeStoryDetail}
        >
          <View style={s.modalOverlay}>
            <Pressable
              style={s.modalBackdrop}
              onPress={closeStoryDetail}
            />
            <View style={s.modalCardWrap}>
              <GlassCard padding={18} style={s.modalCard}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Story</Text>
                  <PressScale
                    onPress={closeStoryDetail}
                    scale={0.94}
                    haptic={false}
                  >
                    <View style={s.modalCloseBtn}>
                      <X size={18} color={colors.mutedForeground} strokeWidth={2} />
                    </View>
                  </PressScale>
                </View>

                {selectedStory ? (
                  <ScrollView
                    style={s.modalBody}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={s.modalMetaRow}>
                      <Text style={s.modalMetaDate}>
                        {new Date(selectedStory.created_at).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>

                    <Text style={s.modalContent}>
                      {getStoryText(selectedStory)}
                    </Text>

                    {getTagsFromMetadata(selectedStory).length > 0 && (
                      <View style={s.modalTags}>
                        {getTagsFromMetadata(selectedStory).map((tag) => (
                          <PillBadge key={tag} label={tag} small />
                        ))}
                      </View>
                    )}
                  </ScrollView>
                ) : null}
              </GlassCard>
            </View>
          </View>
        </Modal>
      </GradientBackground>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const styles = (c: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.gradientStart,
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

    // ── Header ──
    header: {
      marginBottom: 20,
    },
    pageTitle: {
      fontFamily: "Sora_700Bold",
      ...typography.title,
      color: c.foreground,
    },
    pageSubtitle: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      marginTop: 4,
    },

    // ── Stats Grid ──
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 10,
      marginBottom: 24,
    },
    statTile: {
      width: "48.5%",
      minHeight: 118,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.glassBorder,
      backgroundColor: c.glassSurface,
      paddingHorizontal: 12,
      paddingVertical: 12,
      shadowColor: c.elevatedShadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.7,
      shadowRadius: 10,
      elevation: 2,
    },
    statIconPill: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginBottom: 8,
    },
    statValue: {
      fontFamily: "Sora_700Bold",
      ...typography.lg,
      color: c.foreground,
      marginBottom: 2,
    },
    statLabel: {
      fontFamily: "Sora_600SemiBold",
      ...typography.caption,
      color: c.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statHint: {
      fontFamily: "Manrope_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
      marginTop: 2,
      opacity: 0.9,
    },

    // ── Today's Hero ──
    section: {
      marginBottom: 28,
    },
    heroHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 12,
    },
    heroLabel: {
      fontFamily: "Sora_700Bold",
      ...typography.caption,
      color: c.accent,
      letterSpacing: 1.5,
    },
    heroContent: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      color: c.foreground,
      lineHeight: 22,
    },

    // ── Prompt (no story today) ──
    promptInner: {
      alignItems: "center",
    },
    promptTitle: {
      fontFamily: "Sora_600SemiBold",
      ...typography.base,
      color: c.foreground,
      marginTop: 14,
      marginBottom: 6,
    },
    promptSubtitle: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },

    // ── Weekly Timeline ──
    weekGroup: {
      marginBottom: 24,
    },
    storyCardOuter: {
      marginBottom: 10,
    },
    storyDate: {
      fontFamily: "Manrope_500Medium",
      ...typography.caption,
      color: c.mutedForeground,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    storyContent: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      color: c.foreground,
      lineHeight: 22,
    },
    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 12,
    },

    // ── Empty State ──
    emptyState: {
      alignItems: "center",
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontFamily: "Sora_600SemiBold",
      ...typography.lg,
      color: c.foreground,
      marginTop: 18,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },

    // ── Story Detail Modal ──
    modalOverlay: {
      flex: 1,
      justifyContent: "center" as const,
      paddingHorizontal: 20,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(8, 10, 16, 0.66)",
    },
    modalCardWrap: {
      maxHeight: "76%",
    },
    modalCard: {
      borderRadius: 18,
    },
    modalHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: 12,
    },
    modalTitle: {
      fontFamily: "Sora_700Bold",
      ...typography.lg,
      color: c.foreground,
    },
    modalCloseBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    modalBody: {
      maxHeight: "100%",
    },
    modalMetaRow: {
      marginBottom: 14,
    },
    modalMetaDate: {
      fontFamily: "Manrope_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    modalContent: {
      fontFamily: "Manrope_400Regular",
      ...typography.base,
      color: c.foreground,
      lineHeight: 24,
    },
    modalTags: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 6,
      marginTop: 16,
    },
  });
