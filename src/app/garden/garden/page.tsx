"use client";

import { useEffect, useState } from "react";
import { Sprout, Search } from "lucide-react";
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

const MOOD_BG: Record<number, string> = {
  5: "bg-mood-great",
  4: "bg-mood-good",
  3: "bg-mood-okay",
  2: "bg-mood-low",
  1: "bg-mood-bad",
  0: "bg-mood-none",
};

const MOOD_LABELS: Record<number, string> = {
  5: "Great", 4: "Good", 3: "Okay", 2: "Low", 1: "Bad",
};

export default function GardenPage() {
  const [moods, setMoods] = useState<DailyMood[]>([]);
  const [searchResults, setSearchResults] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    cachedFetch<{ dailyMoods: DailyMood[] }>(`/api/mood?year=${year}`)
      .then((data) => { if (!cancelled) setMoods(data.dailyMoods ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year]);

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

  // Group moods by month
  const moodsByMonth = moods.reduce<Record<string, DailyMood[]>>((acc, m) => {
    const month = m.date.slice(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month]!.push(m);
    return acc;
  }, {});

  const months = Object.keys(moodsByMonth).sort().reverse();

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="The Garden" subtitle="Your mood meadow — every day a flower." />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="The Garden" subtitle="Your mood meadow — every day a flower." />

      {/* Mood Meadow Grid */}
      {months.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sprout className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Your garden is waiting. Chat with Groot to grow flowers.
            </p>
          </CardContent>
        </Card>
      ) : (
        months.map((month) => {
          const monthMoods = moodsByMonth[month]!;
          const monthLabel = new Date(month + "-01").toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });

          return (
            <Card key={month}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{monthLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {monthMoods.map((m) => (
                    <div
                      key={m.date}
                      className={cn(
                        "h-8 w-8 rounded-md flex items-center justify-center text-[10px] font-medium text-white",
                        MOOD_BG[m.score] ?? "bg-mood-none",
                      )}
                      title={`${m.date}: ${m.mood} (${MOOD_LABELS[m.score] ?? "Unknown"})`}
                    >
                      {parseInt(m.date.slice(8, 10), 10)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-3">
        {[5, 4, 3, 2, 1].map((score) => (
          <div key={score} className="flex items-center gap-1.5">
            <div className={cn("h-3 w-3 rounded-sm", MOOD_BG[score])} />
            <span className="text-xs text-muted-foreground">{MOOD_LABELS[score]}</span>
          </div>
        ))}
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
