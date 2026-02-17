"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import PageHeader from "@/components/garden/page-header";
import DiaryCard from "@/components/garden/diary-card";

interface Habit {
  id: string;
  name: string;
  category: string;
  target_value: number | null;
  target_unit: string | null;
  current_streak: number;
  longest_streak: number;
  recentCheckins?: string[]; // YYYY-MM-DD dates
}

export default function HabitsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/habits?include=checkins")
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
          <div key={i} className="h-32 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Habits" subtitle="Your tracked habits and streaks" />

      {habits.length === 0 ? (
        <DiaryCard variant="paper" className="text-center">
          <span className="text-3xl block mb-2">📊</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>No habits tracked yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Tell Groot to track a habit — &quot;Track my weight daily&quot; or &quot;I want to read 30 pages a day&quot;.
          </p>
        </DiaryCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((h) => (
            <DiaryCard key={h.id}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm" style={{ color: "var(--color-text)" }}>{h.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}>
                  {h.category}
                </span>
              </div>

              {/* Streaks */}
              <div className="flex gap-6 mb-4">
                <div>
                  <p className="text-2xl font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                    {h.current_streak}
                  </p>
                  <p className="text-[10px] uppercase" style={{ color: "var(--color-text-secondary)" }}>Current</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {h.longest_streak}
                  </p>
                  <p className="text-[10px] uppercase" style={{ color: "var(--color-text-secondary)" }}>Best</p>
                </div>
                {h.target_value && h.target_unit && (
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>
                      {h.target_value}
                    </p>
                    <p className="text-[10px] uppercase" style={{ color: "var(--color-text-secondary)" }}>{h.target_unit}/day</p>
                  </div>
                )}
              </div>

              {/* 30-day heatmap */}
              <HabitHeatmap checkins={h.recentCheckins ?? []} />
            </DiaryCard>
          ))}
        </div>
      )}
    </div>
  );
}

function HabitHeatmap({ checkins }: { checkins: string[] }) {
  const checkinSet = new Set(checkins);
  const days: Array<{ date: string; checked: boolean }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0]!;
    days.push({ date: dateStr, checked: checkinSet.has(dateStr) });
  }

  return (
    <div>
      <p className="text-[10px] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Last 30 days</p>
      <div className="flex gap-[3px]">
        {days.map((d) => (
          <div
            key={d.date}
            title={d.date}
            className="rounded-sm"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: d.checked ? "var(--color-primary)" : "var(--color-border)",
              opacity: d.checked ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}
