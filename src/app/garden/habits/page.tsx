"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Habit {
  id: string;
  name: string;
  category: string;
  target_value: number | null;
  target_unit: string | null;
  current_streak: number;
  longest_streak: number;
}

export default function HabitsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetch("/api/habits")
      .then((r) => r.json())
      .then((data) => setHabits(data.habits ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (userLoading || loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-24 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
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
        Habits
      </h1>

      {habits.length === 0 ? (
        <div
          className="p-8 rounded-xl border text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <span className="text-4xl block mb-3">📊</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>
            No habits tracked yet
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Tell Groot to track a habit — &quot;Track my weight daily&quot; or &quot;I want to read 30 pages a day&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((h) => (
            <div
              key={h.id}
              className="p-5 rounded-xl border"
              style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                  {h.name}
                </p>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full uppercase"
                  style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}
                >
                  {h.category}
                </span>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
                    {h.current_streak}
                  </p>
                  <p className="text-[10px] uppercase" style={{ color: "var(--color-text-secondary)" }}>
                    Current Streak
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: "var(--color-text-secondary)" }}>
                    {h.longest_streak}
                  </p>
                  <p className="text-[10px] uppercase" style={{ color: "var(--color-text-secondary)" }}>
                    Best Streak
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
