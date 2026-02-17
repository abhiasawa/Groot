"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
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

export default function JournalPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-32 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
    }>
      <JournalContent />
    </Suspense>
  );
}

function JournalContent() {
  const { user } = useCurrentUser();
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

  const fetchMemories = useCallback(async () => {
    if (!user) return;
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
  }, [user, searchQuery, activeFilter, selectedDate]);

  // Fetch calendar dots when month changes
  useEffect(() => {
    if (!user) return;
    const year = calendarMonth.getFullYear();
    const month = String(calendarMonth.getMonth() + 1).padStart(2, "0");
    fetch(`/api/memories?month=${year}-${month}`)
      .then((r) => r.json())
      .then((data) => setCalendarDots(new Set(data.dates ?? [])))
      .catch(() => setCalendarDots(new Set()));
  }, [user, calendarMonth]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  // Group memories by date for timeline
  const grouped = groupByDate(memories);

  return (
    <div className="space-y-6">
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

      {/* Search + Filters */}
      <div className="sticky top-0 z-10 py-2" style={{ backgroundColor: "var(--color-bg)" }}>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3" style={{ backgroundColor: "var(--color-card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--color-border)" }}>
          <span style={{ color: "var(--color-text-secondary)" }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your journal..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--color-text)" }}
          />
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

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <CalendarGrid
          month={calendarMonth}
          dots={calendarDots}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d === selectedDate ? null : d)}
          onChangeMonth={setCalendarMonth}
        />
      )}

      {/* Selected date indicator */}
      {selectedDate && (
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Showing entries for {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <button onClick={() => setSelectedDate(null)} className="text-xs underline" style={{ color: "var(--color-primary)" }}>
            Clear
          </button>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <DiaryCard variant="paper" className="text-center">
          <span className="text-3xl block mb-2">📓</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>No entries yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {searchQuery ? "Try a different search term." : "Start talking to Groot — your journal will fill up naturally."}
          </p>
        </DiaryCard>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([dateLabel, entries]) => (
            <div key={dateLabel}>
              <h3
                className="text-sm font-medium mb-3 pb-2 border-b"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-secondary)", borderColor: "var(--color-border)" }}
              >
                {dateLabel}
              </h3>
              <div className="space-y-2 pl-3" style={{ borderLeft: "2px solid var(--color-border)" }}>
                {entries.map((m) => (
                  <DiaryCard key={m.id} variant="paper" className="!p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <TypeBadge type={m.message_type} />
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.6 }}>
                      {m.content}
                    </p>
                    {m.media_description && (
                      <p className="text-xs mt-2 italic" style={{ color: "var(--color-text-secondary)" }}>
                        {m.media_description}
                      </p>
                    )}
                  </DiaryCard>
                ))}
              </div>
            </div>
          ))}
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

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = { text: "Note", audio: "Voice", image: "Image", interactive: "Action" };
  const icons: Record<string, string> = { text: "📝", audio: "🎤", image: "📷", interactive: "🔘" };
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}>
      <span>{icons[type] ?? "📄"}</span>
      {labels[type] ?? type}
    </span>
  );
}

function CalendarGrid({
  month,
  dots,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: {
  month: Date;
  dots: Set<string>;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
  onChangeMonth: (d: Date) => void;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday-start
  const cells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  const prevMonth = () => onChangeMonth(new Date(year, m - 1, 1));
  const nextMonth = () => onChangeMonth(new Date(year, m + 1, 1));

  return (
    <DiaryCard variant="paper">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-black/5" style={{ color: "var(--color-text-secondary)" }}>←</button>
        <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-black/5" style={{ color: "var(--color-text-secondary)" }}>→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-[10px] py-1" style={{ color: "var(--color-text-secondary)" }}>{d}</div>
        ))}
        {cells.map((cell, i) => (
          <button
            key={i}
            disabled={!cell}
            onClick={() => cell && onSelectDate(cell.dateStr)}
            className="aspect-square flex flex-col items-center justify-center rounded-lg text-xs relative transition-colors"
            style={{
              color: !cell ? "transparent" : cell.dateStr === selectedDate ? "white" : cell.dateStr === todayStr ? "var(--color-primary)" : "var(--color-text)",
              backgroundColor: cell?.dateStr === selectedDate ? "var(--color-primary)" : "transparent",
              fontWeight: cell?.dateStr === todayStr ? 700 : 400,
            }}
          >
            {cell?.day}
            {cell && dots.has(cell.dateStr) && cell.dateStr !== selectedDate && (
              <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-primary)" }} />
            )}
          </button>
        ))}
      </div>
    </DiaryCard>
  );
}
