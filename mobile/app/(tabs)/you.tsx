import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Settings,
  Circle,
  CheckCircle2,
  Flame,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useTheme } from "../../lib/theme/provider";
import {
  useProfile,
  usePeople,
  useHabits,
  useTasks,
  useCurrentUser,
  qk,
} from "../../lib/api/queries";
import { apiFetch } from "../../lib/api/client";
import { Sheet } from "../../components/ui/sheet";
import { SectionLabel } from "../../components/ui/section-label";
import { Avatar } from "../../components/ui/avatar";
import type {
  ProfileFact,
  Person,
  Habit,
  Task,
  ToggleTaskPayload,
  OkResponse,
} from "../../../shared/types/api";

// ── Helpers ──────────────────────────────────

const FACT_EMOJIS: Record<string, string> = {
  location: "📍",
  occupation: "💼",
  company: "🏢",
  pet_name: "🐕",
  pet_type: "🐾",
  hobby: "🏃",
  vehicle: "🚗",
  diet: "🥗",
  university: "🎓",
  age: "🎂",
  weight: "⚖️",
  allergy: "⚠️",
  wife_name: "💑",
  husband_name: "💑",
  child_1_name: "👶",
  child_2_name: "👶",
  children_count: "👨‍👩‍👧‍👦",
  work_style: "💻",
  learning_goal: "📚",
  workout_time: "🏋️",
};

function getFactEmoji(key: string): string {
  if (FACT_EMOJIS[key]) return FACT_EMOJIS[key]!;
  // Try prefix match
  for (const [k, v] of Object.entries(FACT_EMOJIS)) {
    if (key.startsWith(k)) return v;
  }
  return "•";
}

function formatFactLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ────────────────────────────────

export default function YouScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: userData, isLoading: userLoading } = useCurrentUser();
  const { data: profileData, isRefetching: profileRefetching, refetch: refetchProfile } = useProfile();
  const { data: peopleData } = usePeople();
  const { data: habitsData } = useHabits();
  const { data: tasksData, refetch: refetchTasks } = useTasks();

  const [showAllFacts, setShowAllFacts] = useState(false);

  const toggleTask = useMutation<OkResponse, Error, ToggleTaskPayload>({
    mutationFn: (payload) =>
      apiFetch<OkResponse>("/api/tasks", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tasks });
      queryClient.invalidateQueries({ queryKey: qk.home });
    },
  });

  const onRefresh = useCallback(() => {
    refetchProfile();
    refetchTasks();
  }, [refetchProfile, refetchTasks]);

  if (userLoading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const user = userData?.user;
  const displayName = user?.display_name ?? "You";
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  // Profile facts — flatten all categories
  const allFacts: ProfileFact[] = profileData
    ? [
        ...profileData.facts.static,
        ...profileData.facts.dynamic,
        ...profileData.facts.preference,
        ...profileData.facts.goal,
      ]
    : [];
  const visibleFacts = showAllFacts ? allFacts : allFacts.slice(0, 5);

  const people = peopleData?.people ?? [];
  const habits = habitsData?.habits ?? [];
  const allTasks = tasksData?.tasks ?? [];
  const pendingTasks = allTasks.filter((t) => !t.is_completed);
  const completedTasks = allTasks.filter((t) => t.is_completed).slice(0, 3);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={profileRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header with gear ───────────── */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => router.push("/settings" as never)}
            hitSlop={12}
          >
            <Settings
              size={22}
              color={colors.mutedForeground}
              strokeWidth={1.5}
            />
          </Pressable>
        </View>

        {/* ── Avatar + Name ──────────────── */}
        <View style={s.profileSection}>
          <Avatar name={displayName} size={64} color={colors.primary} />
          <View style={s.profileText}>
            <Text style={[s.profileName, { color: colors.foreground }]}>
              {displayName}
            </Text>
            {joinDate && (
              <Text style={[s.profileJoin, { color: colors.mutedForeground }]}>
                Joined {joinDate}
              </Text>
            )}
          </View>
        </View>

        {/* ── About You ──────────────────── */}
        {allFacts.length > 0 && (
          <View style={s.section}>
            <SectionLabel>About you</SectionLabel>
            <Sheet padding={12}>
              {visibleFacts.map((fact) => (
                <View key={fact.id} style={s.factRow}>
                  <Text style={s.factEmoji}>{getFactEmoji(fact.key)}</Text>
                  <Text
                    style={[s.factValue, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {fact.value}
                  </Text>
                </View>
              ))}
              {allFacts.length > 5 && (
                <Pressable
                  onPress={() => setShowAllFacts((v) => !v)}
                  style={s.seeAllRow}
                >
                  <Text style={[s.seeAll, { color: colors.primary }]}>
                    {showAllFacts ? "Show less" : `See all ${allFacts.length} →`}
                  </Text>
                </Pressable>
              )}
            </Sheet>
          </View>
        )}

        {/* ── People ─────────────────────── */}
        {people.length > 0 && (
          <View style={s.section}>
            <SectionLabel>People</SectionLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.peopleScroll}
            >
              {people.slice(0, 10).map((person, i) => (
                <View key={`${person.name}-${i}`} style={s.personItem}>
                  <Avatar
                    name={person.name}
                    size={44}
                    color={colors.chart1}
                  />
                  <Text
                    style={[s.personName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {person.name.split(" ")[0]}
                  </Text>
                  {person.relationship && (
                    <Text
                      style={[s.personRel, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {person.relationship}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Habits ─────────────────────── */}
        {habits.length > 0 && (
          <View style={s.section}>
            <SectionLabel>Habits</SectionLabel>
            <Sheet padding={12}>
              {habits.map((habit) => (
                <View key={habit.id} style={s.habitRow}>
                  <View style={s.habitLeft}>
                    <Flame
                      size={16}
                      color={
                        habit.current_streak > 0
                          ? colors.accent
                          : colors.mutedForeground
                      }
                      strokeWidth={1.5}
                    />
                    <Text
                      style={[s.habitName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {habit.name}
                    </Text>
                  </View>
                  <Text style={[s.habitStreak, { color: colors.mutedForeground }]}>
                    {habit.current_streak > 0
                      ? `${habit.current_streak}d streak`
                      : "—"}
                  </Text>
                </View>
              ))}
            </Sheet>
          </View>
        )}

        {/* ── Tasks ──────────────────────── */}
        {(pendingTasks.length > 0 || completedTasks.length > 0) && (
          <View style={s.section}>
            <SectionLabel>Tasks</SectionLabel>
            <Sheet padding={12}>
              {pendingTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={s.taskRow}
                  activeOpacity={0.6}
                  onPress={() =>
                    toggleTask.mutate({
                      taskId: task.id,
                      is_completed: true,
                    })
                  }
                >
                  <Circle
                    size={20}
                    color={colors.mutedForeground}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={[s.taskText, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {task.content}
                  </Text>
                </TouchableOpacity>
              ))}
              {completedTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={s.taskRow}
                  activeOpacity={0.6}
                  onPress={() =>
                    toggleTask.mutate({
                      taskId: task.id,
                      is_completed: false,
                    })
                  }
                >
                  <CheckCircle2
                    size={20}
                    color={colors.moodGood}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={[
                      s.taskText,
                      {
                        color: colors.mutedForeground,
                        textDecorationLine: "line-through",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {task.content}
                  </Text>
                </TouchableOpacity>
              ))}
            </Sheet>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },

  // Profile
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  profileText: { flex: 1 },
  profileName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  },
  profileJoin: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },

  // Sections
  section: { marginTop: 24 },

  // Facts
  factRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  factEmoji: { fontSize: 16 },
  factValue: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    flex: 1,
  },
  seeAllRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  seeAll: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "right",
  },

  // People
  peopleScroll: {
    gap: 16,
    paddingRight: 20,
  },
  personItem: {
    alignItems: "center",
    width: 60,
  },
  personName: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
  personRel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    textAlign: "center",
    marginTop: 1,
  },

  // Habits
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  habitLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  habitName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
  },
  habitStreak: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  // Tasks
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  taskText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    flex: 1,
  },
});
