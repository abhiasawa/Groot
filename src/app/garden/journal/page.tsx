"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import DiaryCard from "@/components/garden/diary-card";

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

const MOOD_COLORS: Record<number, string> = {
  5: "var(--color-mood-great)",
  4: "var(--color-mood-good)",
  3: "var(--color-mood-okay)",
  2: "var(--color-mood-low)",
  1: "var(--color-mood-bad)",
};

export default function JournalPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-32 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
    }>
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

  // Helper to get mood color for a date string
  const getMoodColorForDate = (dateKey: string): string => {
    const score = moodMap.get(dateKey);
    if (!score) return "var(--color-border)";
    return MOOD_COLORS[score] ?? "var(--color-border)";
  };

  const isDefaultView = viewMode === "timeline" && !searchQuery && !selectedDate;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header row with view toggle */}
      <div className="flex items-center justify-between">
        <PageHeader title="Journal" subtitle={total > 0 ? `${total} entries` : "Your conversation diary"} />
        <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--color-surface)" }}>
          {(["timeline", "calendar"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); setSelectedDate(null); }}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize"
              style={{
                backgroundColor: viewMode === mode ? "var(--color-card)" : "transparent",
                color: viewMode === mode ? "var(--color-text)" : "var(--color-text-secondary)",
                boxShadow: viewMode === mode ? "var(--shadow-card)" : "none",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Today Summary Card (Pattern 5: Today View Dashboard) ─── */}
      {isDefaultView && todayEntries.length > 0 && (
        <DiaryCard variant="paper" className="!p-6" style={{ boxShadow: "var(--shadow-paper)" }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.15em] mb-1"
                style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-body)" }}
              >
                {new Date().toLocaleDateString("en-US", { weekday: "long" })}
              </p>
              <h2 style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-2xl)",
                color: "var(--color-text)",
                letterSpacing: "var(--tracking-heading)",
              }}>
                {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </h2>
            </div>
            {todayMood && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MOOD_COLORS[todayMood] ?? "var(--color-border)" }} />
                <span className="text-xs font-medium" style={{ color: MOOD_COLORS[todayMood] ?? "var(--color-text-secondary)" }}>
                  {moodLabel(todayMood)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            <span>{todayEntries.length} {todayEntries.length === 1 ? "entry" : "entries"} today</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-border)" }} />
            <span>{todayEntries.filter(e => e.message_type === "audio").length} voice</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-border)" }} />
            <span>{todayWordCount} words</span>
          </div>
        </DiaryCard>
      )}

      {/* ─── Search + Filters ─── */}
      <div className="sticky top-0 z-10 py-2" style={{ backgroundColor: "var(--color-bg)" }}>
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3"
          style={{ backgroundColor: "var(--color-card)", boxShadow: "var(--shadow-paper)", border: "1px solid var(--color-border)" }}
        >
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>&#x1F50D;</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your journal..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--color-text)" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Clear</button>
          )}
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="text-xs px-3 py-1 rounded-full transition-colors"
              style={{
                backgroundColor: activeFilter === f ? "var(--color-primary)" : "var(--color-surface)",
                color: activeFilter === f ? "white" : "var(--color-text-secondary)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Calendar View ─── */}
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
          <span className="text-sm" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-diary)", fontStyle: "italic" }}>
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <button onClick={() => setSelectedDate(null)} className="text-xs underline" style={{ color: "var(--color-primary)" }}>
            Clear
          </button>
        </div>
      )}

      {/* ─── Timeline ─── */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <DiaryCard variant="paper" className="text-center !py-12" style={{ boxShadow: "var(--shadow-paper)" }}>
          <span className="text-4xl block mb-3">&#x1F4D3;</span>
          <p
            className="font-medium text-lg mb-1"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-heading)" }}
          >
            {searchQuery ? "No entries found" : "Your journal is waiting"}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {searchQuery ? "Try a different search term." : "Start talking to Groot on WhatsApp — your journal will fill up naturally."}
          </p>
        </DiaryCard>
      ) : (
        <div className="space-y-2">
          {[...grouped.entries()].map(([dateLabel, entries]) => {
            // Find the YYYY-MM-DD for this group to look up mood
            const firstEntry = entries[0]!;
            const dateKey = firstEntry.created_at.split("T")[0]!;
            const moodColor = getMoodColorForDate(dateKey);

            return (
              <div key={dateLabel}>
                {/* ─── Pattern 3: Decorative date separator ─── */}
                <div className="flex items-center gap-4 my-6 first:mt-0">
                  <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
                  <h3 style={{
                    fontFamily: "var(--font-diary)",
                    color: "var(--color-text-secondary)",
                    fontSize: "var(--text-sm)",
                    fontStyle: "italic",
                    whiteSpace: "nowrap",
                  }}>
                    {dateLabel}
                  </h3>
                  <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
                </div>

                {/* ─── Pattern 2: Mood-tinted timeline with left border ─── */}
                <div className="relative pl-5">
                  {/* Vertical mood-colored timeline line */}
                  <div
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                    style={{ backgroundColor: moodColor, opacity: 0.6 }}
                  />

                  <div className="space-y-3">
                    {entries.map((m) => (
                      <div
                        key={m.id}
                        className="p-5 transition-all duration-200"
                        style={{
                          backgroundColor: "var(--color-paper)",
                          boxShadow: "var(--shadow-paper)",
                          borderRadius: "var(--radius-lg)",
                          border: "1px solid var(--color-border)",
                          borderLeft: `3px solid ${moodColor}`,
                          // Pattern 3: Paper texture via subtle noise
                          backgroundImage: "var(--texture-paper)",
                        }}
                      >
                        {/* ─── Pattern 1: Serif diary body text ─── */}
                        <p style={{
                          color: "var(--color-text)",
                          fontFamily: "var(--font-diary)",
                          fontSize: "var(--text-base)",
                          lineHeight: 1.75,
                          letterSpacing: "0.01em",
                        }}>
                          {m.content}
                        </p>

                        {m.media_description && (
                          <p className="text-xs mt-2 italic" style={{ color: "var(--color-text-secondary)" }}>
                            {m.media_description}
                          </p>
                        )}

                        {/* ─── Pattern 4: Contextual metadata footer ─── */}
                        <div
                          className="flex items-center gap-3 mt-3 pt-2 flex-wrap"
                          style={{ borderTop: "1px dashed var(--color-border)", opacity: 0.7 }}
                        >
                          <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                            {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                          <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                            {m.message_type === "audio" ? "Voice note" : m.message_type === "image" ? "Photo" : "Text"}
                          </span>
                          {m.message_type === "text" && m.content && (
                            <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                              {m.content.split(/\s+/).length} words
                            </span>
                          )}
                        </div>
                      </div>
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

// ─── Helpers ───

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

// ─── Mood-colored Calendar ───

const CALENDAR_MOOD_COLORS: Record<number, string> = {
  5: "var(--color-mood-great)",
  4: "var(--color-mood-good)",
  3: "var(--color-mood-okay)",
  2: "var(--color-mood-low)",
  1: "var(--color-mood-bad)",
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
    <DiaryCard variant="paper" style={{ boxShadow: "var(--shadow-paper)" }}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-black/5 transition-colors" style={{ color: "var(--color-text-secondary)" }}>&#x2190;</button>
        <span className="font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)", fontSize: "var(--text-lg)" }}>
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-black/5 transition-colors" style={{ color: "var(--color-text-secondary)" }}>&#x2192;</button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-[10px] py-1 font-medium" style={{ color: "var(--color-text-secondary)" }}>{d}</div>
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
              className="aspect-square flex flex-col items-center justify-center rounded-lg text-xs relative transition-all"
              style={{
                color: !cell ? "transparent" : isSelected ? "white" : isToday ? "var(--color-primary)" : "var(--color-text)",
                backgroundColor: isSelected ? "var(--color-primary)" : "transparent",
                fontWeight: isToday ? 700 : 400,
                border: isToday && !isSelected ? "2px solid var(--color-primary)" : "2px solid transparent",
              }}
            >
              {cell?.day}
              {/* Mood-colored dot for days with entries */}
              {cell && hasEntries && !isSelected && (
                <span
                  className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: hasMood
                      ? (CALENDAR_MOOD_COLORS[moodScore!] ?? "var(--color-primary)")
                      : "var(--color-primary)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Mood legend */}
      <div className="flex items-center justify-center gap-3 mt-4 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        {([
          [5, "Great"],
          [4, "Good"],
          [3, "Okay"],
          [2, "Low"],
          [1, "Bad"],
        ] as const).map(([score, label]) => (
          <div key={score} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CALENDAR_MOOD_COLORS[score] }} />
            <span className="text-[9px]" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
          </div>
        ))}
      </div>
    </DiaryCard>
  );
}
