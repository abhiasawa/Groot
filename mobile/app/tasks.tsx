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
import { CheckSquare, ListTodo, Sparkles, Square } from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useTasks } from "../lib/api/queries";
import { useToggleTask } from "../lib/api/mutations";
import { typography } from "../constants/typography";
import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PressScale } from "../components/ui/press-scale";
import { SectionHeader } from "../components/ui/section-header";
import { PillBadge } from "../components/ui/pill-badge";
import { DeepScreenHeader } from "../components/ui/deep-screen-header";
import { TabSwipeView } from "../components/ui/tab-swipe-view";
import type { Task } from "../../shared/types/api";

type TaskFilter = "all" | "pending" | "completed";

type TaskTone = "default" | "overdue" | "done";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function parseDate(dateStr: string): number {
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isOverdueDate(dueDate: string): boolean {
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(new Date());
  return due < today;
}

function sortPending(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDue = a.due_date ? parseDate(a.due_date) : null;
    const bDue = b.due_date ? parseDate(b.due_date) : null;

    if (aDue !== null && bDue !== null && aDue !== bDue) return aDue - bDue;
    if (aDue !== null && bDue === null) return -1;
    if (aDue === null && bDue !== null) return 1;

    return parseDate(b.created_at) - parseDate(a.created_at);
  });
}

function sortCompleted(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at));
}

export default function TasksScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { data, isLoading, refetch } = useTasks();
  const toggleTask = useToggleTask();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const isTabRoute = segments[0] === "(tabs)";

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    refetch().finally(() => setIsPullRefreshing(false));
  }, [refetch]);

  const tasks = data?.tasks ?? [];

  const { pending, completed, overdue, upcoming } = useMemo(() => {
    const pendingTasks = sortPending(tasks.filter((task) => !task.is_completed));
    const completedTasks = sortCompleted(tasks.filter((task) => task.is_completed));

    const overdueTasks = pendingTasks.filter((task) => task.due_date && isOverdueDate(task.due_date));
    const upcomingTasks = pendingTasks.filter((task) => !task.due_date || !isOverdueDate(task.due_date));

    return {
      pending: pendingTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      upcoming: upcomingTasks,
    };
  }, [tasks]);

  const summary = useMemo(
    () => ({
      total: tasks.length,
      pending: pending.length,
      completed: completed.length,
      overdue: overdue.length,
    }),
    [tasks.length, pending.length, completed.length, overdue.length],
  );

  const handleToggle = useCallback(
    (task: Task) => {
      toggleTask.mutate({
        taskId: task.id,
        is_completed: !task.is_completed,
      });
    },
    [toggleTask],
  );

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

  const showPending = filter !== "completed";
  const showCompleted = filter !== "pending";

  return (
    <SafeAreaView style={styles.flex}>
      <TabSwipeView currentTab="tasks" enabled={isTabRoute}>
        <GradientBackground>
          <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isTabRoute ? (
            <View style={styles.tabHeader}>
              <Text style={[styles.tabTitle, { color: colors.foreground }]}>Tasks</Text>
              <Text style={[styles.tabSubtitle, { color: colors.mutedForeground }]}>Your daily execution board.</Text>
            </View>
          ) : (
            <DeepScreenHeader
              title="Tasks"
              subtitle="Execute priorities and clear your queue."
              onBack={() => router.back()}
              tags={["Execution", "Reminders"]}
            />
          )}

          {!tasks.length ? (
            <GlassCard padding={26}>
              <View style={styles.emptyInner}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.glassSurface }]}>
                  <ListTodo size={36} color={colors.mutedForeground} strokeWidth={1.1} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No tasks yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Ask Groot to create reminders or to-dos. They will appear here automatically.</Text>
              </View>
            </GlassCard>
          ) : (
            <>
              <GlassCard padding={18} accentColor={colors.primary} style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Sparkles size={13} color={colors.accent} strokeWidth={1.8} />
                  <Text style={[styles.summaryLabel, { color: colors.accent }]}>Task Snapshot</Text>
                </View>
                <View style={styles.summaryRow}>
                  <SummaryStat label="Open" value={summary.pending} />
                  <SummaryStat label="Done" value={summary.completed} />
                  <SummaryStat label="Overdue" value={summary.overdue} />
                  <SummaryStat label="Total" value={summary.total} />
                </View>
              </GlassCard>

              <View style={styles.filterRow}>
                <PressScale onPress={() => setFilter("all")} haptic={false}>
                  <PillBadge
                    label={`All (${summary.total})`}
                    color={filter === "all" ? colors.secondaryForeground : colors.glassSurface}
                    textColor={filter === "all" ? "#FFFFFF" : colors.mutedForeground}
                  />
                </PressScale>
                <PressScale onPress={() => setFilter("pending")} haptic={false}>
                  <PillBadge
                    label={`Pending (${summary.pending})`}
                    color={filter === "pending" ? colors.primary : colors.glassSurface}
                    textColor={filter === "pending" ? colors.primaryForeground : colors.mutedForeground}
                  />
                </PressScale>
                <PressScale onPress={() => setFilter("completed")} haptic={false}>
                  <PillBadge
                    label={`Done (${summary.completed})`}
                    color={filter === "completed" ? colors.moodGood : colors.glassSurface}
                    textColor={filter === "completed" ? "#FFFFFF" : colors.mutedForeground}
                  />
                </PressScale>
              </View>

              {showPending && overdue.length > 0 ? (
                <View style={styles.sectionWrap}>
                  <SectionHeader title={`Overdue (${overdue.length})`} />
                  {overdue.map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      delay={index * 55}
                      tone="overdue"
                    />
                  ))}
                </View>
              ) : null}

              {showPending && upcoming.length > 0 ? (
                <View style={styles.sectionWrap}>
                  <SectionHeader
                    title={filter === "pending" ? `Pending (${upcoming.length})` : `Active (${upcoming.length})`}
                  />
                  {upcoming.map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      delay={80 + index * 55}
                      tone="default"
                    />
                  ))}
                </View>
              ) : null}

              {showCompleted && completed.length > 0 ? (
                <View style={styles.sectionWrap}>
                  <SectionHeader title={`Completed (${completed.length})`} />
                  {completed.map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      delay={120 + index * 55}
                      tone="done"
                    />
                  ))}
                </View>
              ) : null}

              {((filter === "pending" && summary.pending === 0) ||
                (filter === "completed" && summary.completed === 0)) && (
                <GlassCard padding={18}>
                  <Text style={[styles.filterEmptyTitle, { color: colors.foreground }]}>Nothing in this view</Text>
                  <Text style={[styles.filterEmptyBody, { color: colors.mutedForeground }]}>Switch filters to view the rest of your queue.</Text>
                </GlassCard>
              )}
            </>
          )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </GradientBackground>
      </TabSwipeView>
    </SafeAreaView>
  );
}

function TaskRow({
  task,
  onToggle,
  delay,
  tone,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  delay: number;
  tone: TaskTone;
}) {
  const { colors } = useTheme();
  const done = task.is_completed;
  const dueLabel = task.due_date ? `Due ${formatDate(task.due_date)}` : null;
  const overdue = !done && !!task.due_date && isOverdueDate(task.due_date);

  const accentColor = tone === "done" ? colors.moodGood : tone === "overdue" ? colors.destructive : undefined;

  return (
    <View style={styles.taskCardWrap}>
      <PressScale onPress={() => onToggle(task)}>
        <GlassCard padding={14} delay={delay} accentColor={accentColor}>
          <View style={styles.taskRow}>
            {done ? (
              <CheckSquare size={20} color={colors.moodGood} strokeWidth={1.6} />
            ) : (
              <Square
                size={20}
                color={overdue ? colors.destructive : colors.mutedForeground}
                strokeWidth={1.6}
              />
            )}

            <View style={styles.taskCopy}>
              <Text
                style={[
                  styles.taskTitle,
                  { color: done ? colors.mutedForeground : colors.foreground },
                  done && styles.taskDone,
                ]}
                numberOfLines={2}
              >
                {task.content}
              </Text>

              <View style={styles.taskMetaRow}>
                {task.category ? <PillBadge label={task.category} small /> : null}
                {dueLabel ? (
                  <PillBadge
                    label={dueLabel}
                    color={overdue ? `${colors.destructive}1F` : colors.secondary}
                    textColor={overdue ? colors.destructive : colors.secondaryForeground}
                    small
                  />
                ) : null}
              </View>
            </View>
          </View>
        </GlassCard>
      </PressScale>
    </View>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  tabHeader: {
    marginBottom: 16,
  },
  tabTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.title,
  },
  tabSubtitle: {
    marginTop: 2,
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
  },
  summaryCard: {
    marginBottom: 18,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  summaryLabel: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontFamily: "Sora_700Bold",
    ...typography.lg,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  taskCardWrap: {
    marginBottom: 10,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  taskCopy: {
    flex: 1,
  },
  taskTitle: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 22,
  },
  taskDone: {
    textDecorationLine: "line-through",
  },
  taskMetaRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  emptyInner: {
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    fontFamily: "Sora_700Bold",
    ...typography.lg,
  },
  emptySubtitle: {
    textAlign: "center",
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  filterEmptyTitle: {
    marginBottom: 4,
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
  filterEmptyBody: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
  },
  bottomSpacer: {
    height: 20,
  },
});
