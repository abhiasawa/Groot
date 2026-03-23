import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useTasks, toggleTask, createTask, deleteTask, qk } from "../../lib/api/queries";
import { fonts, typography } from "../../constants/typography";
import { notoTheme, colors, radii, shadows } from "../../lib/theme/tokens";
import { NotoMascot } from "../../components/ui/noto-mascot";
import type { Task } from "../../../shared/types/api";

// ── Category colors ──────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  work: { bg: "#DBEAFE", text: "#1D4ED8", label: "Work" },
  personal: { bg: "#EDE9FE", text: "#6D28D9", label: "Personal" },
  health: { bg: "#D1FAE5", text: "#047857", label: "Health" },
  finance: { bg: "#FEF3C7", text: "#B45309", label: "Finance" },
  learning: { bg: "#CFFAFE", text: "#0E7490", label: "Learning" },
  errands: { bg: "#FFEDD5", text: "#C2410C", label: "Errands" },
  social: { bg: "#FCE7F3", text: "#BE185D", label: "Social" },
  todo: { bg: colors.iconButtonBg, text: colors.textSubdued, label: "To-do" },
};

function getCategoryStyle(category: string | null) {
  if (!category || category === "todo") return null;
  return CATEGORY_COLORS[category] ?? null;
}

function isOverdue(due_date: string | null): boolean {
  if (!due_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(due_date) < today;
}

function formatDueDate(due_date: string): string {
  const d = new Date(due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main Component ───────────────────────────

export default function TasksScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useTasks();
  const [refreshing, setRefreshing] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  // Optimistic toggles tracked by task ID
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);

  const pending = useMemo(
    () =>
      tasks
        .filter((t) => !(optimistic[t.id] ?? t.is_completed))
        .sort((a, b) => {
          // Overdue first, then by created_at desc
          const aOver = isOverdue(a.due_date) ? 0 : 1;
          const bOver = isOverdue(b.due_date) ? 0 : 1;
          if (aOver !== bOver) return aOver - bOver;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }),
    [tasks, optimistic],
  );

  const completed = useMemo(
    () => tasks.filter((t) => optimistic[t.id] ?? t.is_completed),
    [tasks, optimistic],
  );

  const overdueCount = useMemo(
    () => pending.filter((t) => isOverdue(t.due_date)).length,
    [pending],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setOptimistic({});
    queryClient.invalidateQueries({ queryKey: qk.tasks });
    refetch().finally(() => setRefreshing(false));
  }, [queryClient, refetch]);

  const handleToggle = useCallback(
    async (task: Task) => {
      const next = !(optimistic[task.id] ?? task.is_completed);
      setOptimistic((prev) => ({ ...prev, [task.id]: next }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        await toggleTask(task.id, next);
        queryClient.invalidateQueries({ queryKey: qk.tasks });
      } catch {
        // Revert on failure
        setOptimistic((prev) => {
          const copy = { ...prev };
          delete copy[task.id];
          return copy;
        });
      }
    },
    [optimistic, queryClient],
  );

  const handleAdd = useCallback(async () => {
    const content = newTask.trim();
    if (!content) return;
    setAdding(true);
    try {
      await createTask(content);
      setNewTask("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: qk.tasks });
    } catch {
      // silent
    } finally {
      setAdding(false);
    }
  }, [newTask, queryClient]);

  const handleDelete = useCallback(
    async (taskId: string) => {
      try {
        await deleteTask(taskId);
        queryClient.invalidateQueries({ queryKey: qk.tasks });
      } catch {
        // silent
      }
    },
    [queryClient],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C0BDB8"
            colors={["#FFBB2C"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tasks</Text>
          {!isLoading && tasks.length > 0 && (
            <View style={styles.badges}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pending.length} pending</Text>
              </View>
              {overdueCount > 0 && (
                <View style={[styles.badge, styles.badgeOverdue]}>
                  <Text style={[styles.badgeText, styles.badgeOverdueText]}>
                    {overdueCount} overdue
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Add task */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Add a task..."
            placeholderTextColor={colors.placeholder}
            value={newTask}
            onChangeText={setNewTask}
            onSubmitEditing={() => void handleAdd()}
            returnKeyType="done"
            editable={!adding}
          />
          <Pressable
            onPress={() => void handleAdd()}
            disabled={!newTask.trim() || adding}
            style={[
              styles.addButton,
              (!newTask.trim() || adding) && styles.addButtonDisabled,
            ]}
            accessibilityLabel="Add task"
            accessibilityRole="button"
          >
            <Plus size={18} color="#FFF" strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Empty state */}
        {!isLoading && tasks.length === 0 && (
          <View style={styles.emptyState}>
            <NotoMascot size={160} compact />
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySubtitle}>
              Add a task above, or tell Groot and it becomes a task automatically.
            </Text>
          </View>
        )}

        {/* Pending tasks */}
        {pending.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            completed={false}
            onToggle={() => void handleToggle(task)}
            onDelete={() => void handleDelete(task.id)}
          />
        ))}

        {/* Completed section */}
        {completed.length > 0 && (
          <>
            <Pressable
              onPress={() => setShowCompleted((v) => !v)}
              style={styles.completedHeader}
            >
              <Text style={styles.completedHeaderText}>
                Completed ({completed.length})
              </Text>
              {showCompleted ? (
                <ChevronUp size={16} color={colors.textFaded} strokeWidth={2} />
              ) : (
                <ChevronDown size={16} color={colors.textFaded} strokeWidth={2} />
              )}
            </Pressable>
            {showCompleted &&
              completed.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  completed
                  onToggle={() => void handleToggle(task)}
                  onDelete={() => void handleDelete(task.id)}
                />
              ))}
          </>
        )}

        <View style={styles.bottomGap} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Task Card ────────────────────────────────

function TaskCard({
  task,
  completed,
  onToggle,
  onDelete,
}: {
  task: Task;
  completed: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const cat = getCategoryStyle(task.category);
  const overdue = !completed && isOverdue(task.due_date);

  return (
    <View style={[styles.taskCard, completed && styles.taskCardCompleted]}>
      <Pressable
        onPress={onToggle}
        style={[styles.checkbox, completed && styles.checkboxDone]}
        accessibilityLabel={completed ? "Mark incomplete" : "Mark complete"}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        hitSlop={8}
      >
        {completed && <Check size={12} color="#FFF" strokeWidth={3} />}
      </Pressable>

      <View style={styles.taskContent}>
        <Text
          style={[styles.taskText, completed && styles.taskTextDone]}
          numberOfLines={3}
        >
          {task.content}
        </Text>
        <View style={styles.taskMeta}>
          {cat && (
            <View style={[styles.categoryBadge, { backgroundColor: cat.bg }]}>
              <Text style={[styles.categoryText, { color: cat.text }]}>
                {cat.label}
              </Text>
            </View>
          )}
          {task.due_date && (
            <Text style={[styles.dueDate, overdue && styles.dueDateOverdue]}>
              {formatDueDate(task.due_date)}
            </Text>
          )}
        </View>
      </View>

      <Pressable
        onPress={onDelete}
        style={styles.deleteBtn}
        hitSlop={8}
        accessibilityLabel="Delete task"
        accessibilityRole="button"
      >
        <Trash2 size={14} color={colors.textFaded} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}

// ── Styles ───────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },

  // Header
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: notoTheme.foreground,
    letterSpacing: -0.9,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  badge: {
    backgroundColor: colors.iconButtonBg,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSubdued,
  },
  badgeOverdue: {
    backgroundColor: "rgba(226,85,85,0.1)",
  },
  badgeOverdueText: {
    color: notoTheme.destructive,
  },

  // Add task
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  addInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.iconButtonBg,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: notoTheme.foreground,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: notoTheme.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: {
    opacity: 0.35,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 52,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    ...typography.lg,
    color: notoTheme.foreground,
    marginTop: 20,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: "#999",
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  // Task card
  taskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: notoTheme.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: notoTheme.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...shadows.sm,
  },
  taskCardCompleted: {
    opacity: 0.6,
    ...({ shadowOpacity: 0 } as Record<string, number>),
    elevation: 0,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: notoTheme.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxDone: {
    backgroundColor: notoTheme.foreground,
    borderColor: notoTheme.foreground,
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontFamily: fonts.medium,
    ...typography.sm,
    color: notoTheme.foreground,
  },
  taskTextDone: {
    textDecorationLine: "line-through",
    color: colors.textFaded,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  categoryBadge: {
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  dueDate: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSubdued,
  },
  dueDateOverdue: {
    color: notoTheme.destructive,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.iconButtonBg,
    alignItems: "center",
    justifyContent: "center",
  },

  // Completed section
  completedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginTop: 8,
  },
  completedHeaderText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textFaded,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },

  bottomGap: { height: 96 },
});
