import React, { useCallback, useState } from "react";
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
import {
  Settings,
  Square,
  CheckSquare,
  ListChecks,
  Brain,
  BookOpen,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useHome, useTasks } from "../../lib/api/queries";
import { useToggleTask } from "../../lib/api/mutations";
import { typography } from "../../constants/typography";
import { getMoodColor, MOOD_FACE_LABELS } from "../../constants/mood";
import { GradientBackground } from "../../components/ui/gradient-background";
import { GlassCard } from "../../components/ui/glass-card";
import { PressScale } from "../../components/ui/press-scale";
import { SectionHeader } from "../../components/ui/section-header";

import { GrootSprout, getGreeting } from "../../components/illustrations/groot-sprout";
import { MoodFace } from "../../components/illustrations/mood-faces";
import type { Task } from "../../../shared/types/api";

const MOOD_SCORE_MAP: Record<string, number> = {
  great: 5, happy: 5, excited: 5, excellent: 5,
  good: 4, calm: 4, content: 4, peaceful: 4,
  okay: 3, fine: 3, neutral: 3, alright: 3,
  low: 2, tired: 2, stressed: 2, anxious: 2,
  bad: 1, sad: 1, angry: 1, terrible: 1,
};

export default function TodayScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, refetch } = useHome();
  const { data: tasksData, refetch: refetchTasks } = useTasks();
  const toggleTask = useToggleTask();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    Promise.all([refetch(), refetchTasks()])
      .catch(() => {})
      .finally(() => setIsPullRefreshing(false));
  }, [refetch, refetchTasks]);

  const pendingTasks = (tasksData?.tasks ?? [])
    .filter((t) => !t.is_completed)
    .slice(0, 3);

  const recentMemories = (data?.recentMemories ?? []).slice(0, 2);

  const handleToggle = useCallback(
    (task: Task) => {
      toggleTask.mutate({ taskId: task.id, is_completed: !task.is_completed });
    },
    [toggleTask],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <GradientBackground>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  const openTaskCount = (tasksData?.tasks ?? []).filter((t) => !t.is_completed).length;
  const recentMoodName = data?.recentMood;
  const moodScore = recentMoodName ? (MOOD_SCORE_MAP[recentMoodName.toLowerCase()] ?? 3) : 0;

  return (
      <SafeAreaView style={styles.safe}>
        <GradientBackground>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={[styles.appTitle, { color: colors.foreground }]}>
                The Garden
              </Text>
              <PressScale onPress={() => router.push("/(tabs)/settings")} haptic={false}>
                <View style={[styles.settingsBtn, { backgroundColor: colors.secondary }]}>
                  <Settings size={20} color={colors.mutedForeground} strokeWidth={1.7} />
                </View>
              </PressScale>
            </View>

            {/* Groot Mascot */}
            <View style={styles.mascotWrap}>
              <GrootSprout size={100} message={getGreeting(data?.displayName)} />
            </View>

            {/* Current Mood */}
            <PressScale onPress={() => router.push("/(tabs)/mood")} scale={0.98}>
              <GlassCard padding={20} style={styles.sectionGap}>
                {moodScore > 0 ? (
                  <>
                    <Text style={[styles.moodSubtitle, { color: colors.mutedForeground }]}>
                      Currently feeling
                    </Text>
                    <View style={styles.moodHero}>
                      <MoodFace score={moodScore} size={44} color={getMoodColor(moodScore, colors)} />
                      <Text style={[styles.moodHeroLabel, { color: getMoodColor(moodScore, colors) }]}>
                        {recentMoodName}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.moodTitle, { color: colors.foreground }]}>
                      How are you feeling?
                    </Text>
                    <View style={styles.moodRow}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <View key={score} style={styles.moodItem}>
                          <MoodFace score={score} size={34} color={getMoodColor(score, colors)} />
                          <Text style={[styles.moodLabel, { color: colors.mutedForeground }]}>
                            {MOOD_FACE_LABELS[score]}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </GlassCard>
            </PressScale>

            {/* Quick Stats */}
            <View style={[styles.statsRow, styles.sectionGap]}>
              <PressScale onPress={() => router.push("/(tabs)/journal")} style={styles.statCard} scale={0.97}>
                <GlassCard padding={16}>
                  <View style={[styles.statIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                    <Brain size={18} color={colors.primary} strokeWidth={1.8} />
                  </View>
                  <Text style={[styles.statNumber, { color: colors.foreground }]}>
                    {data?.memoriesCount ?? 0}
                  </Text>
                  <Text style={[styles.statDesc, { color: colors.mutedForeground }]}>
                    Entries
                  </Text>
                </GlassCard>
              </PressScale>
              <PressScale onPress={() => router.push("/(tabs)/tasks")} style={styles.statCard} scale={0.97}>
                <GlassCard padding={16}>
                  <View style={[styles.statIconWrap, { backgroundColor: `${colors.accent}18` }]}>
                    <ListChecks size={18} color={colors.accent} strokeWidth={1.8} />
                  </View>
                  <Text style={[styles.statNumber, { color: colors.foreground }]}>
                    {openTaskCount}
                  </Text>
                  <Text style={[styles.statDesc, { color: colors.mutedForeground }]}>
                    Open Tasks
                  </Text>
                </GlassCard>
              </PressScale>
            </View>

            {/* Today's Tasks */}
            <View style={styles.sectionGap}>
              <SectionHeader
                title="Today's Tasks"
                action="See all"
                onAction={() => router.push("/(tabs)/tasks")}
              />
              {pendingTasks.length === 0 ? (
                <GlassCard padding={16}>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No pending tasks. Ask Groot to add some!
                  </Text>
                </GlassCard>
              ) : (
                pendingTasks.map((task) => (
                  <PressScale
                    key={task.id}
                    onPress={() => handleToggle(task)}
                    style={styles.taskCardWrap}
                  >
                    <GlassCard padding={14}>
                      <View style={styles.taskRow}>
                        {task.is_completed ? (
                          <CheckSquare size={20} color={colors.moodGood} strokeWidth={1.6} />
                        ) : (
                          <Square size={20} color={colors.mutedForeground} strokeWidth={1.6} />
                        )}
                        <Text
                          style={[styles.taskText, { color: colors.foreground }]}
                          numberOfLines={1}
                        >
                          {task.content}
                        </Text>
                      </View>
                    </GlassCard>
                  </PressScale>
                ))
              )}
            </View>

            {/* Recent Journal */}
            <View style={styles.sectionGap}>
              <SectionHeader
                title="Recent Journal"
                action="View all"
                onAction={() => router.push("/(tabs)/journal")}
              />
              {recentMemories.length === 0 ? (
                <GlassCard padding={16}>
                  <View style={styles.emptyJournal}>
                    <BookOpen size={28} color={colors.mutedForeground} strokeWidth={1.4} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      No journal entries yet. Start chatting with Groot!
                    </Text>
                  </View>
                </GlassCard>
              ) : (
                recentMemories.map((memory) => (
                  <PressScale
                    key={memory.id}
                    onPress={() => router.push("/(tabs)/journal")}
                    style={styles.journalCardWrap}
                  >
                    <GlassCard padding={14}>
                      <Text
                        style={[styles.journalTime, { color: colors.mutedForeground }]}
                      >
                        {new Date(memory.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                      <Text
                        style={[styles.journalText, { color: colors.foreground }]}
                        numberOfLines={2}
                      >
                        {memory.content || "Voice note"}
                      </Text>
                    </GlassCard>
                  </PressScale>
                ))
              )}
            </View>

            <View style={styles.bottomGap} />
          </ScrollView>
        </GradientBackground>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  appTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.title,
    letterSpacing: -0.3,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotWrap: {
    alignItems: "center",
    marginVertical: 8,
  },
  sectionGap: {
    marginTop: 20,
  },
  // ── Mood ──
  moodTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
    marginBottom: 16,
  },
  moodSubtitle: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  moodHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  moodHeroLabel: {
    fontFamily: "Sora_700Bold",
    ...typography.xl,
    textTransform: "capitalize",
  },
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 4,
  },
  moodItem: {
    alignItems: "center",
    gap: 6,
    minWidth: 48,
  },
  moodLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
  },
  // ── Quick Stats ──
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statNumber: {
    fontFamily: "Sora_700Bold",
    ...typography.xl,
  },
  statDesc: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
    marginTop: 2,
  },
  // ── Tasks ──
  taskCardWrap: {
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskText: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
  },
  emptyText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyJournal: {
    alignItems: "center",
    gap: 10,
  },
  journalCardWrap: {
    marginBottom: 8,
  },
  journalTime: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    marginBottom: 6,
  },
  journalText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  bottomGap: {
    height: 90,
  },
});
