"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Search, BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import MarkdownContent from "@/components/garden/markdown-content";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Memory {
  id: string;
  content: string;
  media_description?: string;
  message_type: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const FILTERS = ["All", "Notes", "Voice", "Images"] as const;
const TYPE_MAP: Record<string, string> = { Notes: "text", Voice: "audio", Images: "image" };

const MOOD_TW_BG: Record<number, string> = {
  5: "border-l-mood-great",
  4: "border-l-mood-good",
  3: "border-l-mood-okay",
  2: "border-l-mood-low",
  1: "border-l-mood-bad",
};

const MOOD_TW_DOT: Record<number, string> = {
  5: "bg-mood-great",
  4: "bg-mood-good",
  3: "bg-mood-okay",
  2: "bg-mood-low",
  1: "bg-mood-bad",
};

const MOOD_TW_TEXT: Record<number, string> = {
  5: "text-mood-great",
  4: "text-mood-good",
  3: "text-mood-okay",
  2: "text-mood-low",
  1: "text-mood-bad",
};

const MOOD_TW_TIMELINE: Record<number, string> = {
  5: "bg-mood-great",
  4: "bg-mood-good",
  3: "bg-mood-okay",
  2: "bg-mood-low",
  1: "bg-mood-bad",
};

export default function JournalPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <JournalContent />
    </Suspense>
  );
}

function JournalContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [memories, setMemories] = useState<Memory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarDots, setCalendarDots] = useState<Set<string>>(new Set());
  const [moodMap, setMoodMap] = useState<Map<string, number>>(new Map());

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (searchQuery) params.set("q", searchQuery);
    if (activeFilter !== "All" && TYPE_MAP[activeFilter]) params.set("type", TYPE_MAP[activeFilter]!);
    if (selectedDate) params.set("date", selectedDate);

    try {
      const res = await fetch(`/api/memories?${params}`);
      const data = await res.json();
      setMemories(data.memories ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setMemories([]);
    }
    setLoading(false);
  }, [searchQuery, activeFilter, selectedDate]);

  // Fetch calendar dots + mood data when month changes
  useEffect(() => {
    const year = calendarMonth.getFullYear();
    const month = String(calendarMonth.getMonth() + 1).padStart(2, "0");
    cachedFetch<{ dates?: string[] }>(`/api/memories?month=${year}-${month}`)
      .then((data) => setCalendarDots(new Set(data.dates ?? [])))
      .catch(() => setCalendarDots(new Set()));
    cachedFetch<{ dailyMoods?: Array<{ date: string; score: number }> }>(`/api/mood?year=${year}`)
      .then((data) => {
        const map = new Map<string, number>();
        for (const d of data.dailyMoods ?? []) map.set(d.date, d.score);
        setMoodMap(map);
      })
      .catch(() => setMoodMap(new Map()));
  }, [calendarMonth]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  // Group memories by date for timeline
  const grouped = useMemo(() => groupByDate(memories), [memories]);

  // Today's summary data
  const todayStr = new Date().toISOString().split("T")[0]!;
  const todayEntries = memories.filter((m) => m.created_at.startsWith(todayStr));
  const todayMood = moodMap.get(todayStr);
  const todayWordCount = todayEntries.reduce((sum, m) => sum + (m.content?.split(/\s+/).length ?? 0), 0);

  // Helper to get mood Tailwind class for a date string
  const getMoodBorderClass = (dateKey: string): string => {
    const score = moodMap.get(dateKey);
    if (!score) return "border-l-border";
    return MOOD_TW_BG[score] ?? "border-l-border";
  };

  const getMoodTimelineClass = (dateKey: string): string => {
    const score = moodMap.get(dateKey);
    if (!score) return "bg-border";
    return MOOD_TW_TIMELINE[score] ?? "bg-border";
  };

  const isDefaultView = viewMode === "timeline" && !searchQuery && !selectedDate;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header row with view toggle */}
      <div className="flex items-center justify-between">
        <PageHeader title="Journal" subtitle={total > 0 ? `${total} entries` : "Your conversation diary"} />
        <Tabs
          value={viewMode}
          onValueChange={(v) => { setViewMode(v as "timeline" | "calendar"); setSelectedDate(null); }}
        >
          <TabsList>
            <TabsTrigger value="timeline" className="text-xs capitalize">Timeline</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs capitalize">Calendar</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Today Summary Card */}
      {isDefaultView && todayEntries.length > 0 && (
        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-1 text-muted-foreground">
                  {new Date().toLocaleDateString("en-US", { weekday: "long" })}
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                </h2>
              </div>
              {todayMood && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
                  <div className={cn("w-2.5 h-2.5 rounded-full", MOOD_TW_DOT[todayMood] ?? "bg-border")} />
                  <span className={cn("text-xs font-medium", MOOD_TW_TEXT[todayMood] ?? "text-muted-foreground")}>
                    {moodLabel(todayMood)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{todayEntries.length} {todayEntries.length === 1 ? "entry" : "entries"} today</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{todayEntries.filter(e => e.message_type === "audio").length} voice</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{todayWordCount} words</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + Filters */}
      <div className="sticky top-0 z-10 py-2 bg-background">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your journal..."
            className="pl-10 pr-16"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Badge
              key={f}
              variant={activeFilter === f ? "default" : "secondary"}
              className="cursor-pointer select-none"
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </Badge>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <CalendarGrid
          month={calendarMonth}
          dots={calendarDots}
          moods={moodMap}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d === selectedDate ? null : d)}
          onChangeMonth={setCalendarMonth}
        />
      )}

      {/* Selected date indicator */}
      {selectedDate && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <button onClick={() => setSelectedDate(null)} className="text-xs underline text-primary">
            Clear
          </button>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center">
            <BookOpen className="size-10 text-muted-foreground mb-3" />
            <p className="font-semibold text-lg mb-1 text-foreground">
              {searchQuery ? "No entries found" : "Your journal is waiting"}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try a different search term." : "Start talking to Groot on WhatsApp — your journal will fill up naturally."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...grouped.entries()].map(([dateLabel, entries]) => {
            // Find the YYYY-MM-DD for this group to look up mood
            const firstEntry = entries[0]!;
            const dateKey = firstEntry.created_at.split("T")[0]!;
            const timelineColorClass = getMoodTimelineClass(dateKey);
            const borderClass = getMoodBorderClass(dateKey);

            return (
              <div key={dateLabel}>
                {/* Decorative date separator */}
                <h3 className="my-4 first:mt-0 text-sm font-semibold text-muted-foreground">
                  {dateLabel}
                </h3>

                {/* Mood-tinted timeline with left border */}
                <div className="relative pl-5">
                  <div
                    className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-60", timelineColorClass)}
                  />

                  <div className="space-y-3">
                    {entries.map((m) => (
                      <Card
                        key={m.id}
                        className={cn("border-l-[3px]", borderClass)}
                      >
                        <CardContent>
                          <MarkdownContent content={m.content || m.media_description || ""} />

                          {m.content && m.media_description && (
                            <p className="text-xs mt-2 italic text-muted-foreground">
                              {m.media_description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-dashed border-border opacity-70 flex-wrap">
                            <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                              {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                            <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                              {m.message_type === "audio" ? "Voice note" : m.message_type === "image" ? "Photo" : "Text"}
                            </span>
                            {m.message_type === "text" && m.content && (
                              <span className="text-[11px] text-muted-foreground">
                                {m.content.split(/\s+/).length} words
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helpers

function groupByDate(memories: Memory[]): Map<string, Memory[]> {
  const groups = new Map<string, Memory[]>();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const m of memories) {
    const d = new Date(m.created_at);
    const ds = d.toDateString();
    let label: string;
    if (ds === today) label = "Today";
    else if (ds === yesterday) label = "Yesterday";
    else label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(m);
  }
  return groups;
}

function moodLabel(score: number | undefined): string {
  if (!score) return "";
  const labels: Record<number, string> = { 5: "Great", 4: "Good", 3: "Okay", 2: "Low", 1: "Bad" };
  return labels[score] ?? "";
}

// Mood-colored Calendar

const CALENDAR_MOOD_DOT: Record<number, string> = {
  5: "bg-mood-great",
  4: "bg-mood-good",
  3: "bg-mood-okay",
  2: "bg-mood-low",
  1: "bg-mood-bad",
};

function CalendarGrid({
  month,
  dots,
  moods,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: {
  month: Date;
  dots: Set<string>;
  moods: Map<string, number>;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
  onChangeMonth: (d: Date) => void;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const cells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  const prevMonth = () => onChangeMonth(new Date(year, m - 1, 1));
  const nextMonth = () => onChangeMonth(new Date(year, m + 1, 1));

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="font-semibold text-lg text-foreground">
            {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-[10px] py-1 font-medium text-muted-foreground">{d}</div>
          ))}
          {cells.map((cell, i) => {
            const hasMood = cell ? moods.has(cell.dateStr) : false;
            const moodScore = cell ? moods.get(cell.dateStr) : undefined;
            const hasEntries = cell ? dots.has(cell.dateStr) : false;
            const isSelected = cell?.dateStr === selectedDate;
            const isToday = cell?.dateStr === todayStr;

            return (
              <button
                key={i}
                disabled={!cell}
                onClick={() => cell && onSelectDate(cell.dateStr)}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-lg text-xs relative transition-all",
                  !cell && "text-transparent cursor-default",
                  cell && !isSelected && !isToday && "text-foreground",
                  isSelected && "bg-primary text-primary-foreground",
                  isToday && !isSelected && "text-primary font-bold border-2 border-primary",
                  cell && !isSelected && !isToday && "border-2 border-transparent",
                )}
              >
                {cell?.day}
                {/* Mood-colored dot for days with entries */}
                {cell && hasEntries && !isSelected && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 w-1.5 h-1.5 rounded-full",
                      hasMood && moodScore ? (CALENDAR_MOOD_DOT[moodScore] ?? "bg-primary") : "bg-primary",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Mood legend */}
        <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-border">
          {([
            [5, "Great"],
            [4, "Good"],
            [3, "Okay"],
            [2, "Low"],
            [1, "Bad"],
          ] as const).map(([score, label]) => (
            <div key={score} className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", CALENDAR_MOOD_DOT[score])} />
              <span className="text-[9px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Skeleton className="h-8 w-32" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}
