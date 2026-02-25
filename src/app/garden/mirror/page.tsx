"use client";

import { useEffect, useState } from "react";
import { User, TrendingUp, Award, MessageSquare, Bookmark, Clock, Brain, Sparkles, HelpCircle } from "lucide-react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MirrorData {
  narrativeBio: string | null;
  patterns: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    confidence: number;
    timeframe: string;
  }>;
  milestones: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    icon: string;
  }>;
  weeklyReports: Array<{
    id: string;
    week_start: string;
    week_end: string;
    summary: string;
    insights: string | null;
  }>;
  profileFacts: Array<{
    id: string;
    key: string;
    value: string;
    confidence: number;
    source: string;
  }>;
  stats: {
    totalMessages: number;
    totalMemories: number;
    daysActive: number;
    displayName: string | null;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  emotional: "bg-mood-okay text-white",
  behavioral: "bg-primary text-primary-foreground",
  relational: "bg-accent text-accent-foreground",
  growth: "bg-mood-great text-white",
};

export default function MirrorPage() {
  const [data, setData] = useState<MirrorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cachedFetch<MirrorData>("/api/mobile/mirror")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mirror" subtitle="A reflection of who you are." />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mirror"
        subtitle={data.stats.displayName ? `A reflection of ${data.stats.displayName}` : "A reflection of who you are."}
      />

      {/* Narrative Bio */}
      {data.narrativeBio && (
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-foreground italic leading-relaxed">
              {data.narrativeBio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={MessageSquare} label="Messages" value={data.stats.totalMessages} />
        <StatCard icon={Bookmark} label="Memories" value={data.stats.totalMemories} />
        <StatCard icon={Clock} label="Days Active" value={data.stats.daysActive} />
      </div>

      {/* Patterns */}
      {data.patterns.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Patterns</h2>
          <div className="space-y-3">
            {data.patterns.map((pattern) => (
              <Card key={pattern.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      className={cn(
                        "text-[10px]",
                        CATEGORY_COLORS[pattern.category] ?? "bg-secondary",
                      )}
                    >
                      {pattern.category}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{pattern.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{pattern.description}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pattern.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{pattern.timeframe}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Milestones */}
      {data.milestones.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Milestones</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.milestones.slice(0, 6).map((m) => (
              <Card key={m.id}>
                <CardContent className="flex flex-col items-center py-4 text-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                    <Award className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">{m.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{m.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Archive */}
      {data.weeklyReports.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Weekly Archive</h2>
          <div className="space-y-3">
            {data.weeklyReports.map((report) => {
              const insights = parseInsights(report.insights);
              return (
                <Card key={report.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {formatWeekRange(report.week_start, report.week_end)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {insights.highlight && (
                      <MomentRow icon={Sparkles} label="Highlight" text={insights.highlight} />
                    )}
                    {insights.pattern && (
                      <MomentRow icon={TrendingUp} label="Pattern" text={insights.pattern} />
                    )}
                    {insights.question && (
                      <MomentRow icon={HelpCircle} label="Question" text={insights.question} />
                    )}
                    {!insights.highlight && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {report.summary}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Profile Facts */}
      {data.profileFacts.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">What Groot Knows</h2>
          <Card>
            <CardContent className="py-4">
              <div className="space-y-2">
                {data.profileFacts.slice(0, 15).map((fact) => (
                  <div key={fact.id} className="flex items-start justify-between gap-4 py-1">
                    <span className="text-xs text-muted-foreground min-w-[80px]">{fact.key}</span>
                    <span className="text-sm text-foreground text-right">{fact.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof MessageSquare; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-4 gap-1">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-xl font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

function MomentRow({ icon: Icon, label, text }: { icon: typeof Sparkles; label: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-sm text-foreground">{text}</p>
      </div>
    </div>
  );
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} — ${e.toLocaleDateString("en-US", opts)}`;
}

function parseInsights(raw: string | null) {
  if (!raw) return { highlight: "", pattern: "", question: "" };
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      highlight: parsed.highlight ?? "",
      pattern: parsed.pattern ?? "",
      question: parsed.question ?? "",
    };
  } catch {
    return { highlight: "", pattern: "", question: "" };
  }
}
