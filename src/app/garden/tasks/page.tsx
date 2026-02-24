"use client";

import { useEffect, useState, useCallback } from "react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CheckSquare, ChevronRight } from "lucide-react";
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

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

  const pending = tasks.filter((t) => !t.is_completed);
  const done = tasks.filter((t) => t.is_completed);
  const now = new Date();
  const overdueCount = pending.filter((t) => t.due_date && new Date(t.due_date) < now).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Tasks"
        subtitle={`${pending.length} pending${done.length > 0 ? `, ${done.length} done` : ""}${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`}
      />

      {tasks.length === 0 ? (
        <Card className="text-center py-10">
          <div className="flex flex-col items-center gap-3 px-6">
            <CheckSquare className="size-10 text-muted-foreground" />
            <p className="font-medium text-base text-foreground">
              No tasks yet
            </p>
            <p className="text-sm text-muted-foreground">
              Tell Groot on WhatsApp what you need to do — he&apos;ll track it for you.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Pending tasks */}
          <section>
            <p className="text-[11px] uppercase tracking-[0.15em] mb-3 font-semibold text-muted-foreground">
              To Do
            </p>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {pending.map((t) => {
                  const isOverdue = t.due_date && new Date(t.due_date) < now;
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
                          "!p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                          isOverdue && "border-l-[3px] border-l-destructive"
                        )}
                        onClick={() => toggleTask(t.id, t.is_completed)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={false}
                            className={cn(
                              "shrink-0",
                              isOverdue && "border-destructive"
                            )}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => toggleTask(t.id, t.is_completed)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground leading-relaxed">
                              {t.content}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
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
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>

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
                          className="!p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleTask(t.id, t.is_completed)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={true}
                              className="shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={() => toggleTask(t.id, t.is_completed)}
                            />
                            <p className="text-sm line-through text-muted-foreground">
                              {t.content}
                            </p>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
}
