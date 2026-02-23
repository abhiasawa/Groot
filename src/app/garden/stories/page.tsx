"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Sparkles, Flame, TrendingUp, Tag, BookHeart } from "lucide-react";
import PageHeader from "@/components/garden/page-header";
import { EmptyState } from "@/components/garden/empty-state";
import MarkdownContent from "@/components/garden/markdown-content";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

interface Story {
  id: string;
  content: string;
  media_description?: string;
  message_type: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface StoryStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
  streak: number;
  topTags: Array<{ tag: string; count: number }>;
}

/* ─── Mood color maps (reuse from journal) ─── */

const MOOD_BORDER: Record<string, string> = {
  happy: "border-l-mood-great",
  excited: "border-l-mood-great",
  good: "border-l-mood-good",
  calm: "border-l-mood-good",
  neutral: "border-l-mood-okay",
  tired: "border-l-mood-low",
  stressed: "border-l-mood-low",
  sad: "border-l-mood-bad",
  anxious: "border-l-mood-bad",
};

const MOOD_DOT: Record<string, string> = {
  happy: "bg-mood-great",
  excited: "bg-mood-great",
  good: "bg-mood-good",
  calm: "bg-mood-good",
  neutral: "bg-mood-okay",
  tired: "bg-mood-low",
  stressed: "bg-mood-low",
  sad: "bg-mood-bad",
  anxious: "bg-mood-bad",
};

/* ─── Storyworthy prompts for empty today state ─── */

const TODAY_PROMPTS = [
  "What's one moment from today you'd actually tell someone about?",
  "Was there a moment today where something clicked — or shifted?",
  "Any small thing happen today that felt surprisingly meaningful?",
  "What stuck with you today?",
  "If today had a title, what would it be?",
];

/* ─── Main Page ─── */

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [stats, setStats] = useState<StoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stories?limit=100");
      const data = await res.json();
      setStories(data.stories ?? []);
    } catch {
      setStories([]);
    }
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/stories?stats=true");
      const data = await res.json();
      setStats(data);
    } catch {
      setStats(null);
    }
    setLoadingStats(false);
  }, []);

  useEffect(() => {
    fetchStories();
    fetchStats();
  }, [fetchStories, fetchStats]);

  const todayStr = new Date().toISOString().split("T")[0]!;
  const todayStories = useMemo(
    () => stories.filter((s) => s.created_at.startsWith(todayStr)),
    [stories, todayStr],
  );

  const grouped = useMemo(() => groupByWeek(stories), [stories]);

  // Random prompt for empty today state
  const todayPrompt = useMemo(
    () => TODAY_PROMPTS[Math.floor(Math.random() * TODAY_PROMPTS.length)]!,
    [],
  );

  if (loading && loadingStats) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="My Stories"
        subtitle="Your storyworthy moments — the scenes that made each day different"
      />

      {/* ─── Stats Strip ─── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Flame className="h-4 w-4 text-orange-500" />}
            label="Streak"
            value={stats.streak > 0 ? `${stats.streak}-day` : "—"}
          />
          <StatCard
            icon={<BookHeart className="h-4 w-4 text-primary" />}
            label="Total stories"
            value={String(stats.total)}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4 text-mood-good" />}
            label="This month"
            value={String(stats.thisMonth)}
            trend={stats.lastMonth > 0
              ? Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)
              : undefined}
          />
          <StatCard
            icon={<Tag className="h-4 w-4 text-muted-foreground" />}
            label="Top theme"
            value={stats.topTags[0]?.tag ?? "—"}
          />
        </div>
      )}
      {loadingStats && !stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {/* ─── Today's Story Hero ─── */}
      <TodayHero stories={todayStories} prompt={todayPrompt} />

      {/* ─── Top Tags ─── */}
      {stats && stats.topTags.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {stats.topTags.map((t) => (
            <Badge key={t.tag} variant="secondary" className="text-xs">
              {t.tag} <span className="ml-1 text-muted-foreground">({t.count})</span>
            </Badge>
          ))}
        </div>
      )}

      {/* ─── Timeline ─── */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Your story archive is waiting"
          description="Start talking to Groot — share moments, thoughts, and reflections. The storyworthy ones will show up here."
        />
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([weekLabel, weekStories]) => (
            <div key={weekLabel}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">{weekLabel}</h3>
                <span className="text-xs text-muted-foreground">
                  {weekStories.length} {weekStories.length === 1 ? "story" : "stories"}
                </span>
              </div>

              <div className="relative pl-5">
                {/* Timeline line */}
                <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-border opacity-40" />

                <div className="space-y-3">
                  {weekStories.map((story) => {
                    const mood = getMood(story);
                    const tags = getTags(story);
                    const borderClass = mood ? (MOOD_BORDER[mood] ?? "border-l-border") : "border-l-primary/40";
                    const dotClass = mood ? (MOOD_DOT[mood] ?? "bg-border") : "bg-primary/40";

                    return (
                      <Card key={story.id} className={cn("border-l-[3px]", borderClass)}>
                        <CardContent>
                          {/* Mood dot + date */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn("w-2 h-2 rounded-full", dotClass)} />
                            <span className="text-[11px] text-muted-foreground">
                              {formatStoryDate(story.created_at)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {story.message_type === "audio"
                                ? "Voice note"
                                : story.message_type === "image"
                                  ? "Photo"
                                  : "Text"}
                            </span>
                            {mood && (
                              <span className="text-[11px] text-muted-foreground capitalize">
                                {mood}
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <MarkdownContent content={story.content} />

                          {story.media_description && (
                            <p className="text-xs mt-2 italic text-muted-foreground">
                              {story.media_description}
                            </p>
                          )}

                          {/* Tags */}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-dashed border-border">
                              {tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Today Hero Component ─── */

function TodayHero({ stories, prompt }: { stories: Story[]; prompt: string }) {
  if (stories.length === 0) {
    // Empty state — show the prompt
    return (
      <Card className="border-2 border-dashed border-primary/20 bg-primary/[0.02]">
        <CardContent className="py-8 text-center">
          <Sparkles className="h-8 w-8 text-primary/40 mx-auto mb-3" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Today&apos;s Story
          </p>
          <p className="text-lg font-medium text-foreground/80 max-w-md mx-auto leading-relaxed">
            &ldquo;{prompt}&rdquo;
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Send Groot a message — your storyworthy moment will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show the latest story from today
  const latest = stories[0]!;
  const mood = getMood(latest);
  const borderClass = mood ? (MOOD_BORDER[mood] ?? "border-l-primary") : "border-l-primary";

  return (
    <Card className={cn("border-l-[4px]", borderClass)}>
      <CardContent className="py-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Today&apos;s Story
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(latest.created_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>

        <MarkdownContent content={latest.content} />

        {latest.media_description && (
          <p className="text-xs mt-2 italic text-muted-foreground">
            {latest.media_description}
          </p>
        )}

        {stories.length > 1 && (
          <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-dashed border-border">
            +{stories.length - 1} more {stories.length - 1 === 1 ? "moment" : "moments"} today
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Stat Card Component ─── */

function StatCard({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: number;
}) {
  return (
    <Card className="text-center">
      <CardContent className="py-4 px-3">
        <div className="flex items-center justify-center gap-2 mb-1.5">
          {icon}
        </div>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
          {trend !== undefined && trend !== 0 && (
            <span
              className={cn(
                "text-[11px] font-medium",
                trend > 0 ? "text-mood-great" : "text-mood-bad",
              )}
            >
              {trend > 0 ? "+" : ""}
              {trend}%
            </span>
          )}
        </div>
        <p className="text-[11px] mt-1 uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

/* ─── Helpers ─── */

function getMood(story: Story): string | undefined {
  return (story.metadata as Record<string, unknown>)?.detectedMood as string | undefined;
}

function getTags(story: Story): string[] {
  const tags = (story.metadata as Record<string, unknown>)?.memoryTags;
  if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === "string");
  return [];
}

function formatStoryDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);

  if (d.toDateString() === today.toDateString()) {
    return `Today at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupByWeek(stories: Story[]): Map<string, Story[]> {
  const groups = new Map<string, Story[]>();
  const now = new Date();
  const startOfThisWeek = getWeekStart(now);
  const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 86400000);

  for (const story of stories) {
    const d = new Date(story.created_at);
    const weekStart = getWeekStart(d);
    let label: string;

    if (weekStart.getTime() === startOfThisWeek.getTime()) {
      label = "This Week";
    } else if (weekStart.getTime() === startOfLastWeek.getTime()) {
      label = "Last Week";
    } else {
      label = `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(story);
  }

  return groups;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ─── Loading Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}
