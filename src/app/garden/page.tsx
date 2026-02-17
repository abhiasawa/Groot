"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import DiaryCard from "@/components/garden/diary-card";

interface DashboardData {
  greeting: string;
  userName: string;
  memoriesCount: number;
  recentMemories: Array<{ id: string; content: string; message_type: string; created_at: string }>;
  pendingTasks: number;
  upcomingReminders: number;
  flashback: { content: string; created_at: string } | null;
  recentMood: string | null;
}

export default function GardenHome() {
  const { user, loading: userLoading } = useCurrentUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const hour = new Date().getHours();
    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    if (hour >= 17) greeting = "Good evening";

    // Get flashback date (30 days ago)
    const flashbackDate = new Date();
    flashbackDate.setDate(flashbackDate.getDate() - 30);
    const flashbackDateStr = flashbackDate.toISOString().split("T")[0];

    Promise.all([
      fetch("/api/memories?limit=5").then((r) => r.json()).catch(() => ({ memories: [], total: 0 })),
      fetch("/api/dashboard").then((r) => r.json()).catch(() => ({ tasks: 0, reminders: 0 })),
      fetch(`/api/memories?date=${flashbackDateStr}&limit=1`).then((r) => r.json()).catch(() => ({ memories: [] })),
      fetch(`/api/mood?year=${new Date().getFullYear()}`).then((r) => r.json()).catch(() => ({ recentMood: null })),
    ]).then(([memoriesRes, dashRes, flashbackRes, moodRes]) => {
      const flashbackMemory = flashbackRes.memories?.[0] ?? null;
      setData({
        greeting,
        userName: user.display_name || "friend",
        memoriesCount: memoriesRes.total ?? 0,
        recentMemories: memoriesRes.memories ?? [],
        pendingTasks: dashRes.tasks ?? 0,
        upcomingReminders: dashRes.reminders ?? 0,
        flashback: flashbackMemory,
        recentMood: moodRes.recentMood ?? null,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/garden/journal?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const memberDays = user ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  if (userLoading || loading) return <LoadingSkeleton />;
  if (!data) return <LoadingSkeleton />;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-heading)", fontStyle: "italic" }}>
          {today}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)", letterSpacing: "-0.01em" }}>
          {data.greeting}, {data.userName}
        </h1>
        {data.recentMood && (
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Feeling <span style={{ color: "var(--color-primary)", fontWeight: 500 }}>{data.recentMood}</span> lately
          </p>
        )}
      </div>

      {/* Ask Groot Search */}
      <form onSubmit={handleSearch}>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: "var(--color-card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--color-border)" }}
        >
          <span style={{ color: "var(--color-text-secondary)" }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask Groot anything about your life..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-body)" }}
          />
        </div>
      </form>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <DiaryCard className="text-center !p-4">
          <p className="text-xl font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
            {data.memoriesCount}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>memories</p>
        </DiaryCard>
        <DiaryCard className="text-center !p-4">
          <p className="text-xl font-bold" style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>
            {data.pendingTasks}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>tasks</p>
        </DiaryCard>
        <DiaryCard className="text-center !p-4">
          <p className="text-xl font-bold" style={{ color: "var(--color-secondary)", fontFamily: "var(--font-mono)" }}>
            {memberDays}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>days together</p>
        </DiaryCard>
      </div>

      {/* Today's Focus */}
      {(data.pendingTasks > 0 || data.upcomingReminders > 0) && (
        <DiaryCard variant="paper">
          <h2 className="text-base font-semibold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
            Today&apos;s Focus
          </h2>
          <div className="flex gap-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {data.pendingTasks > 0 && <span>✅ {data.pendingTasks} task{data.pendingTasks !== 1 ? "s" : ""} pending</span>}
            {data.upcomingReminders > 0 && <span>⏰ {data.upcomingReminders} reminder{data.upcomingReminders !== 1 ? "s" : ""}</span>}
          </div>
        </DiaryCard>
      )}

      {/* Flashback */}
      {data.flashback && (
        <DiaryCard variant="paper">
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
            30 days ago
          </p>
          <p className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.6 }}>
            {data.flashback.content.slice(0, 200)}{data.flashback.content.length > 200 ? "..." : ""}
          </p>
        </DiaryCard>
      )}

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
          Recent Activity
        </h2>
        {data.recentMemories.length === 0 ? (
          <DiaryCard variant="paper" className="text-center">
            <span className="text-3xl block mb-2">🌱</span>
            <p className="font-medium" style={{ color: "var(--color-text)" }}>Your Garden is ready to grow</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Start talking to Groot on WhatsApp — your memories will appear here.
            </p>
          </DiaryCard>
        ) : (
          <div className="space-y-2">
            {data.recentMemories.map((m) => (
              <DiaryCard key={m.id} className="!p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TypeBadge type={m.message_type} />
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
                  {m.content.slice(0, 150)}{m.content.length > 150 ? "..." : ""}
                </p>
              </DiaryCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = { text: "Note", audio: "Voice", image: "Image", interactive: "Action" };
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}
    >
      {labels[type] ?? type}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
      <div className="h-12 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
    </div>
  );
}
