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
  positive: "var(--color-mood-good)", good: "var(--color-mood-good)", great: "var(--color-mood-great)",
  neutral: "var(--color-mood-okay)", okay: "var(--color-mood-okay)", mixed: "var(--color-mood-okay)",
  low: "var(--color-mood-low)", negative: "var(--color-mood-low)", bad: "var(--color-mood-bad)",
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
      <div className="space-y-6 animate-pulse max-w-3xl mx-auto">
        <div className="h-8 w-32 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-40 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader title="Insights" subtitle="Weekly reflections from your conversations" />

      {reports.length === 0 ? (
        <DiaryCard variant="paper" className="text-center !py-10">
          <span className="text-4xl block mb-3">&#x1F4A1;</span>
          <p className="font-medium text-base mb-1" style={{ color: "var(--color-text)", fontFamily: "var(--font-heading)" }}>
            No insights yet
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-diary)", fontStyle: "italic" }}>
            Groot generates a weekly insight report every Sunday. Keep chatting and your first report will appear here.
          </p>
        </DiaryCard>
      ) : (
        <div className="space-y-6">
          {reports.map((r, index) => {
            const moodColor = r.mood_trend ? (MOOD_BAR_COLORS[r.mood_trend.toLowerCase()] ?? "var(--color-mood-okay)") : null;

            return (
              <div key={r.id}>
                {/* Decorative week separator */}
                {index > 0 && (
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
                    <span className="text-xs" style={{ color: "var(--color-border)" }}>&#x2767;</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
                  </div>
                )}

                <DiaryCard variant="paper">
                  {/* Mood bar at top */}
                  {moodColor && (
                    <div
                      className="h-1 rounded-full mb-5 -mt-1"
                      style={{ backgroundColor: moodColor }}
                    />
                  )}

                  {/* Week range in serif italic */}
                  <p style={{
                    fontFamily: "var(--font-heading)",
                    fontStyle: "italic",
                    color: "var(--color-primary)",
                    fontSize: "var(--text-base)",
                    marginBottom: "var(--space-3)",
                  }}>
                    {new Date(r.week_start).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    {" \u2014 "}
                    {new Date(r.week_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>

                  {/* Summary in diary font */}
                  <p
                    className="whitespace-pre-line"
                    style={{
                      color: "var(--color-text)",
                      fontFamily: "var(--font-diary)",
                      fontSize: "var(--text-sm)",
                      lineHeight: 1.75,
                    }}
                  >
                    {r.summary}
                  </p>

                  {/* Insights bullets */}
                  {r.insights && Object.keys(r.insights).length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {Object.entries(r.insights).map(([key, val]) => (
                        <li key={key} className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          <span style={{ color: "var(--color-accent)", marginTop: "2px" }}>&#x2022;</span>
                          <span style={{ fontFamily: "var(--font-diary)", lineHeight: 1.5 }}>
                            <strong style={{ color: "var(--color-text)" }}>{key}:</strong> {val}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Divider before metadata */}
                  {((r.key_topics && r.key_topics.length > 0) || r.mood_trend) && (
                    <div className="h-px mt-4 mb-3" style={{ backgroundColor: "var(--color-border)", opacity: 0.5 }} />
                  )}

                  {/* Topics as warm tags */}
                  {r.key_topics && r.key_topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {r.key_topics.map((topic, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: "var(--color-surface)",
                            color: "var(--color-text-secondary)",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Mood badge */}
                  {r.mood_trend && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: moodColor ?? "var(--color-border)" }} />
                      <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                        Mood: {r.mood_trend}
                      </span>
                    </div>
                  )}
                </DiaryCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
