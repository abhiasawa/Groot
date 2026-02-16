"use client";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
      >
        Tasks
      </h1>

      <div
        className="p-8 rounded-xl border text-center"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <span className="text-4xl block mb-3">✅</span>
        <p className="font-medium" style={{ color: "var(--color-text)" }}>
          No tasks yet
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Send &quot;todo: buy groceries&quot; to Groot on WhatsApp to add your first task.
        </p>
      </div>
    </div>
  );
}
