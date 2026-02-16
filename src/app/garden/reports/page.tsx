"use client";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
      >
        Weekly Reports
      </h1>

      <div
        className="p-8 rounded-xl border text-center"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <span className="text-4xl block mb-3">📋</span>
        <p className="font-medium" style={{ color: "var(--color-text)" }}>
          No reports yet
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Groot generates a weekly report every Sunday at 10 AM. Your first report will appear here.
        </p>
      </div>
    </div>
  );
}
