"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import DiaryCard from "@/components/garden/diary-card";
import Link from "next/link";

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

const MOOD_ACCENTS: Record<string, string> = {
  positive: "var(--color-mood-good)", good: "var(--color-mood-good)", great: "var(--color-mood-great)",
  happy: "var(--color-mood-great)", calm: "var(--color-mood-good)", motivated: "var(--color-mood-good)",
  neutral: "var(--color-mood-okay)", okay: "var(--color-mood-okay)", fine: "var(--color-mood-okay)",
  low: "var(--color-mood-low)", tired: "var(--color-mood-low)", anxious: "var(--color-mood-low)",
  stressed: "var(--color-mood-low)", bad: "var(--color-mood-bad)", sad: "var(--color-mood-bad)",
};

export default function GardenHome() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Single consolidated API call — replaces 6 separate requests
  useEffect(() => {
    cachedFetch<HomeData>("/api/garden/home")
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/garden/journal?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const today = new Date();
  const todayFormatted = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const memberDays = data?.createdAt ? Math.max(1, Math.floor((Date.now() - new Date(data.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 0;

  if (loading) return <LoadingSkeleton />;
  if (!data) return <LoadingSkeleton />;

  const displayName = data.displayName || "friend";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const moodColor = data.recentMood ? (MOOD_ACCENTS[data.recentMood.toLowerCase()] ?? "var(--color-mood-okay)") : null;

  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      {/* ─── Greeting Hero ─── */}
      <header className="pt-4">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-3"
          style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-body)" }}
        >
          {todayFormatted}
        </p>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.75rem, 5vw, 2.25rem)",
            color: "var(--color-text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          {greeting}, {displayName}
        </h1>
        {data.recentMood && (
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: moodColor ?? "var(--color-border)" }} />
            <p className="text-sm" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-diary)" }}>
              Feeling <span style={{ color: moodColor ?? "var(--color-text)", fontWeight: 500, fontStyle: "italic" }}>{data.recentMood}</span> lately
            </p>
          </div>
        )}

        {/* Decorative divider */}
        <div className="flex items-center gap-4 mt-6">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
          <span className="text-xs" style={{ color: "var(--color-border)" }}>&#x2767;</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
        </div>
      </header>

      {/* ─── Search Bar ─── */}
      <form onSubmit={handleSearch}>
        <div
          className="flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-shadow"
          style={{
            backgroundColor: "var(--color-paper)",
            boxShadow: "var(--shadow-paper)",
            border: "1px solid var(--color-border)",
            backgroundImage: "var(--texture-paper)",
          }}
        >
          <span className="text-base" style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>&#x1F50D;</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your memories..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-diary)", fontStyle: "italic" }}
          />
        </div>
      </form>

      {/* ─── Life at a Glance ─── */}
      <section>
        <SectionLabel text="Life at a Glance" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard value={data.memoriesCount} label="memories" href="/garden/journal" accent="var(--color-primary)" />
          <StatCard value={data.pendingTasks} label="tasks pending" href="/garden/tasks" accent="var(--color-accent)" />
          <StatCard value={data.peopleCount} label="people" href="/garden/people" accent="var(--color-secondary)" />
          <StatCard value={memberDays} label="days together" accent="var(--color-text-secondary)" />
        </div>
      </section>

      {/* ─── Today's Focus ─── */}
      {(data.pendingTasks > 0 || data.upcomingReminders > 0) && (
        <section>
          <SectionLabel text="Today&apos;s Focus" />
          <DiaryCard variant="paper" style={{ borderLeft: "3px solid var(--color-accent)" }}>
            <div className="space-y-2">
              {data.pendingTasks > 0 && (
                <Link href="/garden/tasks" className="flex items-center gap-3 group">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-accent)" }}>&#x2713;</span>
                  <span className="text-sm group-hover:underline" style={{ color: "var(--color-text)", fontFamily: "var(--font-diary)" }}>
                    {data.pendingTasks} task{data.pendingTasks !== 1 ? "s" : ""} waiting for you
                  </span>
                </Link>
              )}
              {data.upcomingReminders > 0 && (
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}>&#x23F0;</span>
                  <span className="text-sm" style={{ color: "var(--color-text)", fontFamily: "var(--font-diary)" }}>
                    {data.upcomingReminders} reminder{data.upcomingReminders !== 1 ? "s" : ""} coming up
                  </span>
                </div>
              )}
            </div>
          </DiaryCard>
        </section>
      )}

      {/* ─── Flashback ─── */}
      {data.flashback && (
        <section>
          <SectionLabel text="30 Days Ago" />
          <DiaryCard variant="paper" className="relative overflow-hidden">
            {/* Faded corner ornament */}
            <div
              className="absolute top-0 right-0 w-16 h-16 opacity-[0.04]"
              style={{ backgroundImage: "radial-gradient(circle at 100% 0%, var(--color-accent) 0%, transparent 70%)" }}
            />
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "var(--color-text)",
                fontFamily: "var(--font-diary)",
                fontStyle: "italic",
                lineHeight: 1.75,
              }}
            >
              &ldquo;{data.flashback.content.slice(0, 250)}{data.flashback.content.length > 250 ? "..." : ""}&rdquo;
            </p>
            <p className="text-[11px] mt-3" style={{ color: "var(--color-text-secondary)" }}>
              {new Date(data.flashback.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </DiaryCard>
        </section>
      )}

      {/* ─── Recent Activity ─── */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <SectionLabel text="Recent Entries" />
          <Link href="/garden/journal" className="text-xs underline" style={{ color: "var(--color-primary)" }}>
            View all &rarr;
          </Link>
        </div>

        {data.recentMemories.length === 0 ? (
          <DiaryCard variant="paper" className="text-center !py-10">
            <span className="text-4xl block mb-3">&#x1F331;</span>
            <p
              className="font-medium text-base mb-1"
              style={{ color: "var(--color-text)", fontFamily: "var(--font-heading)" }}
            >
              Your Garden is ready to grow
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Start talking to Groot on WhatsApp — your memories will appear here.
            </p>
          </DiaryCard>
        ) : (
          <div className="relative pl-5">
            {/* Vertical timeline line */}
            <div
              className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
              style={{ backgroundColor: "var(--color-border)" }}
            />

            <div className="space-y-3">
              {data.recentMemories.map((m) => {
                const time = new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                const typeLabel = m.message_type === "audio" ? "Voice" : m.message_type === "image" ? "Photo" : "Text";
                const wordCount = m.content?.split(/\s+/).length ?? 0;

                return (
                  <div
                    key={m.id}
                    className="p-4 transition-all duration-200"
                    style={{
                      backgroundColor: "var(--color-paper)",
                      boxShadow: "var(--shadow-paper)",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--color-border)",
                      backgroundImage: "var(--texture-paper)",
                    }}
                  >
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: "var(--color-text)",
                        fontFamily: "var(--font-diary)",
                        lineHeight: 1.7,
                      }}
                    >
                      {m.content.slice(0, 180)}{m.content.length > 180 ? "..." : ""}
                    </p>

                    <div
                      className="flex items-center gap-3 mt-3 pt-2"
                      style={{ borderTop: "1px dashed var(--color-border)", opacity: 0.6 }}
                    >
                      <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{time}</span>
                      <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{typeLabel}</span>
                      {wordCount > 0 && (
                        <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{wordCount} words</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ─── Quick Navigation ─── */}
      <section>
        <SectionLabel text="Explore" />
        <div className="grid grid-cols-2 gap-3">
          <QuickLink href="/garden/mood" icon="&#x1F3AD;" label="Mood Patterns" description="Your emotional journey" />
          <QuickLink href="/garden/habits" icon="&#x1F4CA;" label="Habits" description="Streaks and progress" />
          <QuickLink href="/garden/insights" icon="&#x1F4A1;" label="Insights" description="Weekly reflections" />
          <QuickLink href="/garden/profile" icon="&#x1F9E0;" label="Profile" description="What Groot knows" />
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─── */

function SectionLabel({ text }: { text: string }) {
  return (
    <h2
      className="text-xs uppercase tracking-[0.15em] mb-3"
      style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-body)", fontWeight: 600 }}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
}

function StatCard({ value, label, href, accent }: { value: number; label: string; href?: string; accent: string }) {
  const inner = (
    <div
      className="p-4 rounded-xl text-center transition-all duration-200"
      style={{
        backgroundColor: "var(--color-paper)",
        boxShadow: "var(--shadow-paper)",
        border: "1px solid var(--color-border)",
        backgroundImage: "var(--texture-paper)",
      }}
    >
      <p
        className="text-2xl font-bold"
        style={{ color: accent, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      <p className="text-[11px] mt-1 uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </p>
    </div>
  );

  if (href) {
    return <Link href={href} className="block hover:scale-[1.02] transition-transform">{inner}</Link>;
  }
  return inner;
}

function QuickLink({ href, icon, label, description }: { href: string; icon: string; label: string; description: string }) {
  return (
    <Link href={href}>
      <DiaryCard className="!p-4 hover:scale-[1.01] transition-transform">
        <div className="flex items-center gap-3">
          <span className="text-xl" dangerouslySetInnerHTML={{ __html: icon }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)", fontFamily: "var(--font-heading)" }}>{label}</p>
            <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{description}</p>
          </div>
        </div>
      </DiaryCard>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse max-w-3xl mx-auto">
      <div className="pt-4">
        <div className="h-3 w-40 rounded mb-3" style={{ backgroundColor: "var(--color-surface)" }} />
        <div className="h-10 w-64 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
      </div>
      <div className="h-12 rounded-2xl" style={{ backgroundColor: "var(--color-surface)" }} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-28 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
      ))}
    </div>
  );
}
