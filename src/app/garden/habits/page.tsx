"use client";

export default function HabitsPage() {
  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
      >
        Habits
      </h1>

      {/* Empty State */}
      <div
        className="p-8 rounded-xl border text-center"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <span className="text-4xl block mb-3">📊</span>
        <p className="font-medium" style={{ color: "var(--color-text)" }}>
          No habits tracked yet
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Tell Groot to track a habit — &quot;Track my weight daily&quot; or &quot;I want to read 30 pages a day&quot;.
        </p>
      </div>

      {/* Streak Counter Section (shows when habits exist) */}
      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
          Streak Counters
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Your habit streaks will appear here with trend charts and heatmaps.
        </p>
      </section>
    </div>
  );
}
