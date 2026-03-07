import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRight,
  AudioLines,
  Camera,
  Leaf,
  NotebookPen,
  Settings,
  Sparkles,
} from "lucide-react-native";

import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { PressScale } from "../../components/ui/press-scale";
import { useHome, useToday } from "../../lib/api/queries";
import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";

const MOOD_SCORE_MAP: Record<string, number> = {
  great: 5, happy: 5, excited: 5, excellent: 5, energetic: 5,
  good: 4, calm: 4, content: 4, peaceful: 4, grateful: 4, motivated: 4,
  okay: 3, fine: 3, neutral: 3, alright: 3, busy: 3,
  low: 2, tired: 2, stressed: 2, anxious: 2, overwhelmed: 2,
  bad: 1, sad: 1, angry: 1, terrible: 1, frustrated: 1,
};

function moodCopy(mood: string | null | undefined) {
  const normalized = mood?.toLowerCase();
  if (!normalized) {
    return {
      label: "Awaiting today's mood",
      note: "Capture a whisper so Groot can tune the garden to how you feel.",
      colorKey: "moodNone" as const,
    };
  }

  const score = MOOD_SCORE_MAP[normalized] ?? 0;
  if (score >= 5) {
    return {
      label: "Forest is thriving",
      note: "High energy detected. This is a strong window for planning and recording ideas.",
      colorKey: "moodGreat" as const,
    };
  }
  if (score === 4) {
    return {
      label: "Steady growth today",
      note: "You sound grounded. Groot can help convert that steadiness into momentum.",
      colorKey: "moodGood" as const,
    };
  }
  if (score === 3) {
    return {
      label: "Balanced, but open",
      note: "A good day for a short check-in, a task review, or a small reflective note.",
      colorKey: "moodOkay" as const,
    };
  }
  if (score === 2) {
    return {
      label: "Needs a softer pace",
      note: "Keep things lighter. Focus on one anchor task and one honest reflection.",
      colorKey: "moodLow" as const,
    };
  }
  return {
    label: "Deep soil mode",
    note: "The app should feel quieter today. Start with a voice note and let Groot respond gently.",
    colorKey: "moodBad" as const,
  };
}

function formatRelativeTime(date: string) {
  const then = new Date(date).getTime();
  const diffMins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

export default function TodayScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: todayData, isLoading: isTodayLoading, refetch: refetchToday } = useToday();
  const { data: homeData, isLoading: isHomeLoading, refetch: refetchHome } = useHome();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    Promise.all([refetchToday(), refetchHome()])
      .catch(() => {})
      .finally(() => setIsRefreshing(false));
  }, [refetchHome, refetchToday]);

  const insightTone = useMemo(
    () => moodCopy(todayData?.recentMood),
    [todayData?.recentMood],
  );

  const seedPrompts = [];

  if (todayData?.todayPrompt) {
    seedPrompts.push({
      icon: Sparkles,
      title: "Daily reflection",
      text: todayData.todayPrompt,
    });
  }

  if (homeData?.pendingTasks) {
    seedPrompts.push({
      icon: Leaf,
      title: "Clear the canopy",
      text: `${homeData.pendingTasks} task${homeData.pendingTasks === 1 ? "" : "s"} still need attention.`,
    });
  }

  if (homeData?.flashback?.content) {
    seedPrompts.push({
      icon: NotebookPen,
      title: "Echo from the archive",
      text: homeData.flashback.content,
    });
  }

  if (isTodayLoading || isHomeLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <GradientBackground>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>Groot Forest</Text>
              <Text style={[styles.greeting, { color: colors.foreground }]}>
                {todayData?.greeting ?? "Welcome back"}
              </Text>
              <Text style={[styles.subtle, { color: colors.mutedForeground }]}>
                {homeData?.displayName
                  ? `${homeData.displayName}, your ecosystem is ready for another layer of memory.`
                  : "Your ecosystem is ready for another layer of memory."}
              </Text>
            </View>
            <PressScale onPress={() => router.push("/(tabs)/settings")} haptic={false}>
              <View style={[styles.settingsButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Settings size={18} color={colors.foreground} strokeWidth={1.8} />
              </View>
            </PressScale>
          </View>

          <GlassCard style={styles.heroCard} accentColor={colors.primary} padding={22}>
            <View style={styles.heroGlowWrap}>
              <View style={[styles.heroGlow, { backgroundColor: colors.auraPrimary }]} />
            </View>
            <Text style={[styles.heroLabel, { color: colors.accent }]}>Active ecosystem</Text>
            <View style={styles.heroRow}>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, { color: colors.cardForeground }]}>
                  {insightTone.label}
                </Text>
                <Text style={[styles.heroText, { color: colors.secondaryForeground }]}>
                  {insightTone.note}
                </Text>
              </View>
              <View style={[styles.orb, { backgroundColor: colors.primary }]}>
                <Leaf size={28} color={colors.primaryForeground} strokeWidth={2} />
              </View>
            </View>
            <View style={styles.heroStats}>
              <MiniMetric label="Memories" value={String(homeData?.memoriesCount ?? 0)} />
              <MiniMetric label="Tasks" value={String(homeData?.pendingTasks ?? 0)} />
              <MiniMetric label="People" value={String(homeData?.peopleCount ?? 0)} />
            </View>
          </GlassCard>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Seed prompts</Text>
            <Text style={[styles.sectionMeta, { color: colors.primary }]}>For today</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptRow}
          >
            {seedPrompts.map((prompt) => {
              const Icon = prompt.icon;
              return (
                <GlassCard key={prompt.title} style={styles.promptCard} padding={18}>
                  <View style={[styles.promptIcon, { backgroundColor: colors.secondary }]}>
                    <Icon size={18} color={colors.primary} strokeWidth={2} />
                  </View>
                  <Text style={[styles.promptTitle, { color: colors.foreground }]}>{prompt.title}</Text>
                  <Text style={[styles.promptText, { color: colors.mutedForeground }]} numberOfLines={4}>
                    {prompt.text}
                  </Text>
                </GlassCard>
              );
            })}
          </ScrollView>

          <View style={styles.recapGrid}>
            <GlassCard style={styles.statCard} padding={18}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {todayData?.habits?.filter((habit) => habit.checkedInToday).length ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Habits checked today</Text>
            </GlassCard>
            <GlassCard style={styles.statCard} padding={18}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {homeData?.upcomingReminders ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Reminders approaching</Text>
            </GlassCard>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent activity</Text>
            <PressScale onPress={() => router.push("/(tabs)/journal")} haptic={false}>
              <View style={styles.linkRow}>
                <Text style={[styles.sectionMeta, { color: colors.primary }]}>Open vault</Text>
                <ArrowRight size={14} color={colors.primary} />
              </View>
            </PressScale>
          </View>

          <View style={styles.activityList}>
            {(homeData?.recentMemories ?? []).slice(0, 4).map((memory) => {
              const Icon =
                memory.message_type === "audio"
                  ? AudioLines
                  : memory.message_type === "image"
                    ? Camera
                    : NotebookPen;

              return (
                <PressScale
                  key={memory.id}
                  onPress={() => router.push("/(tabs)/journal")}
                  scale={0.985}
                >
                  <GlassCard style={styles.activityCard} padding={16}>
                    <View style={styles.activityRow}>
                      <View style={[styles.activityIcon, { backgroundColor: colors.secondary }]}>
                        <Icon size={18} color={colors.primary} strokeWidth={1.9} />
                      </View>
                      <View style={styles.activityCopy}>
                        <Text style={[styles.activityTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {memory.message_type === "audio"
                            ? "Voice whisper"
                            : memory.message_type === "image"
                              ? "Visual capture"
                              : "Written note"}
                        </Text>
                        <Text style={[styles.activityText, { color: colors.mutedForeground }]} numberOfLines={2}>
                          {memory.content}
                        </Text>
                      </View>
                      <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
                        {formatRelativeTime(memory.created_at)}
                      </Text>
                    </View>
                  </GlassCard>
                </PressScale>
              );
            })}
          </View>

          {todayData?.observation ? (
            <GlassCard style={styles.echoCard} padding={20}>
              <Text style={[styles.echoEyebrow, { color: colors.primary }]}>Groot observation</Text>
              <Text style={[styles.echoText, { color: colors.foreground }]}>
                {todayData.observation}
              </Text>
            </GlassCard>
          ) : null}

          <View style={styles.bottomGap} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.metric, { borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  greeting: {
    fontFamily: "Sora_700Bold",
    ...typography["3xl"],
    marginBottom: 8,
  },
  subtle: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 22,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    marginBottom: 24,
    overflow: "hidden",
  },
  heroGlowWrap: {
    position: "absolute",
    top: -42,
    right: -22,
  },
  heroGlow: {
    width: 140,
    height: 140,
    borderRadius: 999,
  },
  heroLabel: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: "Sora_700Bold",
    ...typography["2xl"],
    marginBottom: 8,
  },
  heroText: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 22,
  },
  orb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  heroStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  metric: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metricValue: {
    fontFamily: "Sora_700Bold",
    ...typography.lg,
  },
  metricLabel: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.xl,
  },
  sectionMeta: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  promptRow: {
    gap: 12,
    paddingBottom: 8,
  },
  promptCard: {
    width: 252,
  },
  promptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  promptTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
    marginBottom: 8,
  },
  promptText: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 22,
  },
  recapGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    marginBottom: 26,
  },
  statCard: {
    flex: 1,
  },
  statValue: {
    fontFamily: "Sora_700Bold",
    ...typography["2xl"],
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 20,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activityList: {
    gap: 10,
  },
  activityCard: {
    borderRadius: 22,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityCopy: {
    flex: 1,
    paddingRight: 10,
  },
  activityTitle: {
    fontFamily: "Manrope_700Bold",
    ...typography.sm,
    marginBottom: 4,
  },
  activityText: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    lineHeight: 18,
  },
  activityTime: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
  },
  echoCard: {
    marginTop: 24,
  },
  echoEyebrow: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  echoText: {
    fontFamily: "Manrope_500Medium",
    ...typography.base,
    lineHeight: 25,
  },
  bottomGap: {
    height: 110,
  },
});
