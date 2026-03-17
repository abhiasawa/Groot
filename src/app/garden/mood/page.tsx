"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Heart, Lightbulb, BarChart3, Sparkles } from "lucide-react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { cn } from "@/lib/utils";

const ResponsiveLine = dynamic(
  () => import("@nivo/line").then((m) => m.ResponsiveLine),
  { ssr: false }
);

const ResponsiveCalendar = dynamic(
  () => import("@nivo/calendar").then((m) => m.ResponsiveCalendar),
  { ssr: false }
);

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

const MOOD_TW_BG: Record<number, string> = {
  5: "bg-mood-great",
  4: "bg-mood-good",
  3: "bg-mood-okay",
  2: "bg-mood-low",
  1: "bg-mood-bad",
  0: "bg-mood-none",
};

const MOOD_TW_TEXT: Record<number, string> = {
  5: "text-mood-great",
  4: "text-mood-good",
  3: "text-mood-okay",
  2: "text-mood-low",
  1: "text-mood-bad",
};

const CALENDAR_COLORS = ["#E3E2E0", "#E03E3E", "#D9730D", "#CB912F", "#448361", "#0F7B6C"];

export default function MoodPage() {
  const [dailyMoods, setDailyMoods] = useState<DailyMood[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [recentMood, setRecentMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [year] = useState(new Date().getFullYear());

  useEffect(() => {
    cachedFetch<{ dailyMoods?: DailyMood[]; weeklyTrend?: WeeklyTrend[]; recentMood?: string }>(`/api/mood?year=${year}`)
      .then((data) => {
        setDailyMoods(data.dailyMoods ?? []);
        setWeeklyTrend(data.weeklyTrend ?? []);
        setRecentMood(data.recentMood ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <LoadingSkeleton />;

  // Calculate mood distribution
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const d of dailyMoods) {
    distribution[d.score] = (distribution[d.score] ?? 0) + 1;
  }
  const totalMoodDays = dailyMoods.length || 1;

  // Calculate current mood streak
  const streakMood = recentMood;
  let streakCount = 0;
  const sortedDays = [...dailyMoods].sort((a, b) => b.date.localeCompare(a.date));
  if (sortedDays.length > 0) {
    const firstScore = sortedDays[0]!.score;
    for (const d of sortedDays) {
      if (d.score === firstScore) streakCount++;
      else break;
    }
  }

  // Nivo line chart data
  const lineData = [
    {
      id: "mood",
      data: weeklyTrend.map((w) => ({
        x: w.weekStart,
        y: w.avgScore,
      })),
    },
  ];

  // Nivo calendar data
  const calendarData = dailyMoods.map((d) => ({
    day: d.date,
    value: d.score,
  }));

  const firstDay = `${year}-01-01`;
  const lastDay = `${year}-12-31`;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader title="Mood" subtitle="How you've been feeling" />

      {/* Sub-navigation */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {([
          { href: "/garden/insights", label: "Reports", icon: Lightbulb },
          { href: "/garden/mood", label: "Mood", icon: Heart },
          { href: "/garden/habits", label: "Habits", icon: BarChart3 },
          { href: "/garden/stories", label: "Stories", icon: Sparkles },
        ] as const).map((item) => {
          const isActive = item.href === "/garden/mood";
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {dailyMoods.length === 0 ? (
        <Card className="text-center py-10">
          <CardContent className="flex flex-col items-center">
            <Heart className="size-10 text-muted-foreground mb-3" />
            <p className="font-semibold text-base mb-1 text-foreground">No mood data yet</p>
            <p className="text-sm text-muted-foreground">
              Keep talking to Groot — your mood patterns will emerge over time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Current Streak */}
          {streakMood && streakCount > 0 && (
            <Card>
              <CardContent className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  You&apos;ve been feeling{" "}
                  <span className="font-semibold text-primary">{streakMood}</span>{" "}
                  for{" "}
                  <NumberTicker value={streakCount} className="font-semibold text-foreground text-sm" />{" "}
                  day{streakCount !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Year in Pixels — Nivo Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Year in Pixels — {year}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full">
                <ResponsiveCalendar
                  data={calendarData}
                  from={firstDay}
                  to={lastDay}
                  emptyColor="#E3E2E080"
                  colors={CALENDAR_COLORS.slice(1)}
                  minValue={1}
                  maxValue={5}
                  margin={{ top: 20, right: 20, bottom: 0, left: 20 }}
                  yearSpacing={40}
                  monthBorderColor="transparent"
                  dayBorderWidth={2}
                  dayBorderColor="transparent"
                  tooltip={({ day, value }) => (
                    <div className="rounded-md bg-card border border-border px-3 py-1.5 text-xs shadow-md">
                      <span className="text-foreground font-medium">{day}</span>
                      {value !== undefined && (
                        <span className="text-muted-foreground ml-2">
                          {MOOD_LABELS[Number(value)] ?? "No data"}
                        </span>
                      )}
                    </div>
                  )}
                />
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 justify-center">
                {([1, 2, 3, 4, 5] as const).map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={cn("w-3 h-3 rounded-sm", MOOD_TW_BG[s])} />
                    <span className="text-[10px] text-muted-foreground">{MOOD_LABELS[s]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mood Trend — Nivo Line Chart */}
          {weeklyTrend.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Mood Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveLine
                    data={lineData}
                    margin={{ top: 10, right: 20, bottom: 30, left: 50 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: 1, max: 5, stacked: false }}
                    curve="monotoneX"
                    enableArea={true}
                    areaOpacity={0.15}
                    colors={["#2383E2"]}
                    lineWidth={2}
                    pointSize={6}
                    pointColor="#2383E2"
                    pointBorderWidth={2}
                    pointBorderColor={{ from: "serieColor" }}
                    enableGridX={false}
                    gridYValues={[1, 2, 3, 4, 5]}
                    axisBottom={{
                      tickSize: 0,
                      tickPadding: 8,
                      format: (v: string) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      },
                    }}
                    axisLeft={{
                      tickSize: 0,
                      tickPadding: 8,
                      tickValues: [1, 2, 3, 4, 5],
                      format: (v: number) => MOOD_LABELS[v] ?? "",
                    }}
                    tooltip={({ point }) => (
                      <div className="rounded-md bg-card border border-border px-3 py-1.5 text-xs shadow-md">
                        <span className="text-foreground font-medium">
                          {MOOD_LABELS[Math.round(point.data.y as number)] ?? String(point.data.y)}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(String(point.data.x)).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    )}
                    theme={{
                      axis: {
                        ticks: {
                          text: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                        },
                      },
                      grid: {
                        line: { stroke: "hsl(var(--border))", strokeWidth: 1 },
                      },
                    }}
                    defs={[
                      {
                        id: "gradientArea",
                        type: "linearGradient",
                        colors: [
                          { offset: 0, color: "#2383E2", opacity: 0.3 },
                          { offset: 100, color: "#2383E2", opacity: 0 },
                        ],
                      },
                    ]}
                    fill={[{ match: { id: "mood" }, id: "gradientArea" }]}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mood Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Mood Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {([5, 4, 3, 2, 1] as const).map((score) => {
                const count = distribution[score] ?? 0;
                const pct = Math.round((count / totalMoodDays) * 100);
                return (
                  <div key={score} className="flex items-center gap-3">
                    <span className="text-xs w-10 text-right text-muted-foreground">{MOOD_LABELS[score]}</span>
                    <div className="flex-1 h-5 rounded-full overflow-hidden bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", MOOD_TW_BG[score])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs w-8 text-muted-foreground">{pct}%</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
