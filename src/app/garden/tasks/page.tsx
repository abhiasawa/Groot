"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckSquare,
  ChevronRight,
  Plus,
  Trash2,
  Tag,
  Calendar,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  content: string;
  category: string;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "work", label: "Work", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  { value: "personal", label: "Personal", color: "bg-violet-500/15 text-violet-700 dark:text-violet-400" },
  { value: "health", label: "Health", color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  { value: "finance", label: "Finance", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { value: "learning", label: "Learning", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400" },
  { value: "errands", label: "Errands", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  { value: "social", label: "Social", color: "bg-pink-500/15 text-pink-700 dark:text-pink-400" },
  { value: "todo", label: "To-do", color: "bg-muted text-muted-foreground" },
] as const;

function getCategoryStyle(category: string) {
  return CATEGORIES.find((c) => c.value === category) ?? { value: "todo", label: "To-do", color: "bg-muted text-muted-foreground" };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("todo");
  const [newDueDate, setNewDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cachedFetch<{ tasks?: Task[] }>("/api/tasks")
      .then((data) => setTasks(data.tasks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTask = useCallback(async (taskId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_completed: newStatus } : t)));
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, is_completed: newStatus }),
      });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_completed: currentStatus } : t)));
    }
  }, []);

  const addTask = useCallback(async () => {
    if (!newContent.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent.trim(),
          category: newCategory,
          due_date: newDueDate || null,
        }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks((prev) => [data.task, ...prev]);
        setNewContent("");
        setNewDueDate("");
        setNewCategory("todo");
        setShowAddForm(false);
      }
    } catch {
      // silent
    } finally {
      setAdding(false);
    }
  }, [newContent, newCategory, newDueDate, adding]);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await fetch(`/api/tasks?taskId=${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      // Refetch on failure
      cachedFetch<{ tasks?: Task[] }>("/api/tasks")
        .then((data) => setTasks(data.tasks ?? []))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (showAddForm && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAddForm]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-24" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  const filtered = filter ? tasks.filter((t) => t.category === filter) : tasks;
  const pending = filtered.filter((t) => !t.is_completed);
  const done = filtered.filter((t) => t.is_completed);
  const now = new Date();
  const overdueCount = pending.filter((t) => t.due_date && new Date(t.due_date) < now).length;

  // Compute category counts for filter badges
  const allPending = tasks.filter((t) => !t.is_completed);
  const categoryCounts = new Map<string, number>();
  for (const t of allPending) {
    categoryCounts.set(t.category, (categoryCounts.get(t.category) ?? 0) + 1);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Tasks"
          subtitle={`${pending.length} pending${done.length > 0 ? `, ${done.length} done` : ""}${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`}
        />
        <Button
          size="sm"
          variant="outline"
          className="mt-1 gap-1.5 shrink-0"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {showAddForm ? "Cancel" : "Add task"}
        </Button>
      </div>

      {/* Add task form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="!p-4 space-y-3">
              <Input
                ref={inputRef}
                placeholder="What do you need to do?"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void addTask();
                  }
                }}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                      <Tag className="size-3" />
                      {getCategoryStyle(newCategory).label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {CATEGORIES.map((cat) => (
                      <DropdownMenuItem
                        key={cat.value}
                        onClick={() => setNewCategory(cat.value)}
                      >
                        <Badge variant="secondary" className={cn("text-[10px] mr-2", cat.color)}>
                          {cat.label}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3 text-muted-foreground" />
                  <Input
                    type="date"
                    className="h-8 w-auto text-xs"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>

                <div className="flex-1" />
                <Button
                  size="sm"
                  className="h-8"
                  disabled={!newContent.trim() || adding}
                  onClick={() => void addTask()}
                >
                  {adding ? "Adding..." : "Add"}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category filter chips */}
      {categoryCounts.size > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              !filter
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          {CATEGORIES.filter((c) => categoryCounts.has(c.value)).map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(filter === cat.value ? null : cat.value)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                filter === cat.value
                  ? "bg-foreground text-background"
                  : cn("hover:opacity-80", cat.color)
              )}
            >
              {cat.label} ({categoryCounts.get(cat.value)})
            </button>
          ))}
        </div>
      )}

      {tasks.length === 0 ? (
        <Card className="text-center py-10">
          <div className="flex flex-col items-center gap-3 px-6">
            <CheckSquare className="size-10 text-muted-foreground" />
            <p className="font-medium text-base text-foreground">
              No tasks yet
            </p>
            <p className="text-sm text-muted-foreground">
              Add a task above, or just tell Groot what you need to do — on WhatsApp, Telegram, or right here in chat.
            </p>
          </div>
        </Card>
      ) : pending.length === 0 && !showDone ? (
        <Card className="text-center py-10">
          <div className="flex flex-col items-center gap-3 px-6">
            <CheckSquare className="size-10 text-muted-foreground" />
            <p className="font-medium text-base text-foreground">
              {filter ? "No pending tasks in this category" : "All caught up!"}
            </p>
          </div>
        </Card>
      ) : null}

      {/* Pending tasks */}
      {pending.length > 0 && (
        <section>
          <p className="text-[11px] uppercase tracking-[0.15em] mb-3 font-semibold text-muted-foreground">
            To Do
          </p>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {pending.map((t) => {
                const isOverdue = t.due_date && new Date(t.due_date) < now;
                const catStyle = getCategoryStyle(t.category);
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      className={cn(
                        "!p-4 group hover:bg-muted/50 transition-colors",
                        isOverdue && "border-l-[3px] border-l-destructive"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={false}
                          className={cn(
                            "shrink-0 mt-0.5",
                            isOverdue && "border-destructive"
                          )}
                          onCheckedChange={() => toggleTask(t.id, t.is_completed)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-relaxed">
                            {t.content}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {t.category && t.category !== "todo" && (
                              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", catStyle.color)}>
                                {catStyle.label}
                              </Badge>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                            {t.due_date && (
                              <>
                                <span className="text-[11px] text-border">&#x2022;</span>
                                {isOverdue ? (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    Overdue
                                  </Badge>
                                ) : (
                                  <span className="text-[11px] font-medium text-muted-foreground">
                                    Due {new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => void deleteTask(t.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                          aria-label="Delete task"
                        >
                          <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Done tasks */}
      {done.length > 0 && (
        <Collapsible open={showDone} onOpenChange={setShowDone}>
          <CollapsibleTrigger className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] mb-3 font-semibold text-muted-foreground transition-colors hover:text-foreground">
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform duration-200",
                showDone && "rotate-90"
              )}
            />
            {done.length} completed
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {done.map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 0.5, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      className="!p-4 group hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={true}
                          className="shrink-0"
                          onCheckedChange={() => toggleTask(t.id, t.is_completed)}
                        />
                        <p className="text-sm line-through text-muted-foreground flex-1">
                          {t.content}
                        </p>
                        <button
                          onClick={() => void deleteTask(t.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                          aria-label="Delete task"
                        >
                          <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
