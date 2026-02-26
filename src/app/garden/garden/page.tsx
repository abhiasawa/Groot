"use client";

import { useEffect, useState } from "react";
import { Sprout, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DailyMood {
  date: string;
  mood: string;
  score: number;
}

interface Memory {
  id: string;
  content: string;
  created_at: string;
}

const MOOD_COLORS: Record<number, string> = {
  5: "var(--mood-great)",
  4: "var(--mood-good)",
  3: "var(--mood-okay)",
  2: "var(--mood-low)",
  1: "var(--mood-bad)",
};

const MOOD_LABELS: Record<number, string> = {
  5: "Great", 4: "Good", 3: "Okay", 2: "Low", 1: "Bad",
};

const MOOD_BG: Record<number, string> = {
  5: "bg-mood-great",
  4: "bg-mood-good",
  3: "bg-mood-okay",
  2: "bg-mood-low",
  1: "bg-mood-bad",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// SVG Flower components for each mood score
function FlowerGreat({ size = 28, color }: { size?: number; color: string }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 28 28">
      {/* 6-petal full bloom */}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <ellipse key={angle} cx="14" cy="14" rx="4.5" ry="7" fill={color} opacity="0.75"
          transform={`rotate(${angle} 14 14)`} />
      ))}
      <circle cx="14" cy="14" r="3.5" fill="#E9C46A" />
      <circle cx="13.5" cy="13.5" r="1.2" fill="white" opacity="0.3" />
    </svg>
  );
}

function FlowerGood({ size = 28, color }: { size?: number; color: string }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 28 28">
      {/* 5-petal open flower */}
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse key={angle} cx="14" cy="14" rx="4" ry="6.5" fill={color} opacity="0.7"
          transform={`rotate(${angle} 14 14)`} />
      ))}
      <circle cx="14" cy="14" r="3" fill="#E9C46A" opacity="0.9" />
    </svg>
  );
}

function FlowerOkay({ size = 28, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28">
      {/* 3-petal half-open bud */}
      <ellipse cx="14" cy="11" rx="3.5" ry="6" fill={color} opacity="0.7" transform="rotate(-15 14 11)" />
      <ellipse cx="14" cy="11" rx="3.5" ry="6" fill={color} opacity="0.65" transform="rotate(15 14 11)" />
      <ellipse cx="14" cy="12" rx="2.5" ry="4" fill={color} opacity="0.8" />
      <line x1="14" y1="17" x2="14" y2="26" stroke={color} strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

function FlowerLow({ size = 28, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28">
      {/* Drooping flower */}
      <path d="M14 26 Q13 20 12 14" stroke="#8B7355" strokeWidth="1.5" fill="none" opacity="0.6" />
      <g transform="translate(10, 10) rotate(-20)">
        <ellipse cx="2" cy="0" rx="3" ry="4.5" fill={color} opacity="0.6" />
        <ellipse cx="-1" cy="1" rx="2.5" ry="4" fill={color} opacity="0.5" />
        <circle cx="1" cy="1" r="2" fill="#8B7355" opacity="0.7" />
      </g>
    </svg>
  );
}

function FlowerBad({ size = 28, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28">
      {/* Wilted */}
      <path d="M14 26 Q13.5 22 12 16" stroke="#8B7355" strokeWidth="1.5" fill="none" opacity="0.5" />
      <ellipse cx="11" cy="14" rx="3" ry="2" fill={color} opacity="0.45" transform="rotate(-30 11 14)" />
      <ellipse cx="13" cy="13" rx="2" ry="3" fill={color} opacity="0.35" transform="rotate(10 13 13)" />
      {/* Fallen petal */}
      <ellipse cx="17" cy="24" rx="2" ry="1" fill={color} opacity="0.25" transform="rotate(20 17 24)" />
    </svg>
  );
}

function FlowerEmpty({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28">
      <circle cx="14" cy="18" r="2.5" fill="currentColor" opacity="0.12" />
    </svg>
  );
}

function MoodFlower({ score, size = 28 }: { score: number; size?: number }) {
  const color = MOOD_COLORS[score] ?? "#D5D3CB";
  switch (score) {
    case 5: return <FlowerGreat size={size} color={color} />;
    case 4: return <FlowerGood size={size} color={color} />;
    case 3: return <FlowerOkay size={size} color={color} />;
    case 2: return <FlowerLow size={size} color={color} />;
    case 1: return <FlowerBad size={size} color={color} />;
    default: return <FlowerEmpty size={size} />;
  }
}

export default function GardenPage() {
  const [moods, setMoods] = useState<DailyMood[]>([]);
  const [searchResults, setSearchResults] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DailyMood | null>(null);

  // Month navigation
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  useEffect(() => {
    let cancelled = false;
    cachedFetch<{ dailyMoods: DailyMood[] }>(`/api/mood?year=${viewYear}`)
      .then((data) => { if (!cancelled) setMoods(data.dailyMoods ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [viewYear]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      setIsSearching(true);
      cachedFetch<{ memories: Memory[] }>(`/api/memories?q=${encodeURIComponent(searchQuery)}&limit=10`)
        .then((data) => { if (!cancelled) setSearchResults(data.memories ?? []); })
        .finally(() => { if (!cancelled) setIsSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [searchQuery]);

  // Build calendar grid for current month
  const moodMap = new Map(moods.map((m) => [m.date, m]));
  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 0);
  const startDay = monthStart.getDay(); // 0=Sun
  const daysInMonth = monthEnd.getDate();

  const todayStr = now.toLocaleDateString("en-CA");
  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Can't go past current month
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const canGoForward = !isCurrentMonth;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (!canGoForward) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build grid cells
  const cells: Array<{ day: number; dateStr: string; mood: DailyMood | undefined; isToday: boolean } | null> = [];
  for (let i = 0; i < startDay; i++) cells.push(null); // leading blanks
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      day: d,
      dateStr,
      mood: moodMap.get(dateStr),
      isToday: dateStr === todayStr,
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="The Garden" subtitle="Your mood meadow — every day a flower." />
        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 28 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="The Garden" subtitle="Your mood meadow — every day a flower." />

      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">{monthLabel}</h2>
        <button
          onClick={nextMonth}
          disabled={!canGoForward}
          className={cn(
            "p-2 rounded-lg transition-colors",
            canGoForward ? "hover:bg-secondary text-foreground" : "text-muted-foreground/30 cursor-not-allowed",
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Mood Meadow Grid */}
      <Card>
        <CardContent className="pt-4">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Flower grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={`blank-${i}`} />;
              const score = cell.mood?.score ?? 0;
              return (
                <button
                  key={cell.dateStr}
                  onClick={() => cell.mood && setSelectedDay(cell.mood)}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-1 rounded-lg transition-all",
                    cell.mood ? "hover:bg-secondary/50 cursor-pointer" : "cursor-default",
                    cell.isToday && "ring-2 ring-primary/30 ring-offset-1",
                  )}
                >
                  <MoodFlower score={score} size={32} />
                  <span className={cn(
                    "text-[9px] mt-0.5",
                    cell.isToday ? "font-bold text-primary" : "text-muted-foreground",
                  )}>
                    {cell.day}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Popup */}
      {selectedDay && (
        <Card className="border-l-4" style={{ borderLeftColor: MOOD_COLORS[selectedDay.score] ?? "#D5D3CB" }}>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MoodFlower score={selectedDay.score} size={36} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  Feeling {selectedDay.mood} · {MOOD_LABELS[selectedDay.score]}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {[5, 4, 3, 2, 1].map((score) => (
          <div key={score} className="flex items-center gap-1.5">
            <MoodFlower score={score} size={18} />
            <span className="text-xs text-muted-foreground">{MOOD_LABELS[score]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <FlowerEmpty size={18} />
          <span className="text-xs text-muted-foreground">Empty</span>
        </div>
      </div>

      {/* Memory Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Search Memories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your memories..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchQuery.length >= 2 && (
            <div className="mt-4 space-y-2">
              {isSearching && <Skeleton className="h-12 w-full" />}
              {searchResults.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-border p-3"
                >
                  <p className="text-sm text-foreground line-clamp-2">{m.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
              {!isSearching && searchResults.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No memories found
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
