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
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  Brain,
  CheckSquare,
  ChevronRight,
  Flame,
  Sparkles,
  BookOpen,
  Users,
  HeartPulse,
  Compass,
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

function greetingByHour() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDateLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isRefetching, refetch } = useHome();
  const router = useRouter();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  const home = data as HomeData | undefined;
  if (!home) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          <View style={styles.center}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Welcome to your Garden
            </Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>
              Send your first message to Groot and your dashboard will begin to grow.
            </Text>
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  const moodColor = home.recentMood
    ? getMoodColorFromName(home.recentMood, colors)
    : undefined;

  const statCards = [
    {
      label: "Memories",
      value: home.memoriesCount ?? 0,
      icon: <Brain size={20} color={colors.chart1} strokeWidth={1.7} />,
      route: "/(tabs)/journal",
    },
    {
      label: "Tasks",
      value: home.pendingTasks ?? 0,
      icon: <CheckSquare size={20} color={colors.chart2} strokeWidth={1.7} />,
      route: "/(tabs)/tasks",
    },
    {
      label: "Habits",
      value: home.habitsCount ?? 0,
      icon: <Flame size={20} color={colors.chart3} strokeWidth={1.7} />,
      route: "/habits",
    },
    {
      label: "People",
      value: home.peopleCount ?? 0,
      icon: <Users size={20} color={colors.chart5} strokeWidth={1.7} />,
      route: "/people",
    },
  ] as const;

  const quickActions = [
    { label: "Journal", icon: BookOpen, route: "/(tabs)/journal" },
    { label: "Tasks", icon: CheckSquare, route: "/(tabs)/tasks" },
    { label: "Mood", icon: HeartPulse, route: "/(tabs)/mood" },
    { label: "Explore", icon: Compass, route: "/(tabs)/more" },
  ] as const;

  return (
    <SafeAreaView style={styles.flex}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <Animated.View entering={FadeIn.duration(520)} style={styles.headerRow}>
            <View style={styles.headerMeta}>
              <PillBadge
                label={formatDateLabel()}
                color={colors.glassSurface}
                textColor={colors.mutedForeground}
              />
              <PillBadge
                label="Daily Edit"
                color={colors.secondary}
                textColor={colors.secondaryForeground}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(500)}>
            <GlassCard padding={22} accentColor={colors.primary}>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
                {greetingByHour()}
              </Text>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {home.displayName || "there"}
              </Text>
              {home.recentMood && moodColor ? (
                <View style={styles.moodRow}>
                  <View style={[styles.moodDot, { backgroundColor: moodColor }]} />
                  <Text style={[styles.moodText, { color: colors.foreground }]}>
                    Feeling {home.recentMood.toLowerCase()} lately
                  </Text>
                </View>
              ) : null}
            </GlassCard>
          </Animated.View>

          <View style={styles.section}>
            <SectionHeader title="Quick Actions" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storyRail}
            >
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <PressScale
                    key={action.label}
                    onPress={() => router.push(action.route as never)}
                    style={styles.storyItem}
                  >
                    <Animated.View entering={FadeInDown.delay(100 + index * 50).duration(340)}>
                      <LinearGradient
                        colors={[colors.accent, colors.primary, colors.chart4]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.storyRing}
                      >
                        <View style={[styles.storyInner, { backgroundColor: colors.glassSurface }]}>
                          <Icon size={18} color={colors.foreground} strokeWidth={1.8} />
                        </View>
                      </LinearGradient>
                      <Text style={[styles.storyLabel, { color: colors.foreground }]}>
                        {action.label}
                      </Text>
                    </Animated.View>
                  </PressScale>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Today Focus" />
            <GlassCard padding={18} delay={90}>
              <FocusRow
                label={`${home.pendingTasks} pending tasks`}
                icon={<CheckSquare size={16} color={colors.chart2} strokeWidth={1.8} />}
                onPress={() => router.push("/(tabs)/tasks" as never)}
              />
              <FocusRow
                label={`${home.upcomingReminders} upcoming reminders`}
                icon={<Bell size={16} color={colors.chart3} strokeWidth={1.8} />}
                onPress={() => router.push("/(tabs)/tasks" as never)}
              />
              <FocusRow
                label={`${home.habitsCount} active habits`}
                icon={<Flame size={16} color={colors.chart4} strokeWidth={1.8} />}
                onPress={() => router.push("/habits" as never)}
                isLast
              />
            </GlassCard>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Dashboard" />
            <View style={styles.statsGrid}>
              {statCards.map((stat, index) => (
                <PressScale
                  key={stat.label}
                  style={styles.statHalf}
                  onPress={() => router.push(stat.route as never)}
                >
                  <GlassCard padding={16} delay={120 + index * 40}>
                    <AnimatedStat value={stat.value} label={stat.label} icon={stat.icon} />
                  </GlassCard>
                </PressScale>
              ))}
            </View>
          </View>

          {home.flashback ? (
            <View style={styles.section}>
              <SectionHeader title="Flashback" />
              <GlassCard padding={18} accentColor={colors.accent} delay={180}>
                <View style={styles.flashbackHead}>
                  <Sparkles size={15} color={colors.accent} strokeWidth={1.8} />
                  <Text style={[styles.flashbackLabel, { color: colors.accent }]}>
                    From your archive
                  </Text>
                </View>
                <Text
                  style={[styles.flashbackContent, { color: colors.foreground }]}
                  numberOfLines={5}
                >
                  {home.flashback.content}
                </Text>
              </GlassCard>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              title="Recent Journal"
              action="Open"
              onAction={() => router.push("/(tabs)/journal")}
            />
            <GlassCard padding={16} delay={220}>
              {home.recentMemories?.slice(0, 3).map((memory, index) => (
                <View
                  key={memory.id}
                  style={[
                    styles.memoryRow,
                    index < Math.min((home.recentMemories?.length ?? 0), 3) - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Text style={[styles.memoryText, { color: colors.foreground }]} numberOfLines={2}>
                    {memory.content}
                  </Text>
                </View>
              ))}
              {!home.recentMemories?.length ? (
                <Text style={[styles.memoryText, { color: colors.mutedForeground }]}>
                  Your recent entries will appear here once you journal more.
                </Text>
              ) : null}
            </GlassCard>
          </View>

          <View style={styles.bottomGap} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

function FocusRow({
  label,
  icon,
  onPress,
  isLast,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  isLast?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <PressScale onPress={onPress} haptic={false}>
      <View
        style={[
          styles.focusRow,
          !isLast && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.glassBorder,
          },
        ]}
      >
        <View style={styles.focusLeft}>
          {icon}
          <Text style={[styles.focusLabel, { color: colors.foreground }]}>{label}</Text>
        </View>
        <ChevronRight size={16} color={colors.mutedForeground} strokeWidth={1.8} />
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 48,
  },
  headerRow: {
    marginBottom: 12,
  },
  headerMeta: {
    flexDirection: "row",
    gap: 8,
  },
  greeting: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    marginBottom: 4,
  },
  name: {
    fontFamily: "Sora_700Bold",
    ...typography.hero,
    marginBottom: 10,
  },
  moodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moodDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  moodText: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
  },
  section: {
    marginTop: 24,
  },
  storyRail: {
    gap: 14,
    paddingHorizontal: 2,
  },
  storyItem: {
    alignItems: "center",
  },
  storyRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  storyInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.75)",
  },
  storyLabel: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
  },
  focusRow: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  focusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  focusLabel: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statHalf: {
    width: "48.4%",
  },
  flashbackHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  flashbackLabel: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
  },
  flashbackContent: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 23,
  },
  memoryRow: {
    paddingVertical: 10,
  },
  memoryText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  emptyTitle: {
    fontFamily: "Sora_700Bold",
    ...typography["2xl"],
    textAlign: "center",
    marginBottom: 8,
  },
  emptyCopy: {
    fontFamily: "Manrope_400Regular",
    ...typography.base,
    lineHeight: 24,
    textAlign: "center",
  },
  bottomGap: {
    height: 86,
  },
});
