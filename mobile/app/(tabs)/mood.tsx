import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Plus,
  X,
  Flame,
  Trophy,
  Check,
  Pencil,
  Trash2,
  Footprints,
} from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../../lib/theme/provider";
import { useMood, useHabits } from "../../lib/api/queries";
import {
  useRecordMood,
  useHabitCheckin,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
} from "../../lib/api/mutations";
import {
  getMoodColor,
  getMoodColorFromName,
  MOOD_LABELS,
  MOOD_FACE_LABELS,
} from "../../constants/mood";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { SectionHeader } from "../../components/ui/section-header";
import { PressScale } from "../../components/ui/press-scale";
import { MoodFace } from "../../components/illustrations/mood-faces";
import { TabSwipeView } from "../../components/ui/tab-swipe-view";
import { StepsCard } from "../../components/ui/steps-card";
import type { DailyMood, WeeklyTrend, Habit } from "../../../shared/types/api";

// ── Constants ────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = 20;
const DOT_GAP = 3;
const COLS = 14; // dots per row — larger for readability
const DOT_SIZE = Math.floor(
  (SCREEN_WIDTH - GRID_PADDING * 2 - DOT_GAP * (COLS - 1)) / COLS,
);

// ── Helpers ──────────────────────────────────

function buildYearGrid(
  year: number,
  dailyMoods: DailyMood[],
): { date: string; score: number | null }[] {
  const moodMap = new Map<string, number>();
  for (const dm of dailyMoods) {
    moodMap.set(dm.date, dm.score);
  }

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const grid: { date: string; score: number | null }[] = [];

  const current = new Date(start);
  const today = new Date();
  while (current <= end && current <= today) {
    const dateStr = current.toISOString().slice(0, 10);
    grid.push({
      date: dateStr,
      score: moodMap.get(dateStr) ?? null,
    });
    current.setDate(current.getDate() + 1);
  }

  return grid;
}

function getMoodDistribution(
  dailyMoods: DailyMood[],
): { score: number; label: string; count: number; pct: number }[] {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const dm of dailyMoods) {
    if (dm.score >= 1 && dm.score <= 5) {
      counts[dm.score] = (counts[dm.score] ?? 0) + 1;
    }
  }

  const total = dailyMoods.length || 1;
  return [5, 4, 3, 2, 1].map((score) => ({
    score,
    label: MOOD_LABELS[score] ?? "Unknown",
    count: counts[score] ?? 0,
    pct: Math.round(((counts[score] ?? 0) / total) * 100),
  }));
}

function getTrendDescription(weeklyTrend: WeeklyTrend[]): string {
  if (weeklyTrend.length < 2) return "Not enough data for trend analysis yet.";

  const recent = weeklyTrend.slice(-4);
  const firstEntry = recent[0];
  const lastEntry = recent[recent.length - 1];
  if (!firstEntry || !lastEntry) return "Not enough data for trend analysis yet.";
  const first = firstEntry.avgScore;
  const last = lastEntry.avgScore;
  const diff = last - first;

  if (Math.abs(diff) < 0.3) return "Your mood has been steady over recent weeks.";
  if (diff > 0.5) return "Your mood has been trending upward recently. Keep it up!";
  if (diff > 0) return "Your mood is slightly improving week over week.";
  if (diff < -0.5) return "Your mood has dipped recently. Remember to take care of yourself.";
  return "Your mood has been slightly lower this week.";
}

// ── Component ────────────────────────────────

// Score → mood name used for the check-in
const CHECKIN_MOODS: Record<number, string> = {
  1: "bad",
  2: "low",
  3: "okay",
  4: "good",
  5: "great",
};

// ── Habit Ring Component ──────────────────────

function HabitRing({ progress, size, color, strokeWidth = 3 }: {
  progress: number;
  size: number;
  color: string;
  strokeWidth?: number;
}) {
  const { colors } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={colors.secondary}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

// ── Habit Card Component ─────────────────────

function HabitCard({
  habit,
  onCheckin,
  onPress,
  colors,
}: {
  habit: Habit;
  onCheckin: () => void;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const checkedToday = habit.recentCheckins?.includes(todayStr) ?? false;
  const weekCheckins = (habit.recentCheckins ?? []).filter((d) => {
    const diff = (new Date(todayStr).getTime() - new Date(d).getTime()) / 86400000;
    return diff >= 0 && diff < 7;
  }).length;
  const weekProgress = weekCheckins / 7;

  const isSteps = habit.name.toLowerCase().includes("step");
  const ringColor = checkedToday ? colors.accent : colors.primary;

  return (
    <PressScale onPress={onPress} style={habitCardStyles.card}>
      <GlassCard padding={14}>
        <View style={habitCardStyles.row}>
          <View style={habitCardStyles.ringWrap}>
            <HabitRing progress={weekProgress} size={44} color={ringColor} />
            <View style={habitCardStyles.ringCenter}>
              {checkedToday ? (
                <Check size={16} color={ringColor} strokeWidth={2.5} />
              ) : isSteps ? (
                <Footprints size={16} color={colors.mutedForeground} strokeWidth={1.6} />
              ) : (
                <Text style={[habitCardStyles.ringCount, { color: colors.foreground }]}>
                  {weekCheckins}
                </Text>
              )}
            </View>
          </View>
          <View style={habitCardStyles.info}>
            <Text style={[habitCardStyles.name, { color: colors.foreground }]} numberOfLines={1}>
              {habit.name}
            </Text>
            <View style={habitCardStyles.metaRow}>
              {habit.current_streak > 0 && (
                <View style={habitCardStyles.streak}>
                  <Flame size={12} color={colors.accent} strokeWidth={2} />
                  <Text style={[habitCardStyles.streakText, { color: colors.accent }]}>
                    {habit.current_streak}d
                  </Text>
                </View>
              )}
              {habit.target_value != null && habit.target_unit && (
                <Text style={[habitCardStyles.target, { color: colors.mutedForeground }]}>
                  {habit.target_value} {habit.target_unit}
                </Text>
              )}
              {!habit.target_value && habit.frequency && (
                <Text style={[habitCardStyles.target, { color: colors.mutedForeground }]}>
                  {habit.frequency}
                </Text>
              )}
            </View>
          </View>
          {!checkedToday && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); onCheckin(); }}
              hitSlop={10}
              style={[habitCardStyles.checkinBtn, { backgroundColor: `${colors.primary}18` }]}
            >
              <Check size={18} color={colors.primary} strokeWidth={2.2} />
            </Pressable>
          )}
        </View>
      </GlassCard>
    </PressScale>
  );
}

const habitCardStyles = StyleSheet.create({
  card: { marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  ringWrap: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  ringCenter: { position: "absolute", justifyContent: "center", alignItems: "center" },
  ringCount: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  info: { flex: 1 },
  name: { fontFamily: "Sora_600SemiBold", ...typography.sm },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  streak: { flexDirection: "row", alignItems: "center", gap: 2 },
  streakText: { fontFamily: "Manrope_600SemiBold", fontSize: 11 },
  target: { fontFamily: "Manrope_400Regular", fontSize: 11 },
  checkinBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});

// ── Habit Edit/Detail Modal ──────────────────

function HabitModal({
  visible,
  habit,
  onClose,
  onSave,
  onDelete,
  colors,
  isNew,
}: {
  visible: boolean;
  habit: Partial<Habit> | null;
  onClose: () => void;
  onSave: (data: { name: string; target_value?: number; target_unit?: string; frequency?: string; category?: string }) => void;
  onDelete?: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
  isNew: boolean;
}) {
  const [name, setName] = useState(habit?.name ?? "");
  const [targetValue, setTargetValue] = useState(
    habit?.target_value != null ? String(habit.target_value) : "",
  );
  const [targetUnit, setTargetUnit] = useState(habit?.target_unit ?? "");
  const [frequency, setFrequency] = useState(habit?.frequency ?? "daily");

  React.useEffect(() => {
    if (visible) {
      setName(habit?.name ?? "");
      setTargetValue(habit?.target_value != null ? String(habit.target_value) : "");
      setTargetUnit(habit?.target_unit ?? "");
      setFrequency(habit?.frequency ?? "daily");
    }
  }, [visible, habit]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={[modalStyles.content, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: colors.foreground }]}>
              {isNew ? "New Habit" : "Edit Habit"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={modalStyles.field}>
            <Text style={[modalStyles.label, { color: colors.mutedForeground }]}>Name</Text>
            <TextInput
              style={[modalStyles.input, { color: colors.foreground, borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Gym, Read, Meditate"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={modalStyles.row}>
            <View style={[modalStyles.field, { flex: 1 }]}>
              <Text style={[modalStyles.label, { color: colors.mutedForeground }]}>Target</Text>
              <TextInput
                style={[modalStyles.input, { color: colors.foreground, borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}
                value={targetValue}
                onChangeText={setTargetValue}
                placeholder="e.g. 10000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>
            <View style={[modalStyles.field, { flex: 1 }]}>
              <Text style={[modalStyles.label, { color: colors.mutedForeground }]}>Unit</Text>
              <TextInput
                style={[modalStyles.input, { color: colors.foreground, borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}
                value={targetUnit}
                onChangeText={setTargetUnit}
                placeholder="e.g. steps, kg, min"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <View style={modalStyles.field}>
            <Text style={[modalStyles.label, { color: colors.mutedForeground }]}>Frequency</Text>
            <View style={modalStyles.freqRow}>
              {["daily", "weekly"].map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFrequency(f)}
                  style={[
                    modalStyles.freqBtn,
                    {
                      backgroundColor: frequency === f ? colors.primary : colors.secondary,
                      borderColor: frequency === f ? colors.primary : colors.glassBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      modalStyles.freqText,
                      { color: frequency === f ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Streak stats for existing habits */}
          {!isNew && habit?.current_streak != null && (
            <View style={[modalStyles.statsRow, { borderTopColor: colors.glassBorder }]}>
              <View style={modalStyles.stat}>
                <Flame size={14} color={colors.accent} />
                <Text style={[modalStyles.statValue, { color: colors.foreground }]}>
                  {habit.current_streak}
                </Text>
                <Text style={[modalStyles.statLabel, { color: colors.mutedForeground }]}>
                  Current
                </Text>
              </View>
              <View style={modalStyles.stat}>
                <Trophy size={14} color={colors.chart3} />
                <Text style={[modalStyles.statValue, { color: colors.foreground }]}>
                  {habit.longest_streak}
                </Text>
                <Text style={[modalStyles.statLabel, { color: colors.mutedForeground }]}>
                  Best
                </Text>
              </View>
            </View>
          )}

          <Pressable
            onPress={() => {
              if (!name.trim()) return;
              onSave({
                name: name.trim(),
                target_value: targetValue ? Number(targetValue) : undefined,
                target_unit: targetUnit || undefined,
                frequency,
              });
            }}
            style={[modalStyles.saveBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[modalStyles.saveBtnText, { color: colors.primaryForeground }]}>
              {isNew ? "Create Habit" : "Save Changes"}
            </Text>
          </Pressable>

          {!isNew && onDelete && (
            <Pressable onPress={onDelete} style={modalStyles.deleteBtn}>
              <Trash2 size={16} color={colors.destructive} />
              <Text style={[modalStyles.deleteText, { color: colors.destructive }]}>
                Delete Habit
              </Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Sora_700Bold",
    ...typography.lg,
  },
  field: { marginBottom: 16 },
  label: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    marginBottom: 6,
  },
  input: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  row: { flexDirection: "row", gap: 12 },
  freqRow: { flexDirection: "row", gap: 10 },
  freqBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  freqText: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    marginTop: 8,
    marginBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: { alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Sora_700Bold", ...typography.lg },
  statLabel: { fontFamily: "Manrope_400Regular", fontSize: 10 },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontFamily: "Sora_600SemiBold",
    ...typography.sm,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
  },
  deleteText: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.sm,
  },
});

// ── Main Screen ──────────────────────────────

export default function PulseScreen() {
  const { colors } = useTheme();
  const currentYear = new Date().getFullYear();
  const [year] = useState(currentYear);
  const { data, isLoading, refetch } = useMood(year);
  const { data: habitsData, refetch: refetchHabits } = useHabits();
  const recordMood = useRecordMood();
  const habitCheckin = useHabitCheckin();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [justRecorded, setJustRecorded] = useState<string | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [showNewHabit, setShowNewHabit] = useState(false);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    setJustRecorded(null);
    Promise.all([refetch(), refetchHabits()]).finally(() => setIsPullRefreshing(false));
  }, [refetch, refetchHabits]);

  const handleCheckin = useCallback(
    (score: number) => {
      const moodName = CHECKIN_MOODS[score] ?? "okay";
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setJustRecorded(moodName);
      recordMood.mutate({ mood: moodName });
    },
    [recordMood],
  );

  // If user just recorded or server has a recent mood, show it
  const activeMood = justRecorded ?? data?.recentMood ?? null;

  const yearGrid = useMemo(
    () => buildYearGrid(year, data?.dailyMoods ?? []),
    [year, data?.dailyMoods],
  );

  const distribution = useMemo(
    () => getMoodDistribution(data?.dailyMoods ?? []),
    [data?.dailyMoods],
  );

  const trendText = useMemo(
    () => getTrendDescription(data?.weeklyTrend ?? []),
    [data?.weeklyTrend],
  );

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

  return (
    <TabSwipeView currentTab="mood">
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
          {/* Page header */}
          <View style={s.headerRow}>
            <Text style={s.pageTitle}>Pulse</Text>
          </View>

          {/* Mood check-in / current mood */}
          {activeMood ? (
            <GlassCard accentColor={getMoodColorFromName(activeMood, colors)} delay={0}>
              <Text style={s.heroLabel}>Currently feeling...</Text>
              <View style={s.heroRow}>
                <MoodFace
                  score={Object.entries(CHECKIN_MOODS).find(([, v]) => v === activeMood)?.[0]
                    ? Number(Object.entries(CHECKIN_MOODS).find(([, v]) => v === activeMood)![0])
                    : 3}
                  size={32}
                  color={getMoodColorFromName(activeMood, colors)}
                />
                <Text
                  style={[
                    s.heroMoodName,
                    { color: getMoodColorFromName(activeMood, colors) },
                  ]}
                >
                  {activeMood}
                </Text>
              </View>
              <PressScale
                onPress={() => setJustRecorded(null)}
                haptic={false}
                style={s.changeMoodBtn}
              >
                <Text style={[s.changeMoodText, { color: colors.mutedForeground }]}>
                  Change
                </Text>
              </PressScale>
            </GlassCard>
          ) : (
            <GlassCard delay={0} padding={20}>
              <Text style={s.checkinTitle}>How are you feeling?</Text>
              <View style={s.checkinRow}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <PressScale key={score} onPress={() => handleCheckin(score)} scale={0.9}>
                    <View style={s.checkinItem}>
                      <MoodFace score={score} size={36} color={getMoodColor(score, colors)} />
                      <Text style={[s.checkinLabel, { color: colors.mutedForeground }]}>
                        {MOOD_FACE_LABELS[score]}
                      </Text>
                    </View>
                  </PressScale>
                ))}
              </View>
            </GlassCard>
          )}

          {/* ── Steps ── */}
          <View style={s.sectionGap}>
            <StepsCard />
          </View>

          {/* ── Habits section ── */}
          {(habitsData?.habits?.length ?? 0) > 0 && (
            <View style={s.sectionGap}>
              <View style={s.habitsHeader}>
                <SectionHeader title="Habits" />
                <Pressable
                  onPress={() => setShowNewHabit(true)}
                  hitSlop={10}
                  style={[s.addHabitBtn, { backgroundColor: `${colors.primary}18` }]}
                >
                  <Plus size={16} color={colors.primary} strokeWidth={2.4} />
                </Pressable>
              </View>
              {habitsData!.habits.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={h}
                  colors={colors}
                  onCheckin={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    habitCheckin.mutate({ habitId: h.id });
                  }}
                  onPress={() => setSelectedHabit(h)}
                />
              ))}
            </View>
          )}

          {(habitsData?.habits?.length ?? 0) === 0 && (
            <GlassCard delay={50} style={s.sectionGap} padding={20}>
              <Text style={s.checkinTitle}>Track Your Habits</Text>
              <Text style={[s.emptySubtitle, { marginBottom: 14 }]}>
                Build streaks, track progress, and stay consistent.
              </Text>
              <PressScale onPress={() => setShowNewHabit(true)} scale={0.97}>
                <View style={[s.addFirstHabitBtn, { backgroundColor: colors.primary }]}>
                  <Plus size={18} color={colors.primaryForeground} strokeWidth={2.2} />
                  <Text style={[s.addFirstHabitText, { color: colors.primaryForeground }]}>
                    Add Your First Habit
                  </Text>
                </View>
              </PressScale>
            </GlassCard>
          )}

          {/* Year in Pixels */}
          <GlassCard delay={100} style={s.sectionGap}>
            <SectionHeader title={`${year} in Pixels`} />

            {yearGrid.length === 0 ? (
              <View style={s.emptyPixels}>
                <Text style={s.emptySubtitle}>
                  No mood data for {year} yet. Keep chatting with Groot to track
                  your moods.
                </Text>
              </View>
            ) : (
              <View style={s.pixelGrid}>
                {yearGrid.map((day) => (
                  <View
                    key={day.date}
                    style={[
                      s.pixel,
                      {
                        backgroundColor:
                          day.score !== null
                            ? getMoodColor(day.score, colors)
                            : colors.moodNone,
                        opacity: day.score !== null ? 1 : 0.35,
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Legend */}
            <View style={s.legend}>
              {[
                { score: 1, label: "Bad" },
                { score: 2, label: "Low" },
                { score: 3, label: "Okay" },
                { score: 4, label: "Good" },
                { score: 5, label: "Great" },
              ].map((item) => (
                <View key={item.score} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: getMoodColor(item.score, colors) }]} />
                  <Text style={s.legendLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          {/* Weekly Trend */}
          <GlassCard delay={200} style={s.sectionGap}>
            <SectionHeader title="Weekly Trend" />

            <Text style={s.trendText}>{trendText}</Text>

            {(data?.weeklyTrend?.length ?? 0) > 0 && (
              <View style={s.trendWeeks}>
                {(data?.weeklyTrend ?? []).slice(-6).map((week) => {
                  return (
                    <View key={week.weekStart} style={s.trendWeekItem}>
                      <MoodFace
                        score={Math.round(week.avgScore)}
                        size={18}
                        color={getMoodColor(Math.round(week.avgScore), colors)}
                      />
                      <Text style={s.trendWeekScore}>
                        {week.avgScore.toFixed(1)}
                      </Text>
                      <Text style={s.trendWeekLabel}>
                        {new Date(week.weekStart).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </GlassCard>

          {/* Distribution */}
          <GlassCard delay={300} style={s.sectionGap}>
            <SectionHeader title="Distribution" />

            <View style={s.distributionList}>
              {distribution.map((item) => (
                <View key={item.score} style={s.distRow}>
                  <View style={s.distLabelRow}>
                    <MoodFace score={item.score} size={16} color={getMoodColor(item.score, colors)} />
                    <Text style={s.distLabel}>{item.label}</Text>
                  </View>
                  <View style={s.distBarContainer}>
                    <View
                      style={[
                        s.distBar,
                        {
                          width: `${Math.max(item.pct, 2)}%`,
                          backgroundColor: getMoodColor(item.score, colors),
                        },
                      ]}
                    />
                  </View>
                  <Text style={s.distPct}>{item.pct}%</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </ScrollView>
      </GradientBackground>
      </SafeAreaView>

      {/* Edit / Create habit modal */}
      <HabitModal
        visible={!!selectedHabit}
        habit={selectedHabit}
        isNew={false}
        colors={colors}
        onClose={() => setSelectedHabit(null)}
        onSave={(d) => {
          if (selectedHabit) {
            updateHabit.mutate({ habitId: selectedHabit.id, ...d });
          }
          setSelectedHabit(null);
        }}
        onDelete={() => {
          if (selectedHabit) {
            deleteHabit.mutate({ habitId: selectedHabit.id });
          }
          setSelectedHabit(null);
        }}
      />
      <HabitModal
        visible={showNewHabit}
        habit={null}
        isNew={true}
        colors={colors}
        onClose={() => setShowNewHabit(false)}
        onSave={(d) => {
          createHabit.mutate(d);
          setShowNewHabit(false);
        }}
      />
    </TabSwipeView>
  );
}

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
      padding: GRID_PADDING,
      paddingBottom: 40,
    },

    // ── Header ──
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    pageTitle: {
      fontFamily: "Sora_700Bold",
      ...typography.title,
      color: c.foreground,
      letterSpacing: -0.3,
    },
    // ── Section spacing ──
    sectionGap: {
      marginTop: 20,
    },

    // ── Habits ──
    habitsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    addHabitBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: "center",
      alignItems: "center",
    },
    addFirstHabitBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 14,
    },
    addFirstHabitText: {
      fontFamily: "Sora_600SemiBold",
      ...typography.sm,
    },

    // ── Hero (current mood) ──
    heroLabel: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      marginBottom: 8,
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    heroMoodName: {
      fontFamily: "Sora_700Bold",
      ...typography.xl,
      textTransform: "capitalize",
    },
    changeMoodBtn: {
      marginTop: 12,
    },
    changeMoodText: {
      fontFamily: "Manrope_500Medium",
      ...typography.xs,
    },

    // ── Check-in ──
    checkinTitle: {
      fontFamily: "Sora_600SemiBold",
      ...typography.base,
      color: c.foreground,
      marginBottom: 16,
    },
    checkinRow: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    checkinItem: {
      alignItems: "center",
      gap: 6,
      minWidth: 52,
    },
    checkinLabel: {
      fontFamily: "Manrope_500Medium",
      fontSize: 11,
    },

    // ── Year in Pixels ──
    pixelGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: DOT_GAP,
    },
    pixel: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 4,
    },
    emptyPixels: {
      alignItems: "center",
      paddingVertical: 24,
    },
    emptySubtitle: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
    legend: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      marginTop: 14,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 3,
    },
    legendLabel: {
      fontFamily: "Manrope_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },

    // ── Weekly Trend ──
    trendText: {
      fontFamily: "Manrope_400Regular",
      ...typography.sm,
      color: c.foreground,
      lineHeight: 22,
      marginBottom: 14,
    },
    trendWeeks: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    trendWeekItem: {
      alignItems: "center",
      flex: 1,
    },
    trendWeekScore: {
      fontFamily: "Sora_600SemiBold",
      ...typography.xs,
      color: c.foreground,
    },
    trendWeekLabel: {
      fontFamily: "Manrope_400Regular",
      fontSize: 10,
      lineHeight: 14,
      color: c.mutedForeground,
      marginTop: 2,
    },

    // ── Distribution ──
    distributionList: {
      gap: 12,
    },
    distRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    distLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      width: 60,
      gap: 6,
    },
    distLabel: {
      fontFamily: "Manrope_500Medium",
      ...typography.xs,
      color: c.foreground,
    },
    distBarContainer: {
      flex: 1,
      height: 10,
      backgroundColor: c.secondary,
      borderRadius: 6,
      overflow: "hidden",
    },
    distBar: {
      height: "100%",
      borderRadius: 6,
    },
    distPct: {
      fontFamily: "Manrope_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
      width: 34,
      textAlign: "right",
    },
  });
