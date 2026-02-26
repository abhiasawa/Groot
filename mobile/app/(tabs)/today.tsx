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
import { Settings } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useToday } from "../../lib/api/queries";
import { typography } from "../../constants/typography";
import { getMoodColor } from "../../constants/mood";
import { GradientBackground } from "../../components/ui/gradient-background";
import { GlassCard } from "../../components/ui/glass-card";
import { PressScale } from "../../components/ui/press-scale";
import { SectionHeader } from "../../components/ui/section-header";
import { MomentCard } from "../../components/ui/moment-card";
import { StreakBar } from "../../components/ui/streak-bar";
import { ObservationCard } from "../../components/ui/observation-card";
import { MoodFace } from "../../components/illustrations/mood-faces";

const MOOD_SCORE_MAP: Record<string, number> = {
  great: 5, happy: 5, excited: 5, excellent: 5, energetic: 5,
  good: 4, calm: 4, content: 4, peaceful: 4, grateful: 4, motivated: 4,
  okay: 3, fine: 3, neutral: 3, alright: 3, busy: 3,
  low: 2, tired: 2, stressed: 2, anxious: 2, overwhelmed: 2,
  bad: 1, sad: 1, angry: 1, terrible: 1, frustrated: 1,
};

export default function TodayScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, refetch } = useToday();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    refetch()
      .catch(() => {})
      .finally(() => setIsPullRefreshing(false));
  }, [refetch]);

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

  const moodName = data?.recentMood;
  const moodScore = moodName ? (MOOD_SCORE_MAP[moodName.toLowerCase()] ?? 0) : 0;

  return (
    <SafeAreaView style={s.safe}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={s.scroll}
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
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.greeting, { color: colors.foreground }]} numberOfLines={1}>
                {data?.greeting ?? "Good evening"}
              </Text>
              {moodScore > 0 && moodName && (
                <View style={s.moodRow}>
                  <MoodFace score={moodScore} size={18} color={getMoodColor(moodScore, colors)} />
                  <Text style={[s.moodLabel, { color: getMoodColor(moodScore, colors) }]}>
                    Feeling {moodName}
                  </Text>
                </View>
              )}
            </View>
            <PressScale onPress={() => router.push("/(tabs)/settings")} haptic={false}>
              <View style={[s.settingsBtn, { backgroundColor: colors.secondary }]}>
                <Settings size={20} color={colors.mutedForeground} strokeWidth={1.7} />
              </View>
            </PressScale>
          </View>

          {/* Today's Moment — Storyworthy prompt card */}
          <View style={s.section}>
            <MomentCard prompt={data?.todayPrompt ?? null} />
          </View>

          {/* Active Streaks */}
          {data?.habits && data.habits.length > 0 && (
            <View style={s.section}>
              <SectionHeader title="Active Streaks" />
              <GlassCard padding={16}>
                {data.habits.map((habit) => (
                  <StreakBar
                    key={habit.name}
                    name={habit.name}
                    streak={habit.currentStreak}
                    checkedInToday={habit.checkedInToday}
                    unit={habit.targetUnit}
                  />
                ))}
              </GlassCard>
            </View>
          )}

          {/* Groot's Observation */}
          {data?.observation && (
            <View style={s.section}>
              <ObservationCard observation={data.observation} />
            </View>
          )}

          {/* Yesterday */}
          {data?.yesterdayMoment && (
            <View style={s.section}>
              <SectionHeader title="Yesterday" />
              <GlassCard padding={16}>
                <Text style={[s.yesterdayText, { color: colors.foreground }]}>
                  {data.yesterdayMoment}
                </Text>
                {data.yesterdayMood && (
                  <Text style={[s.yesterdayMood, { color: colors.mutedForeground }]}>
                    Mood: {data.yesterdayMood}
                  </Text>
                )}
              </GlassCard>
            </View>
          )}

          <View style={s.bottomGap} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
    alignItems: "flex-start",
    marginBottom: 4,
  },
  greeting: {
    fontFamily: "Sora_700Bold",
    ...typography.title,
    letterSpacing: -0.3,
  },
  moodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  moodLabel: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    textTransform: "capitalize",
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: 20,
  },
  yesterdayText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  yesterdayMood: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    marginTop: 8,
    textTransform: "capitalize",
  },
  bottomGap: {
    height: 90,
  },
});
