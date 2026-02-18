"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Sprout, Heart, BarChart3, Lightbulb, Brain, CheckCircle2, Bell } from "lucide-react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import MarkdownContent from "@/components/garden/markdown-content";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { SparklesText } from "@/components/magicui/sparkles-text";
import { BentoGrid, BentoGridItem } from "@/components/aceternity/bento-grid";
import { cn } from "@/lib/utils";

interface HomeData {
  displayName: string;
  createdAt: string;
  memoriesCount: number;
  recentMemories: Array<{ id: string; content: string; message_type: string; created_at: string }>;
  pendingTasks: number;
  upcomingReminders: number;
  flashback: { content: string; created_at: string } | null;
  recentMood: string | null;
  peopleCount: number;
  habitsCount: number;
}

const MOOD_TW: Record<string, string> = {
  positive: "text-mood-good", good: "text-mood-good", great: "text-mood-great",
  happy: "text-mood-great", calm: "text-mood-good", motivated: "text-mood-good",
  neutral: "text-mood-okay", okay: "text-mood-okay", fine: "text-mood-okay",
  low: "text-mood-low", tired: "text-mood-low", anxious: "text-mood-low",
  stressed: "text-mood-low", bad: "text-mood-bad", sad: "text-mood-bad",
};

const MOOD_BG_TW: Record<string, string> = {
  positive: "bg-mood-good", good: "bg-mood-good", great: "bg-mood-great",
  happy: "bg-mood-great", calm: "bg-mood-good", motivated: "bg-mood-good",
  neutral: "bg-mood-okay", okay: "bg-mood-okay", fine: "bg-mood-okay",
  low: "bg-mood-low", tired: "bg-mood-low", anxious: "bg-mood-low",
  stressed: "bg-mood-low", bad: "bg-mood-bad", sad: "bg-mood-bad",
};

const STAT_COLORS = ["text-primary", "text-accent", "text-muted-foreground", "text-muted-foreground"] as const;

export default function GardenHome() {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());

  const loadHomeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await cachedFetch<HomeData>("/api/garden/home");
      if (!isHomeData(payload)) {
        throw new Error("Received unexpected home data shape");
      }
      setData(payload);
    } catch (err) {
      setData(null);
      const message = err instanceof Error && err.message ? err.message : "Could not load your dashboard";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Single consolidated API call — replaces 6 separate requests
  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  const today = new Date(now);
  const todayFormatted = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const memberDays = data?.createdAt ? Math.max(1, Math.floor((now - new Date(data.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 0;

  if (loading) return <LoadingSkeleton />;
  if (!data) return <HomeLoadError message={error} onRetry={loadHomeData} />;

  const displayName = data.displayName || "friend";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const moodKey = data.recentMood?.toLowerCase() ?? "";
  const moodTwColor = MOOD_TW[moodKey] ?? "text-mood-okay";
  const moodBgTwColor = MOOD_BG_TW[moodKey] ?? "bg-border";

  const stats = [
    { value: data.memoriesCount, label: "memories", href: "/garden/journal" },
    { value: data.pendingTasks, label: "tasks pending", href: "/garden/tasks" },
    { value: data.peopleCount, label: "people", href: "/garden/people" },
    { value: memberDays, label: "days together" },
  ] as const;

  const quickLinks = [
    { href: "/garden/mood", icon: <Heart className="size-5 text-mood-good" />, label: "Mood Patterns", description: "Your emotional journey" },
    { href: "/garden/habits", icon: <BarChart3 className="size-5 text-primary" />, label: "Habits", description: "Streaks and progress" },
    { href: "/garden/insights", icon: <Lightbulb className="size-5 text-mood-okay" />, label: "Insights", description: "Weekly reflections" },
    { href: "/garden/profile", icon: <Brain className="size-5 text-accent" />, label: "Profile", description: "What Groot knows" },
  ] as const;

  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      {/* Greeting Hero */}
      <header className="pt-4">
        <p className="text-xs uppercase tracking-widest mb-3 text-muted-foreground">
          {todayFormatted}
        </p>
        <h1 className="text-[clamp(1.75rem,5vw,2.25rem)] font-bold tracking-tight leading-tight text-foreground">
          {greeting},{" "}
          <SparklesText className="inline-block">{displayName}</SparklesText>
        </h1>
        {data.recentMood && (
          <div className="flex items-center gap-2 mt-3">
            <div className={cn("w-2.5 h-2.5 rounded-full", moodBgTwColor)} />
            <p className="text-sm text-muted-foreground">
              Feeling <span className={cn("font-semibold", moodTwColor)}>{data.recentMood}</span> lately
            </p>
          </div>
        )}
        <Separator className="mt-5" />
      </header>

      {/* Search Bar */}
      <form action="/garden/journal" method="get">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            name="q"
            type="text"
            placeholder="Search your memories..."
            className="pl-10"
          />
        </div>
      </form>

      {/* Life at a Glance */}
      <section>
        <SectionLabel text="Life at a Glance" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s, i) => {
            const colorClass = STAT_COLORS[i] ?? "text-muted-foreground";
            return (
              <div key={s.label}>
                <StatCard value={s.value} label={s.label} href={"href" in s ? s.href : undefined} colorClass={colorClass} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Today's Focus */}
      {(data.pendingTasks > 0 || data.upcomingReminders > 0) && (
        <section>
          <SectionLabel text="Today's Focus" />
          <Card className="border-l-4 border-l-accent">
            <CardContent className="space-y-2">
              {data.pendingTasks > 0 && (
                <a href="/garden/tasks" className="flex items-center gap-3 group">
                  <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                    <CheckCircle2 className="size-3 text-accent" />
                  </span>
                  <span className="text-sm text-foreground group-hover:underline">
                    {data.pendingTasks} task{data.pendingTasks !== 1 ? "s" : ""} waiting for you
                  </span>
                </a>
              )}
              {data.upcomingReminders > 0 && (
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                    <Bell className="size-3 text-primary" />
                  </span>
                  <span className="text-sm text-foreground">
                    {data.upcomingReminders} reminder{data.upcomingReminders !== 1 ? "s" : ""} coming up
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Flashback */}
      {data.flashback && (
        <section>
          <SectionLabel text="30 Days Ago" />
          <Card>
            <CardContent>
              <MarkdownContent content={data.flashback.content} truncate={250} />
              <p className="text-[11px] mt-3 text-muted-foreground">
                {new Date(data.flashback.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <SectionLabel text="Recent Entries" />
          <a href="/garden/journal" className="text-xs underline text-primary">
            View all &rarr;
          </a>
        </div>

        {data.recentMemories.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent className="flex flex-col items-center">
              <Sprout className="size-10 text-muted-foreground mb-3" />
              <p className="font-semibold text-base mb-1 text-foreground">
                Your Garden is ready to grow
              </p>
              <p className="text-sm text-muted-foreground">
                Start talking to Groot on WhatsApp — your memories will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative pl-5">
            {/* Vertical timeline line */}
            <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-border" />

            <div className="space-y-3">
              {data.recentMemories.map((m) => {
                const time = new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                const typeLabel = m.message_type === "audio" ? "Voice" : m.message_type === "image" ? "Photo" : "Text";
                const wordCount = m.content?.split(/\s+/).length ?? 0;

                return (
                  <div key={m.id}>
                    <Card>
                      <CardContent>
                        <MarkdownContent content={m.content} truncate={180} />

                        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-dashed border-border opacity-60">
                          <span className="text-[11px] text-muted-foreground">{time}</span>
                          <span className="text-[11px] text-muted-foreground">{typeLabel}</span>
                          {wordCount > 0 && (
                            <span className="text-[11px] text-muted-foreground">{wordCount} words</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Quick Navigation */}
      <section>
        <SectionLabel text="Explore" />
        <BentoGrid className="md:grid-cols-2 lg:grid-cols-2">
          {quickLinks.map((link) => (
            <a key={link.href} href={link.href} className="block">
              <BentoGridItem
                title={link.label}
                description={link.description}
                icon={link.icon}
              />
            </a>
          ))}
        </BentoGrid>
      </section>
    </div>
  );
}

/* Sub-components */

function isHomeData(value: unknown): value is HomeData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<HomeData>;
  return (
    typeof data.displayName === "string" &&
    typeof data.createdAt === "string" &&
    typeof data.memoriesCount === "number" &&
    Array.isArray(data.recentMemories) &&
    typeof data.pendingTasks === "number" &&
    typeof data.upcomingReminders === "number" &&
    typeof data.peopleCount === "number" &&
    typeof data.habitsCount === "number"
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <h2 className="text-xs uppercase tracking-widest mb-3 font-semibold text-muted-foreground">
      {text}
    </h2>
  );
}

function StatCard({ value, label, href, colorClass }: { value: number; label: string; href?: string; colorClass: string }) {
  const inner = (
    <Card className="text-center hover:shadow-md transition-shadow">
      <CardContent className="py-4 px-3">
        <NumberTicker
          value={value}
          className={cn("text-2xl font-bold tracking-tight", colorClass)}
        />
        <p className="text-[11px] mt-1 uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </CardContent>
    </Card>
  );

  if (href) {
    return <a href={href} className="block hover:scale-[1.02] transition-transform">{inner}</a>;
  }
  return inner;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="pt-4">
        <Skeleton className="h-3 w-40 mb-3" />
        <Skeleton className="h-10 w-64" />
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

function HomeLoadError({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <Card className="max-w-3xl mx-auto mt-6">
      <CardContent className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Couldn&apos;t load your Garden home</h2>
        <p className="text-sm text-muted-foreground">
          {message ?? "Something went wrong while loading your dashboard."}
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={onRetry} size="sm">
            Retry
          </Button>
          <a href="/garden/journal" className="text-sm text-primary underline">
            Open Journal
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
