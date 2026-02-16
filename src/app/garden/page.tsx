"use client";

import { useEffect, useState } from "react";

interface DashboardData {
  greeting: string;
  streaks: Array<{ name: string; streak: number }>;
  recentMemories: Array<{ content: string; created_at: string }>;
  pendingTasks: number;
  upcomingReminders: number;
}

export default function GardenHome() {
  const [data, setData] = useState<DashboardData | null>(null);

  // In production, fetch from API with user session
  useEffect(() => {
    const hour = new Date().getHours();
    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    if (hour >= 17) greeting = "Good evening";

    setData({
      greeting,
      streaks: [],
      recentMemories: [],
      pendingTasks: 0,
      upcomingReminders: 0,
    });
  }, []);

  if (!data) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl md:text-3xl font-semibold"
          style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
        >
          {data.greeting} 🌱
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Welcome to The Garden — your second brain dashboard.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Memories" value="-" icon="🧠" />
        <StatCard label="Habits" value={`${data.streaks.length}`} icon="🔥" />
        <StatCard label="Tasks" value={`${data.pendingTasks}`} icon="✅" />
        <StatCard label="Reminders" value={`${data.upcomingReminders}`} icon="⏰" />
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
            {data.recentMemories.map((m, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: "var(--color-card)",
                  borderColor: "var(--color-border)",
                }}
              >
                <p className="text-sm" style={{ color: "var(--color-text)" }}>
                  {m.content}
                </p>
                <p className="text-xs mt-2" style={{ color: "var(--color-text-secondary)" }}>
                  {new Date(m.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active Habits */}
      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
          Habit Streaks
        </h2>
        {data.streaks.length === 0 ? (
          <EmptyState
            title="No habits tracked yet"
            description="Tell Groot about a habit you want to track — 'Track my weight daily'."
            icon="📊"
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.streaks.map((s, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border text-center"
                style={{
                  backgroundColor: "var(--color-card)",
                  borderColor: "var(--color-border)",
                }}
              >
                <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
                  {s.streak}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  {s.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
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
