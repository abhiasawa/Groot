"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface DashboardData {
  greeting: string;
  userName: string;
  memoriesCount: number;
  recentMemories: Array<{ id: string; content: string; message_type: string; created_at: string }>;
  pendingTasks: number;
  upcomingReminders: number;
}

export default function GardenHome() {
  const { user, loading: userLoading } = useCurrentUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const hour = new Date().getHours();
    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    if (hour >= 17) greeting = "Good evening";

    Promise.all([
      fetch(`/api/memories?userId=${user.id}&limit=5`).then((r) => r.json()),
      fetch(`/api/dashboard?userId=${user.id}`).then((r) => r.json()).catch(() => ({ tasks: 0, reminders: 0 })),
    ]).then(([memoriesRes, dashRes]) => {
      setData({
        greeting,
        userName: user.display_name || "friend",
        memoriesCount: memoriesRes.total ?? 0,
        recentMemories: memoriesRes.memories ?? [],
        pendingTasks: dashRes.tasks ?? 0,
        upcomingReminders: dashRes.reminders ?? 0,
      });
      setLoading(false);
    }).catch(() => {
      setData({
        greeting,
        userName: user.display_name || "friend",
        memoriesCount: 0,
        recentMemories: [],
        pendingTasks: 0,
        upcomingReminders: 0,
      });
      setLoading(false);
    });
  }, [user]);

  if (userLoading || loading) return <LoadingSkeleton />;
  if (!data) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl md:text-3xl font-semibold"
          style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
        >
          {data.greeting}, {data.userName} 🌱
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Welcome to The Garden — your second brain dashboard.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Memories" value={`${data.memoriesCount}`} icon="🧠" />
        <StatCard label="Tasks" value={`${data.pendingTasks}`} icon="✅" />
        <StatCard label="Reminders" value={`${data.upcomingReminders}`} icon="⏰" />
        <StatCard label="Since" value={user ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"} icon="📅" />
      </div>

      {/* Recent Memories */}
      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
          Recent Memories
        </h2>
        {data.recentMemories.length === 0 ? (
          <EmptyState
            title="Your Garden is ready to grow"
            description="Start talking to Groot on WhatsApp — your memories will appear here."
            icon="🌱"
          />
        ) : (
          <div className="space-y-3">
            {data.recentMemories.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: "var(--color-card)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <TypeBadge type={m.message_type} />
                </div>
                <p className="text-sm" style={{ color: "var(--color-text)" }}>
                  {m.content}
                </p>
                <p className="text-xs mt-2" style={{ color: "var(--color-text-secondary)" }}>
                  {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
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

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div
      className="p-4 rounded-xl border"
      style={{
        backgroundColor: "var(--color-card)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        <span
          className="text-xl font-bold"
          style={{ color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}
        >
          {value}
        </span>
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </p>
    </div>
  );
}

function EmptyState({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div
      className="p-8 rounded-xl border text-center"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <span className="text-4xl block mb-3">{icon}</span>
      <p className="font-medium" style={{ color: "var(--color-text)" }}>
        {title}
      </p>
      <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
        {description}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
    </div>
  );
}
