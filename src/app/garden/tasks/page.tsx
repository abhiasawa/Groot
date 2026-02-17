"use client";

import { useEffect, useState, useCallback } from "react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, is_completed: newStatus }),
      });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_completed: currentStatus } : t)));
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl mx-auto">
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
  const overdueCount = pending.filter(t => t.due_date && new Date(t.due_date) < now).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Tasks"
        subtitle={`${pending.length} pending${done.length > 0 ? `, ${done.length} done` : ""}${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`}
      />

      {tasks.length === 0 ? (
        <DiaryCard variant="paper" className="text-center !py-10">
          <span className="text-4xl block mb-3">&#x2705;</span>
          <p className="font-medium text-base mb-1" style={{ color: "var(--color-text)", fontFamily: "var(--font-heading)" }}>
            No tasks yet
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Tell Groot on WhatsApp what you need to do — he&apos;ll track it for you.
          </p>
        </DiaryCard>
      ) : (
        <>
          {/* Pending tasks */}
          <section>
            <p className="text-[11px] uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>
              To Do
            </p>
            <div className="space-y-2">
              {pending.map((t) => {
                const isOverdue = t.due_date && new Date(t.due_date) < now;
                return (
                  <DiaryCard
                    key={t.id}
                    variant="paper"
                    onClick={() => toggleTask(t.id, t.is_completed)}
                    className="!p-4"
                    style={isOverdue ? { borderLeft: "3px solid var(--color-danger)" } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-[18px] h-[18px] rounded-full border-2 shrink-0 transition-colors"
                        style={{ borderColor: isOverdue ? "var(--color-danger)" : "var(--color-primary)", opacity: 0.7 }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm"
                          style={{ color: "var(--color-text)", fontFamily: "var(--font-diary)", lineHeight: 1.5 }}
                        >
                          {t.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                            {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          {t.due_date && (
                            <>
                              <span className="text-[11px]" style={{ color: "var(--color-border)" }}>&#x2022;</span>
                              <span
                                className="text-[11px] font-medium"
                                style={{ color: isOverdue ? "var(--color-danger)" : "var(--color-text-secondary)" }}
                              >
                                {isOverdue ? "Overdue" : `Due ${new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </DiaryCard>
                );
              })}
            </div>
          </section>

          {/* Done tasks */}
          {done.length > 0 && (
            <section>
              <button
                onClick={() => setShowDone(!showDone)}
                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] mb-3 transition-colors"
                style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}
              >
                <span className="transition-transform" style={{ display: "inline-block", transform: showDone ? "rotate(90deg)" : "none" }}>&#x25B8;</span>
                {done.length} completed
              </button>
              {showDone && (
                <div className="space-y-2">
                  {done.map((t) => (
                    <DiaryCard key={t.id} onClick={() => toggleTask(t.id, t.is_completed)} className="!p-4" style={{ opacity: 0.5 }}>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: "var(--color-primary)" }}
                        >
                          <span className="text-white text-[9px]">&#x2713;</span>
                        </div>
                        <p
                          className="text-sm line-through"
                          style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-diary)" }}
                        >
                          {t.content}
                        </p>
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
