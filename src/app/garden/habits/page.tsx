"use client";

import { useEffect, useState } from "react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { NumberTicker } from "@/components/magicui/number-ticker";
import Link from "next/link";
import { BarChart3, Lightbulb, Heart, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cachedFetch<{ habits: Habit[] }>("/api/habits?include=checkins")
      .then((data) => setHabits(data.habits ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-24" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
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

      {/* Sub-navigation */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {([
          { href: "/garden/insights", label: "Reports", icon: Lightbulb },
          { href: "/garden/mood", label: "Mood", icon: Heart },
          { href: "/garden/habits", label: "Habits", icon: BarChart3 },
          { href: "/garden/stories", label: "Stories", icon: Sparkles },
        ] as const).map((item) => {
          const isActive = item.href === "/garden/habits";
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

      {habits.length === 0 ? (
        <Card className="text-center py-10">
          <CardContent className="flex flex-col items-center gap-3">
            <BarChart3 className="size-10 text-muted-foreground" />
            <p className="font-medium text-base text-foreground">
              No habits tracked yet
            </p>
            <p className="text-sm text-muted-foreground">
              Tell Groot to track a habit — &quot;Track my weight daily&quot; or &quot;I want to read 30 pages a day&quot;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary stats strip */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="py-4">
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-primary">
                  <NumberTicker value={habits.length} />
                </p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  habits
                </p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-accent-foreground">
                  <NumberTicker value={totalStreakDays} />
                </p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  active streak days
                </p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  <NumberTicker value={bestStreak} />
                </p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  best streak
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Habit cards grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {habits.map((h) => (
              <motion.div key={h.id} variants={itemVariants}>
                <Card className="h-full">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-sm">{h.name}</CardTitle>
                    <Badge variant="secondary" className="text-[9px] uppercase tracking-wide">
                      {h.category}
                    </Badge>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Streaks */}
                    <div className="flex gap-6">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          <NumberTicker value={h.current_streak} />
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Current
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-muted-foreground">
                          {h.longest_streak}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Best
                        </p>
                      </div>
                      {(h.target_value != null || h.target_unit) && (
                        <div>
                          <p className="text-2xl font-bold text-accent-foreground">
                            {h.target_value ?? "—"}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {h.target_unit ? `${h.target_unit}/day` : "target"}
                          </p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* 30-day heatmap */}
                    <HabitHeatmap checkins={h.recentCheckins ?? []} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
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

  const checkedCount = days.filter((d) => d.checked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Last 30 days
        </p>
        <p className="text-[10px] text-muted-foreground">
          {checkedCount}/30
        </p>
      </div>
      <div className="flex gap-[3px] flex-wrap">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.checked ? "Done" : "Missed"}`}
            className={cn(
              "size-[9px] rounded-sm transition-all",
              d.checked ? "bg-primary" : "bg-border opacity-30"
            )}
          />
        ))}
      </div>
    </div>
  );
}
