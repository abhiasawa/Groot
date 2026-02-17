"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import PageHeader from "@/components/garden/page-header";
import DiaryCard from "@/components/garden/diary-card";

interface Report {
  id: string;
  week_start: string;
  week_end: string;
  summary: string;
  key_topics: string[] | null;
  mood_trend: string | null;
  insights: Record<string, string> | null;
  created_at: string;
}

const MOOD_BAR_COLORS: Record<string, string> = {
  positive: "var(--color-mood-good)",
  good: "var(--color-mood-good)",
  great: "var(--color-mood-great)",
  neutral: "var(--color-mood-okay)",
  okay: "var(--color-mood-okay)",
  mixed: "var(--color-mood-okay)",
  low: "var(--color-mood-low)",
  negative: "var(--color-mood-low)",
  bad: "var(--color-mood-bad)",
};

export default function InsightsPage() {
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
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-32 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-40 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Insights" subtitle="Weekly reflections from your conversations" />

      {reports.length === 0 ? (
        <DiaryCard variant="paper" className="text-center">
          <span className="text-3xl block mb-2">💡</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>No insights yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Groot generates a weekly insight report every Sunday. Keep chatting and your first report will appear here.
          </p>
        </DiaryCard>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
            const moodColor = r.mood_trend ? (MOOD_BAR_COLORS[r.mood_trend.toLowerCase()] ?? "var(--color-mood-okay)") : null;
            return (
              <DiaryCard key={r.id} variant="paper">
                {/* Mood bar at top */}
                {moodColor && (
                  <div
                    className="h-1 rounded-full mb-4 -mt-1"
                    style={{ backgroundColor: moodColor }}
                  />
                )}

                {/* Week range */}
                <p
                  className="text-sm mb-3"
                  style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--color-primary)" }}
                >
                  {new Date(r.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {" — "}
                  {new Date(r.week_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>

                {/* Summary */}
                <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: "var(--color-text)" }}>
                  {r.summary}
                </p>

                {/* Insights bullets */}
                {r.insights && Object.keys(r.insights).length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {Object.entries(r.insights).map(([key, val]) => (
                      <li key={key} className="text-xs flex items-start gap-2" style={{ color: "var(--color-text-secondary)" }}>
                        <span style={{ color: "var(--color-accent)" }}>•</span>
                        <span><strong>{key}:</strong> {val}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Topics */}
                {r.key_topics && r.key_topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {r.key_topics.map((topic, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                {/* Mood badge */}
                {r.mood_trend && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: moodColor ?? "var(--color-border)" }} />
                    <span className="text-[10px] uppercase" style={{ color: "var(--color-text-secondary)" }}>
                      Mood: {r.mood_trend}
                    </span>
                  </div>
                )}
              </DiaryCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
