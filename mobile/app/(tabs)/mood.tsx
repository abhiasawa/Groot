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
  Footprints,
  Trash2,
} from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../../lib/theme/provider";
import { useMood, useHabits } from "../../lib/api/queries";
import {
  useHabitCheckin,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
} from "../../lib/api/mutations";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { SectionHeader } from "../../components/ui/section-header";
import { PressScale } from "../../components/ui/press-scale";
import { TabSwipeView } from "../../components/ui/tab-swipe-view";
import { StepsCard } from "../../components/ui/steps-card";
import { MoodMeadow } from "../../components/garden/mood-meadow";
import type { Habit } from "../../../shared/types/api";

// ── Constants ────────────────────────────────

const GRID_PADDING = 20;

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
  const habitCheckin = useHabitCheckin();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [showNewHabit, setShowNewHabit] = useState(false);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    Promise.all([refetch(), refetchHabits()]).finally(() => setIsPullRefreshing(false));
  }, [refetch, refetchHabits]);

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

          {/* ── Steps ── */}
          <StepsCard />

          {/* Mood Meadow */}
          <GlassCard delay={100} style={s.sectionGap}>
            <SectionHeader title="Mood Meadow" />

            {(data?.dailyMoods?.length ?? 0) === 0 ? (
              <View style={s.emptyPixels}>
                <Text style={s.emptySubtitle}>
                  No mood data for {year} yet. Keep chatting with Groot to track
                  your moods.
                </Text>
              </View>
            ) : (
              <MoodMeadow dailyMoods={data!.dailyMoods} year={year} />
            )}
          </GlassCard>

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
            <GlassCard delay={200} style={s.sectionGap} padding={20}>
              <Text style={s.sectionTitle}>Track Your Habits</Text>
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
      paddingBottom: 90,
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
    sectionTitle: {
      fontFamily: "Sora_600SemiBold",
      ...typography.base,
      color: c.foreground,
      marginBottom: 16,
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

    // ── Mood Meadow ──
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
  });
