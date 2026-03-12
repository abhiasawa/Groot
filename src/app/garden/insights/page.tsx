"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Lightbulb } from "lucide-react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import MarkdownContent from "@/components/garden/markdown-content";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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

const MOOD_COLORS: Record<string, string> = {
  positive: "#22c55e", good: "#22c55e", great: "#16a34a",
  neutral: "#eab308", okay: "#eab308", mixed: "#eab308",
  low: "#f97316", negative: "#ef4444", bad: "#ef4444",
};

const MOOD_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  positive: "default", good: "default", great: "default",
  neutral: "secondary", okay: "secondary", mixed: "secondary",
  low: "outline", negative: "destructive", bad: "destructive",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function InsightsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cachedFetch<{ reports?: Report[] }>("/api/reports")
      .then((data) => setReports(data.reports ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-32" />
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader title="Insights" subtitle="Weekly reflections from your conversations" />

      {reports.length === 0 ? (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center text-center">
            <Lightbulb className="size-10 text-muted-foreground mb-3" />
            <p className="font-medium text-base mb-1 text-foreground">
              No insights yet
            </p>
            <p className="text-sm text-muted-foreground">
              Groot generates a weekly insight report every Sunday. Keep chatting and your first report will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {reports.map((r, index) => {
            const moodKey = r.mood_trend?.toLowerCase() ?? "";
            const moodColor = MOOD_COLORS[moodKey] ?? "#eab308";
            const moodBadgeVariant = MOOD_BADGE_VARIANT[moodKey] ?? "secondary";

            return (
              <motion.div key={r.id} variants={itemVariants}>
                {/* Decorative week separator */}
                {index > 0 && <Separator className="mb-6" />}

                <Card className="overflow-hidden py-0">
                  {/* Mood color top border */}
                  {r.mood_trend && (
                    <div
                      className="h-1 w-full"
                      style={{ backgroundColor: moodColor }}
                    />
                  )}

                  <CardContent className="p-6">
                    {/* Week range */}
                    <p className="text-base font-semibold text-primary mb-3">
                      {new Date(r.week_start).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                      {" \u2014 "}
                      {new Date(r.week_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>

                    {/* Summary */}
                    <MarkdownContent content={r.summary} />

                    {/* Insights bullets */}
                    {r.insights && Object.keys(r.insights).length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {Object.entries(r.insights).map(([key, val]) => (
                          <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-accent mt-0.5 shrink-0">{"\u2022"}</span>
                            <span className="leading-relaxed">
                              <strong className="text-foreground">{key}:</strong> {val}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Divider before metadata */}
                    {((r.key_topics && r.key_topics.length > 0) || r.mood_trend) && (
                      <Separator className="mt-4 mb-3" />
                    )}

                    {/* Topics as badges */}
                    {r.key_topics && r.key_topics.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {r.key_topics.map((topic, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Mood badge */}
                    {r.mood_trend && (
                      <div className="mt-3 flex items-center gap-2">
                        <div
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: moodColor }}
                        />
                        <Badge variant={moodBadgeVariant} className="text-[10px] uppercase tracking-wide">
                          Mood: {r.mood_trend}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
