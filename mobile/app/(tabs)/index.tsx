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
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
  Brain,
  CheckSquare,
  Bell,
  Flame,
  Sparkles,
  BookOpen,
  ChevronRight,
  Leaf,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useHome } from "../../lib/api/queries";
import { getMoodColorFromName } from "../../constants/mood";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { PressScale } from "../../components/ui/press-scale";
import { SectionHeader } from "../../components/ui/section-header";
import { PillBadge } from "../../components/ui/pill-badge";
import { AnimatedStat } from "../../components/ui/animated-stat";
import type { HomeData } from "../../../shared/types/api";

// ── Helpers ──────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getSubGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Let's make today count.";
  if (hour < 17) return "How's your day going?";
  return "Time to wind down.";
}

// ── Component ────────────────────────────────

export default function HomeScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isRefetching, refetch } = useHome();
  const router = useRouter();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Loading state ──────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  const home = data as HomeData | undefined;

  // ── Empty state (no data at all) ───────────

  if (!home) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          <View style={styles.emptyContainer}>
            <Animated.View
              entering={FadeIn.delay(100).duration(600)}
              style={styles.emptyIconWrap}
            >
              <Leaf size={48} color={colors.primary} strokeWidth={1.2} />
            </Animated.View>
            <Animated.Text
              entering={FadeIn.delay(250).duration(600)}
              style={[styles.emptyTitle, { color: colors.foreground }]}
            >
              Your garden awaits
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.delay(400).duration(600)}
              style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
            >
              Send your first message to Groot on WhatsApp or Telegram to begin
              building your second brain.
            </Animated.Text>
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  // ── Mood data ──────────────────────────────

  const moodColor = home.recentMood
    ? getMoodColorFromName(home.recentMood, colors)
    : undefined;

  // ── Main render ────────────────────────────

  return (
    <SafeAreaView style={styles.flex}>
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
          {/* ── Hero Greeting ───────────────── */}
          <Animated.View
            entering={FadeIn.duration(700)}
            style={styles.heroSection}
          >
            <Text style={[styles.greeting, { color: colors.foreground }]}>
              {getGreeting()},
            </Text>
            <Text style={[styles.heroName, { color: colors.foreground }]}>
              {home.displayName ?? "there"}
            </Text>
            <Text
              style={[styles.subGreeting, { color: colors.mutedForeground }]}
            >
              {getSubGreeting()}
            </Text>
          </Animated.View>

          {/* ── Mood Pill ──────────────────── */}
          {home.recentMood && moodColor && (
            <Animated.View
              entering={FadeInDown.delay(100).duration(420)}
              style={styles.moodSection}
            >
              <View style={styles.moodPillRow}>
                <View
                  style={[styles.moodDot, { backgroundColor: moodColor }]}
                />
                <PillBadge
                  label={`Feeling ${home.recentMood.toLowerCase()}`}
                  style={styles.moodPill}
                />
              </View>
            </Animated.View>
          )}

          {/* ── Stats Grid ─────────────────── */}
          <View style={styles.sectionSpacing}>
            <SectionHeader title="Overview" />
            <View style={styles.statsGrid}>
              <PressScale
                style={styles.statCardHalf}
                onPress={() => router.push("/(tabs)/journal")}
              >
                <GlassCard delay={0} padding={16}>
                  <AnimatedStat
                    value={home.memoriesCount ?? 0}
                    label="Memories"
                    icon={
                      <Brain
                        size={20}
                        color={colors.chart1}
                        strokeWidth={1.5}
                      />
                    }
                  />
                </GlassCard>
              </PressScale>

              <PressScale
                style={styles.statCardHalf}
                onPress={() => router.push("/tasks" as never)}
              >
                <GlassCard delay={50} padding={16}>
                  <AnimatedStat
                    value={home.pendingTasks ?? 0}
                    label="Tasks"
                    icon={
                      <CheckSquare
                        size={20}
                        color={colors.chart2}
                        strokeWidth={1.5}
                      />
                    }
                  />
                </GlassCard>
              </PressScale>

              <PressScale
                style={styles.statCardHalf}
                onPress={() => router.push("/tasks" as never)}
              >
                <GlassCard delay={100} padding={16}>
                  <AnimatedStat
                    value={home.upcomingReminders ?? 0}
                    label="Reminders"
                    icon={
                      <Bell
                        size={20}
                        color={colors.chart3}
                        strokeWidth={1.5}
                      />
                    }
                  />
                </GlassCard>
              </PressScale>

              <PressScale
                style={styles.statCardHalf}
                onPress={() => router.push("/habits" as never)}
              >
                <GlassCard delay={150} padding={16}>
                  <AnimatedStat
                    value={home.habitsCount ?? 0}
                    label="Habits"
                    icon={
                      <Flame
                        size={20}
                        color={colors.chart4}
                        strokeWidth={1.5}
                      />
                    }
                  />
                </GlassCard>
              </PressScale>
            </View>
          </View>

          {/* ── Flashback ──────────────────── */}
          {home.flashback && (
            <View style={styles.sectionSpacing}>
              <SectionHeader title="Flashback" />
              <GlassCard
                accentColor={colors.accent}
                delay={200}
                padding={18}
              >
                <View style={styles.flashbackHeader}>
                  <Sparkles
                    size={16}
                    color={colors.accent}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={[
                      styles.flashbackLabel,
                      { color: colors.accent },
                    ]}
                  >
                    From your memory
                  </Text>
                </View>
                <Text
                  style={[
                    styles.flashbackContent,
                    { color: colors.foreground },
                  ]}
                  numberOfLines={4}
                >
                  {home.flashback.content}
                </Text>
                <Text
                  style={[
                    styles.flashbackDate,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {new Date(home.flashback.created_at).toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" },
                  )}
                </Text>
              </GlassCard>
            </View>
          )}

          {/* ── Journal Link ───────────────── */}
          <View style={styles.sectionSpacing}>
            <SectionHeader title="Journal" />
            <PressScale onPress={() => router.push("/(tabs)/journal")}>
              <GlassCard delay={250} padding={20}>
                <View style={styles.journalRow}>
                  <View style={styles.journalLeft}>
                    <View
                      style={[
                        styles.journalIconWrap,
                        { backgroundColor: colors.primary + "18" },
                      ]}
                    >
                      <BookOpen
                        size={20}
                        color={colors.primary}
                        strokeWidth={1.5}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.journalTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        Open Journal
                      </Text>
                      <Text
                        style={[
                          styles.journalSubtitle,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {home.memoriesCount ?? 0}{" "}
                        {home.memoriesCount === 1 ? "memory" : "memories"}{" "}
                        stored
                      </Text>
                    </View>
                  </View>
                  <ChevronRight
                    size={20}
                    color={colors.mutedForeground}
                    strokeWidth={1.5}
                  />
                </View>
              </GlassCard>
            </PressScale>
          </View>

          {/* bottom spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    marginBottom: 24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    ...typography.title,
    textAlign: "center",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.base,
    textAlign: "center",
    lineHeight: 24,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Hero greeting
  heroSection: {
    marginBottom: 8,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    ...typography.xl,
    marginBottom: 2,
  },
  heroName: {
    fontFamily: "Inter_700Bold",
    ...typography.hero,
    marginBottom: 6,
  },
  subGreeting: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
  },

  // Mood
  moodSection: {
    marginBottom: 8,
    marginTop: 4,
  },
  moodPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  moodPill: {
    borderWidth: 0,
  },

  // Section spacing
  sectionSpacing: {
    marginTop: 24,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCardHalf: {
    width: "47%",
    flexGrow: 1,
  },

  // Flashback
  flashbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  flashbackLabel: {
    fontFamily: "Inter_600SemiBold",
    ...typography.xs,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  flashbackContent: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    fontStyle: "italic",
    lineHeight: 22,
  },
  flashbackDate: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    marginTop: 12,
  },

  // Journal link
  journalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  journalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  journalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  journalTitle: {
    fontFamily: "Inter_600SemiBold",
    ...typography.base,
    marginBottom: 2,
  },
  journalSubtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
  },

  // Bottom
  bottomSpacer: {
    height: 20,
  },
});
