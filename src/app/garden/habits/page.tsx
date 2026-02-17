"use client";

import { useEffect, useState } from "react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
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
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cachedFetch<{ habits: Habit[] }>("/api/habits?include=checkins")
      .then((data) => setHabits(data.habits ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl mx-auto">
        <div className="h-8 w-24 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
    );
  }

  // Summary stats
  const totalStreakDays = habits.reduce((sum, h) => sum + h.current_streak, 0);
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.longest_streak), 0);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader title="Habits" subtitle="Your tracked habits and streaks" />

      {habits.length === 0 ? (
        <DiaryCard variant="paper" className="text-center !py-10">
          <span className="text-4xl block mb-3">&#x1F4CA;</span>
          <p className="font-medium text-base mb-1" style={{ color: "var(--color-text)", fontFamily: "var(--font-heading)" }}>
            No habits tracked yet
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-diary)", fontStyle: "italic" }}>
            Tell Groot to track a habit — &quot;Track my weight daily&quot; or &quot;I want to read 30 pages a day&quot;.
          </p>
        </DiaryCard>
      ) : (
        <>
          {/* Summary strip */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-heading)" }}>
                {habits.length}
              </p>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>habits</p>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: "var(--color-border)" }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: "var(--color-accent)", fontFamily: "var(--font-heading)" }}>
                {totalStreakDays}
              </p>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>active streak days</p>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: "var(--color-border)" }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: "var(--color-secondary)", fontFamily: "var(--font-heading)" }}>
                {bestStreak}
              </p>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>best streak</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits.map((h) => (
              <DiaryCard key={h.id} variant="paper">
                <div className="flex items-center justify-between mb-4">
                  <p
                    className="font-medium text-sm"
                    style={{ color: "var(--color-text)", fontFamily: "var(--font-heading)" }}
                  >
                    {h.name}
                  </p>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}
                  >
                    {h.category}
                  </span>
                </div>

                {/* Streaks */}
                <div className="flex gap-6 mb-4">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-heading)" }}>
                      {h.current_streak}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>Current</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-heading)" }}>
                      {h.longest_streak}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>Best</p>
                  </div>
                  {h.target_value && h.target_unit && (
                    <div>
                      <p className="text-2xl font-bold" style={{ color: "var(--color-accent)", fontFamily: "var(--font-heading)" }}>
                        {h.target_value}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>{h.target_unit}/day</p>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px mb-3" style={{ backgroundColor: "var(--color-border)" }} />

                {/* 30-day heatmap */}
                <HabitHeatmap checkins={h.recentCheckins ?? []} />
              </DiaryCard>
            ))}
          </div>
        </>
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

  const checkedCount = days.filter(d => d.checked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>Last 30 days</p>
        <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>{checkedCount}/30</p>
      </div>
      <div className="flex gap-[3px] flex-wrap">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.checked ? "Done" : "Missed"}`}
            className="rounded-sm transition-all"
            style={{
              width: "9px",
              height: "9px",
              backgroundColor: d.checked ? "var(--color-primary)" : "var(--color-border)",
              opacity: d.checked ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}
