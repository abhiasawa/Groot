"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Task {
  id: string;
  content: string;
  category: string;
  is_completed: boolean;
  created_at: string;
}

export default function TasksPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const toggleTask = useCallback(
    async (taskId: string, currentStatus: boolean) => {
      const newStatus = !currentStatus;
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_completed: newStatus } : t)),
      );

      try {
        await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, is_completed: newStatus }),
        });
      } catch {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, is_completed: currentStatus } : t)),
        );
      }
    },
    [],
  );

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

  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
      >
        Tasks
      </h1>

      {tasks.length === 0 ? (
        <div
          className="p-8 rounded-xl border text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <span className="text-4xl block mb-3">✅</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>
            No tasks yet
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Send &quot;todo: buy groceries&quot; to Groot on WhatsApp to add your first task.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTask(t.id, t.is_completed)}
              className="flex items-center gap-3 p-4 rounded-xl border w-full text-left transition-opacity"
              style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
                opacity: t.is_completed ? 0.5 : 1,
              }}
            >
              <span className="text-lg">{t.is_completed ? "✅" : "⬜"}</span>
              <div className="flex-1">
                <p
                  className="text-sm"
                  style={{
                    color: "var(--color-text)",
                    textDecoration: t.is_completed ? "line-through" : "none",
                  }}
                >
                  {t.content}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
