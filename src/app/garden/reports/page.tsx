"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Report {
  id: string;
  week_start: string;
  week_end: string;
  summary: string;
  key_topics: string[] | null;
  mood_trend: string | null;
  created_at: string;
}

export default function ReportsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetch("/api/reports")
      .then((r) => r.json())
      .then((data) => setReports(data.reports ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (userLoading || loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
      >
        Weekly Reports
      </h1>

      {reports.length === 0 ? (
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
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div
              key={r.id}
              className="p-6 rounded-xl border"
              style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                  {new Date(r.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {" — "}
                  {new Date(r.week_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
                {r.mood_trend && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full uppercase"
                    style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}
                  >
                    {r.mood_trend}
                  </span>
                )}
              </div>

              <p className="text-sm whitespace-pre-line" style={{ color: "var(--color-text)" }}>
                {r.summary}
              </p>

              {r.key_topics && r.key_topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.key_topics.map((topic, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
