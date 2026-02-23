import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
import type { Task } from "../../shared/types/api";

// ── Helpers ──────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Component ────────────────────────────────

export default function TasksScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useTasks();
  const toggleTask = useToggleTask();

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

  const handleToggle = useCallback(
    (task: Task) => {
      toggleTask.mutate({
        taskId: task.id,
        is_completed: !task.is_completed,
      });
    },
    [toggleTask],
  );

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={colors.foreground} strokeWidth={1.5} />
        </Pressable>
        <Text style={s.headerTitle}>Tasks</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !data?.tasks?.length ? (
        <ScrollView
          contentContainerStyle={s.center}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <ListTodo size={32} color={colors.mutedForeground} strokeWidth={1} />
          <Text style={s.emptyTitle}>No tasks yet</Text>
          <Text style={s.emptySubtitle}>
            Ask Groot to remind you of things or create tasks, and they will
            show up here.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Pending section */}
          {pending.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                Pending ({pending.length})
              </Text>
              {pending.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  colors={colors}
                  onToggle={handleToggle}
                />
              ))}
            </View>
          )}

          {/* Completed section */}
          {completed.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                Completed ({completed.length})
              </Text>
              {completed.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  colors={colors}
                  onToggle={handleToggle}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Task row ─────────────────────────────────

function TaskRow({
  task,
  colors,
  onToggle,
}: {
  task: Task;
  colors: ReturnType<typeof useTheme>["colors"];
  onToggle: (task: Task) => void;
}) {
  const s = styles(colors);
  const done = task.is_completed;

  return (
    <Pressable
      style={({ pressed }) => [s.taskRow, pressed && s.taskRowPressed]}
      onPress={() => onToggle(task)}
    >
      {done ? (
        <CheckSquare size={20} color={colors.moodGood} strokeWidth={1.5} />
      ) : (
        <Square size={20} color={colors.mutedForeground} strokeWidth={1.5} />
      )}
      <View style={s.taskContent}>
        <Text
          style={[s.taskText, done && s.taskTextDone]}
          numberOfLines={2}
        >
          {task.content}
        </Text>
        <View style={s.taskMeta}>
          {task.category && (
            <View style={s.categoryBadge}>
              <Text style={s.categoryText}>{task.category}</Text>
            </View>
          )}
          {task.due_date && (
            <Text style={s.dueDate}>Due {formatDate(task.due_date)}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────

const styles = (c: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.lg,
      color: c.foreground,
    },
    scroll: {
      padding: 20,
      paddingBottom: 40,
    },
    section: {
      marginBottom: 28,
    },
    sectionTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.sm,
      color: c.mutedForeground,
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: c.card,
      padding: 14,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    taskRowPressed: {
      backgroundColor: c.secondary,
    },
    taskContent: {
      flex: 1,
    },
    taskText: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.foreground,
      lineHeight: 22,
    },
    taskTextDone: {
      textDecorationLine: "line-through",
      color: c.mutedForeground,
    },
    taskMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
    },
    categoryBadge: {
      backgroundColor: c.secondary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    categoryText: {
      fontFamily: "Inter_500Medium",
      ...typography.xs,
      color: c.mutedForeground,
    },
    dueDate: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
    emptyTitle: {
      fontFamily: "Inter_600SemiBold",
      ...typography.lg,
      color: c.foreground,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontFamily: "Inter_400Regular",
      ...typography.sm,
      color: c.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
  });
