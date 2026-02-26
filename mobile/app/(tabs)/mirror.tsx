import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Brain,
  TrendingUp,
  Award,
  Calendar,
  MessageSquare,
  Bookmark,
  Clock,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useMirror } from "../../lib/api/queries";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { SectionHeader } from "../../components/ui/section-header";
import { WeeklyCard } from "../../components/garden/weekly-card";
import { ProfileFacts } from "../../components/mirror/profile-facts";
import { TabSwipeView } from "../../components/ui/tab-swipe-view";

// ── Pattern Category Colors ──────────────────

function getPatternColor(category: string, colors: ReturnType<typeof useTheme>["colors"]) {
  switch (category) {
    case "emotional": return colors.moodOkay;
    case "behavioral": return colors.primary;
    case "relational": return colors.accent;
    case "growth": return colors.moodGreat;
    default: return colors.primary;
  }
}

// ── Milestone Icon ───────────────────────────

function getMilestoneIcon(icon: string) {
  switch (icon) {
    case "flame": return TrendingUp;
    case "trophy": return Award;
    case "calendar":
    case "calendar-check": return Calendar;
    case "brain": return Brain;
    case "chart": return TrendingUp;
    default: return Award;
  }
}

// ── Main Screen ──────────────────────────────

export default function MirrorScreen() {
  const { colors } = useTheme();
  const { data, isLoading, refetch } = useMirror();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    refetch().finally(() => setIsPullRefreshing(false));
  }, [refetch]);

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

  const stats = data?.stats;
  const patterns = data?.patterns ?? [];
  const milestones = data?.milestones ?? [];
  const weeklyReports = data?.weeklyReports ?? [];
  const profileFacts = data?.profileFacts ?? [];

  return (
    <TabSwipeView currentTab="garden">
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
            {/* Header */}
            <View style={s.headerRow}>
              <Text style={s.pageTitle}>Mirror</Text>
              {stats?.displayName && (
                <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
                  A reflection of {stats.displayName}
                </Text>
              )}
            </View>

            {/* Narrative Bio */}
            {data?.narrativeBio && (
              <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                <GlassCard padding={18}>
                  <Text style={[s.bioText, { color: colors.foreground }]}>
                    {data.narrativeBio}
                  </Text>
                </GlassCard>
              </Animated.View>
            )}

            {/* Stats Row — only show when there's meaningful data */}
            {stats && (stats.totalMessages > 0 || stats.totalMemories > 0 || stats.daysActive > 0) && (
              <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                <View style={s.statsRow}>
                  <StatBox
                    icon={MessageSquare}
                    label="Messages"
                    value={stats.totalMessages}
                    colors={colors}
                  />
                  <StatBox
                    icon={Bookmark}
                    label="Memories"
                    value={stats.totalMemories}
                    colors={colors}
                  />
                  <StatBox
                    icon={Clock}
                    label="Days"
                    value={stats.daysActive}
                    colors={colors}
                  />
                </View>
              </Animated.View>
            )}

            {/* Patterns */}
            {patterns.length > 0 && (
              <View style={s.sectionGap}>
                <SectionHeader title="Patterns" />
                {patterns.map((pattern, i) => (
                  <Animated.View
                    key={pattern.id}
                    entering={FadeInDown.duration(350).delay(300 + i * 80)}
                  >
                    <GlassCard padding={14} style={s.patternCard}>
                      <View style={s.patternHeader}>
                        <View
                          style={[
                            s.patternDot,
                            { backgroundColor: getPatternColor(pattern.category, colors) },
                          ]}
                        />
                        <Text style={[s.patternTitle, { color: colors.foreground }]}>
                          {pattern.title}
                        </Text>
                        <Text style={[s.patternCategory, { color: colors.mutedForeground }]}>
                          {pattern.category}
                        </Text>
                      </View>
                      <Text style={[s.patternDesc, { color: colors.mutedForeground }]}>
                        {pattern.description}
                      </Text>
                      <View style={s.patternFooter}>
                        <View
                          style={[
                            s.confidenceBar,
                            { backgroundColor: colors.secondary },
                          ]}
                        >
                          <View
                            style={[
                              s.confidenceFill,
                              {
                                backgroundColor: getPatternColor(pattern.category, colors),
                                width: `${pattern.confidence * 100}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[s.patternTimeframe, { color: colors.mutedForeground }]}>
                          {pattern.timeframe}
                        </Text>
                      </View>
                    </GlassCard>
                  </Animated.View>
                ))}
              </View>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <View style={s.sectionGap}>
                <SectionHeader title="Milestones" />
                <View style={s.milestonesGrid}>
                  {milestones.slice(0, 6).map((milestone) => {
                    const Icon = getMilestoneIcon(milestone.icon);
                    return (
                      <GlassCard key={milestone.id} padding={12} style={s.milestoneCard}>
                        <View
                          style={[
                            s.milestoneIcon,
                            { backgroundColor: `${colors.accent}18` },
                          ]}
                        >
                          <Icon size={18} color={colors.accent} />
                        </View>
                        <Text
                          style={[s.milestoneTitle, { color: colors.foreground }]}
                          numberOfLines={1}
                        >
                          {milestone.title}
                        </Text>
                        <Text
                          style={[s.milestoneDesc, { color: colors.mutedForeground }]}
                          numberOfLines={2}
                        >
                          {milestone.description}
                        </Text>
                      </GlassCard>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Weekly Archive */}
            {weeklyReports.length > 0 && (
              <View style={s.sectionGap}>
                <SectionHeader title="Weekly Archive" />
                {weeklyReports.map((report) => (
                  <View key={report.id} style={{ marginBottom: 10 }}>
                    <WeeklyCard report={report} />
                  </View>
                ))}
              </View>
            )}

            {/* Profile Facts */}
            {profileFacts.length > 0 && (
              <View style={s.sectionGap}>
                <ProfileFacts facts={profileFacts} />
              </View>
            )}

            {/* Empty state when no meaningful data yet */}
            {!data?.narrativeBio && patterns.length === 0 && milestones.length === 0 && profileFacts.length === 0 && (
              <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                <GlassCard padding={24}>
                  <Text style={[s.emptyIcon]}>🪞</Text>
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>
                    Your mirror is forming
                  </Text>
                  <Text style={[s.emptyDesc, { color: colors.mutedForeground }]}>
                    As you chat with Groot, this screen will reflect your patterns,
                    milestones, and personal insights. Start a conversation to see
                    your story unfold.
                  </Text>
                </GlassCard>
              </Animated.View>
            )}
          </ScrollView>
        </GradientBackground>
      </SafeAreaView>
    </TabSwipeView>
  );
}

// ── Stat Box ─────────────────────────────────

function StatBox({
  icon: Icon,
  label,
  value,
  colors,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: number;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <GlassCard padding={12} style={statStyles.box}>
      <Icon size={16} color={colors.primary} strokeWidth={1.8} />
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </GlassCard>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontFamily: "Sora_700Bold",
    ...typography.xl,
  },
  label: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
});

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
      padding: 20,
      paddingBottom: 90,
    },
    headerRow: {
      marginBottom: 16,
    },
    pageTitle: {
      fontFamily: "Sora_700Bold",
      ...typography.title,
      color: c.foreground,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      marginTop: 2,
    },
    bioText: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      lineHeight: 22,
      fontStyle: "italic",
    },
    statsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },
    sectionGap: {
      marginTop: 20,
    },
    patternCard: {
      marginBottom: 8,
    },
    patternHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    },
    patternDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    patternTitle: {
      fontFamily: "Sora_600SemiBold",
      ...typography.sm,
      flex: 1,
    },
    patternCategory: {
      fontFamily: "Manrope_400Regular",
      ...typography.xs,
      textTransform: "capitalize",
    },
    patternDesc: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      lineHeight: 20,
      marginBottom: 8,
    },
    patternFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    confidenceBar: {
      flex: 1,
      height: 3,
      borderRadius: 1.5,
      overflow: "hidden",
    },
    confidenceFill: {
      height: "100%",
      borderRadius: 1.5,
    },
    patternTimeframe: {
      fontFamily: "Manrope_400Regular",
      fontSize: 10,
    },
    milestonesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    milestoneCard: {
      width: "47%",
      alignItems: "center",
    },
    milestoneIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    milestoneTitle: {
      fontFamily: "Sora_600SemiBold",
      ...typography.xs,
      textAlign: "center",
      marginBottom: 2,
    },
    milestoneDesc: {
      fontFamily: "Manrope_400Regular",
      fontSize: 10,
      textAlign: "center",
      lineHeight: 14,
    },
    emptyIcon: {
      fontSize: 40,
      textAlign: "center",
      marginBottom: 12,
    },
    emptyTitle: {
      fontFamily: "Sora_600SemiBold",
      ...typography.base,
      textAlign: "center",
      marginBottom: 8,
    },
    emptyDesc: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      textAlign: "center",
      lineHeight: 22,
    },
  });
