"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import PageHeader from "@/components/garden/page-header";
import DiaryCard from "@/components/garden/diary-card";

interface Task {
  id: string;
  content: string;
  category: string;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
}

export default function TasksPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const toggleTask = useCallback(async (taskId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_completed: newStatus } : t)));
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, is_completed: newStatus }),
      });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_completed: currentStatus } : t)));
    }
  }, []);

  if (userLoading || loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-24 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
    );
  }

  const pending = tasks.filter((t) => !t.is_completed);
  const done = tasks.filter((t) => t.is_completed);
  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" subtitle={`${pending.length} pending${done.length > 0 ? `, ${done.length} done` : ""}`} />

      {tasks.length === 0 ? (
        <DiaryCard variant="paper" className="text-center">
          <span className="text-3xl block mb-2">✅</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>No tasks yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Tell Groot on WhatsApp what you need to do — he&apos;ll track it for you.
          </p>
        </DiaryCard>
      ) : (
        <>
          {/* Pending tasks */}
          <section className="space-y-2">
            {pending.map((t) => {
              const isOverdue = t.due_date && new Date(t.due_date) < now;
              return (
                <DiaryCard key={t.id} onClick={() => toggleTask(t.id, t.is_completed)} className="!p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
                      style={{ borderColor: isOverdue ? "var(--color-danger)" : "var(--color-border)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: "var(--color-text)" }}>{t.content}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        {t.due_date && (
                          <span className="text-xs" style={{ color: isOverdue ? "var(--color-danger)" : "var(--color-text-secondary)" }}>
                            {isOverdue ? "Overdue" : `Due ${new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </DiaryCard>
              );
            })}
          </section>

          {/* Done tasks */}
          {done.length > 0 && (
            <section>
              <button
                onClick={() => setShowDone(!showDone)}
                className="text-xs mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {showDone ? "▾" : "▸"} {done.length} completed
              </button>
              {showDone && (
                <div className="space-y-2">
                  {done.map((t) => (
                    <DiaryCard key={t.id} onClick={() => toggleTask(t.id, t.is_completed)} className="!p-4" style={{ opacity: 0.5 } as React.CSSProperties}>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: "var(--color-primary)" }}
                        >
                          <span className="text-white text-[10px]">✓</span>
                        </div>
                        <p className="text-sm line-through" style={{ color: "var(--color-text-secondary)" }}>{t.content}</p>
                      </div>
                    </DiaryCard>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
