"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useCurrentUser } from "@/hooks/use-current-user";
import PageHeader from "@/components/garden/page-header";
import DiaryCard from "@/components/garden/diary-card";

const AreaChart = dynamic(() => import("recharts").then((m) => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((m) => m.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

interface DailyMood {
  date: string;
  mood: string;
  score: number;
}

interface WeeklyTrend {
  weekStart: string;
  avgScore: number;
}

const MOOD_LABELS: Record<number, string> = { 5: "Great", 4: "Good", 3: "Okay", 2: "Low", 1: "Bad" };
const MOOD_COLORS: Record<number, string> = {
  5: "var(--color-mood-great)",
  4: "var(--color-mood-good)",
  3: "var(--color-mood-okay)",
  2: "var(--color-mood-low)",
  1: "var(--color-mood-bad)",
  0: "var(--color-mood-none)",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function MoodPage() {
  const { user } = useCurrentUser();
  const [dailyMoods, setDailyMoods] = useState<DailyMood[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [recentMood, setRecentMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [year] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!user) return;
    fetch(`/api/mood?year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        setDailyMoods(data.dailyMoods ?? []);
        setWeeklyTrend(data.weeklyTrend ?? []);
        setRecentMood(data.recentMood ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, year]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-32 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        <div className="h-64 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
      </div>
    );
  }

  // Build mood map for year-in-pixels
  const moodMap = new Map(dailyMoods.map((d) => [d.date, d]));

  // Calculate mood distribution
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const d of dailyMoods) {
    distribution[d.score] = (distribution[d.score] ?? 0) + 1;
  }
  const totalMoodDays = dailyMoods.length || 1;

  // Calculate current mood streak
  let streakMood = recentMood;
  let streakCount = 0;
  const sortedDays = [...dailyMoods].sort((a, b) => b.date.localeCompare(a.date));
  if (sortedDays.length > 0) {
    const firstScore = sortedDays[0]!.score;
    for (const d of sortedDays) {
      if (d.score === firstScore) streakCount++;
      else break;
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Mood" subtitle="How you've been feeling" />

      {dailyMoods.length === 0 ? (
        <DiaryCard variant="paper" className="text-center">
          <span className="text-3xl block mb-2">🎭</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>No mood data yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Keep talking to Groot — your mood patterns will emerge over time.
          </p>
        </DiaryCard>
      ) : (
        <>
          {/* Current Streak */}
          {streakMood && streakCount > 0 && (
            <DiaryCard variant="paper">
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                You&apos;ve been feeling{" "}
                <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>{streakMood}</span>{" "}
                for <span style={{ fontWeight: 600 }}>{streakCount}</span> day{streakCount !== 1 ? "s" : ""}
              </p>
            </DiaryCard>
          )}

          {/* Year in Pixels */}
          <DiaryCard>
            <h2 className="text-base font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
              Year in Pixels — {year}
            </h2>
            <div className="overflow-x-auto">
              <div style={{ minWidth: "520px" }}>
                {/* Month headers */}
                <div className="grid gap-0.5 mb-1" style={{ gridTemplateColumns: "24px repeat(12, 1fr)" }}>
                  <div />
                  {MONTHS.map((m) => (
                    <div key={m} className="text-[9px] text-center" style={{ color: "var(--color-text-secondary)" }}>{m}</div>
                  ))}
                </div>
                {/* Day rows */}
                {Array.from({ length: 31 }, (_, dayIdx) => (
                  <div key={dayIdx} className="grid gap-0.5" style={{ gridTemplateColumns: "24px repeat(12, 1fr)" }}>
                    <div className="text-[9px] text-right pr-1 leading-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                      {dayIdx + 1}
                    </div>
                    {Array.from({ length: 12 }, (_, monthIdx) => {
                      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
                      const day = dayIdx + 1;
                      if (day > daysInMonth) return <div key={monthIdx} />;
                      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const mood = moodMap.get(dateStr);
                      const score = mood?.score ?? 0;
                      return (
                        <div
                          key={monthIdx}
                          title={mood ? `${dateStr}: ${mood.mood}` : dateStr}
                          className="rounded-sm"
                          style={{
                            backgroundColor: MOOD_COLORS[score],
                            height: "12px",
                            opacity: score === 0 ? 0.3 : 1,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 justify-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: MOOD_COLORS[s] }} />
                  <span className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>{MOOD_LABELS[s]}</span>
                </div>
              ))}
            </div>
          </DiaryCard>

          {/* Mood Trend Chart */}
          {weeklyTrend.length > 1 && (
            <DiaryCard>
              <h2 className="text-base font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
                Mood Trend
              </h2>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <AreaChart data={weeklyTrend}>
                    <defs>
                      <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2D5F3B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2D5F3B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="weekStart"
                      tickFormatter={(v: string) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }}
                      tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tickFormatter={(v: number) => MOOD_LABELS[v] ?? ""}
                      tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value) => [MOOD_LABELS[Math.round(value as number)] ?? value, "Mood"]}
                      labelFormatter={(label) => new Date(String(label)).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    />
                    <Area type="monotone" dataKey="avgScore" stroke="#2D5F3B" fill="url(#moodGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </DiaryCard>
          )}

          {/* Mood Distribution */}
          <DiaryCard>
            <h2 className="text-base font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
              Mood Distribution
            </h2>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((score) => {
                const count = distribution[score] ?? 0;
                const pct = Math.round((count / totalMoodDays) * 100);
                return (
                  <div key={score} className="flex items-center gap-3">
                    <span className="text-xs w-10 text-right" style={{ color: "var(--color-text-secondary)" }}>{MOOD_LABELS[score]}</span>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: MOOD_COLORS[score] }} />
                    </div>
                    <span className="text-xs w-8" style={{ color: "var(--color-text-secondary)" }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </DiaryCard>
        </>
      )}
    </div>
  );
}
