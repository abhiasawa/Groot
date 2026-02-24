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
import { useRouter, useSegments } from "expo-router";
import {
  ArrowLeft,
  Square,
  CheckSquare,
  ListTodo,
} from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useTasks } from "../lib/api/queries";
import { useToggleTask } from "../lib/api/mutations";
import { typography } from "../constants/typography";
import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PressScale } from "../components/ui/press-scale";
import { SectionHeader } from "../components/ui/section-header";
import { PillBadge } from "../components/ui/pill-badge";
import type { Task } from "../../shared/types/api";

// ── Helpers ──────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type TaskFilter = "all" | "pending" | "completed";

// ── Component ────────────────────────────────

export default function TasksScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { data, isLoading, isRefetching, refetch } = useTasks();
  const toggleTask = useToggleTask();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const isTabRoute = segments[0] === "(tabs)";

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const { pending, completed } = useMemo(() => {
    const all = data?.tasks ?? [];
    return {
      pending: all.filter((t) => !t.is_completed),
      completed: all.filter((t) => t.is_completed),
    };
  }, [data?.tasks]);

  const visiblePending = filter === "completed" ? [] : pending;
  const visibleCompleted = filter === "pending" ? [] : completed;

  const handleToggle = useCallback(
    (task: Task) => {
      toggleTask.mutate({
        taskId: task.id,
        is_completed: !task.is_completed,
      });
    },
    [toggleTask],
  );

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

  // ── Empty state ────────────────────────────

  if (!data?.tasks?.length) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          {/* Header */}
          <View style={styles.header}>
            {isTabRoute ? (
              <View style={styles.headerSpacer} />
            ) : (
              <PressScale onPress={() => router.back()}>
                <ArrowLeft
                  size={24}
                  color={colors.foreground}
                  strokeWidth={1.5}
                />
              </PressScale>
            )}
            <View style={styles.headerTitleGroup}>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>
                Tasks
              </Text>
              <Text
                style={[styles.pageSubtitle, { color: colors.mutedForeground }]}
              >
                Stay on track
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <View
              style={[
                styles.emptyIconWrap,
                { backgroundColor: colors.glassSurface },
              ]}
            >
              <ListTodo
                size={36}
                color={colors.mutedForeground}
                strokeWidth={1}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No tasks yet
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
            >
              Ask Groot to remind you of things or create tasks, and they will
              show up here.
            </Text>
          </ScrollView>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  // ── Main content ───────────────────────────

  return (
    <SafeAreaView style={styles.flex}>
      <GradientBackground>
        {/* Header */}
        <View style={styles.header}>
          {isTabRoute ? (
            <View style={styles.headerSpacer} />
          ) : (
            <PressScale onPress={() => router.back()}>
              <ArrowLeft
                size={24}
                color={colors.foreground}
                strokeWidth={1.5}
              />
            </PressScale>
          )}
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>
              Tasks
            </Text>
            <Text
              style={[styles.pageSubtitle, { color: colors.mutedForeground }]}
            >
              Stay on track
            </Text>
          </View>
        </View>

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
          <View style={styles.filterWrap}>
            <PressScale onPress={() => setFilter("all")} haptic={false}>
              <PillBadge
                label={`All (${pending.length + completed.length})`}
                color={filter === "all" ? colors.secondaryForeground : colors.glassSurface}
                textColor={filter === "all" ? "#FFFFFF" : colors.mutedForeground}
              />
            </PressScale>
            <PressScale onPress={() => setFilter("pending")} haptic={false}>
              <PillBadge
                label={`Pending (${pending.length})`}
                color={filter === "pending" ? colors.primary : colors.glassSurface}
                textColor={filter === "pending" ? colors.primaryForeground : colors.mutedForeground}
              />
            </PressScale>
            <PressScale onPress={() => setFilter("completed")} haptic={false}>
              <PillBadge
                label={`Done (${completed.length})`}
                color={filter === "completed" ? colors.moodGood : colors.glassSurface}
                textColor={filter === "completed" ? "#FFFFFF" : colors.mutedForeground}
              />
            </PressScale>
          </View>

          {/* Pending section */}
          {visiblePending.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title={`Pending (${visiblePending.length})`} />
              {visiblePending.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  colors={colors}
                  onToggle={handleToggle}
                  delay={index * 60}
                />
              ))}
            </View>
          )}

          {/* Completed section */}
          {visibleCompleted.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title={`Completed (${visibleCompleted.length})`} />
              {visibleCompleted.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  colors={colors}
                  onToggle={handleToggle}
                  delay={120 + index * 60}
                />
              ))}
            </View>
          )}

          {visiblePending.length === 0 && visibleCompleted.length === 0 ? (
            <GlassCard padding={18}>
              <Text style={[styles.filterEmptyTitle, { color: colors.foreground }]}>
                Nothing in this view
              </Text>
              <Text style={[styles.filterEmptyCopy, { color: colors.mutedForeground }]}>
                Switch filters to see other tasks.
              </Text>
            </GlassCard>
          ) : null}

          {/* Bottom spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

// ── Task row ─────────────────────────────────

function TaskRow({
  task,
  colors,
  onToggle,
  delay,
}: {
  task: Task;
  colors: ReturnType<typeof useTheme>["colors"];
  onToggle: (task: Task) => void;
  delay: number;
}) {
  const done = task.is_completed;

  return (
    <View style={styles.taskRowOuter}>
      <PressScale onPress={() => onToggle(task)}>
        <GlassCard
          padding={14}
          delay={delay}
          accentColor={done ? colors.moodGood : undefined}
        >
          <View style={styles.taskRowInner}>
            {done ? (
              <CheckSquare
                size={20}
                color={colors.moodGood}
                strokeWidth={1.5}
              />
            ) : (
              <Square
                size={20}
                color={colors.mutedForeground}
                strokeWidth={1.5}
              />
            )}
            <View style={styles.taskContent}>
              <Text
                style={[
                  styles.taskText,
                  { color: done ? colors.mutedForeground : colors.foreground },
                  done && styles.taskTextDone,
                ]}
                numberOfLines={2}
              >
                {task.content}
              </Text>
              <View style={styles.taskMeta}>
                {task.category && (
                  <PillBadge small label={task.category} />
                )}
                {task.due_date && (
                  <Text
                    style={[
                      styles.dueDate,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Due {formatDate(task.due_date)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </GlassCard>
      </PressScale>
    </View>
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerSpacer: {
    width: 24,
  },
  pageTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.title,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    marginTop: 2,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },

  // Task row
  taskRowOuter: {
    marginBottom: 10,
  },
  taskRowInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  taskTextDone: {
    textDecorationLine: "line-through",
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  dueDate: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.lg,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  filterEmptyTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
    marginBottom: 4,
  },
  filterEmptyCopy: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
  },

  // Bottom
  bottomSpacer: {
    height: 20,
  },
});
