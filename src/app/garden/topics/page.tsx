"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Hash, Search, ChevronRight, Tag, X } from "lucide-react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import MarkdownContent from "@/components/garden/markdown-content";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberTicker } from "@/components/magicui/number-ticker";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface TopicMemory {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  mood: string | null;
}

interface Topic {
  name: string;
  memoryCount: number;
  lastMentioned: string;
  dominantMood: string | null;
  sampleMemories: TopicMemory[];
}

interface TopicsData {
  topics: Topic[];
  totalTopics: number;
  totalTaggedMemories: number;
}

// Deterministic topic colors — Notion palette
const TOPIC_COLORS = [
  "#2383E2", "#D9730D", "#0F7B6C", "#6940A5", "#E03E3E",
  "#CB912F", "#448361", "#AD1A72", "#64473A", "#9B9A97",
];

function getTopicColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TOPIC_COLORS[Math.abs(hash) % TOPIC_COLORS.length]!;
}

const MOOD_DOT: Record<string, string> = {
  happy: "bg-mood-great", excited: "bg-mood-great", grateful: "bg-mood-great", great: "bg-mood-great",
  good: "bg-mood-good", calm: "bg-mood-good", motivated: "bg-mood-good", positive: "bg-mood-good",
  okay: "bg-mood-okay", neutral: "bg-mood-okay", fine: "bg-mood-okay",
  tired: "bg-mood-low", anxious: "bg-mood-low", stressed: "bg-mood-low", low: "bg-mood-low",
  sad: "bg-mood-bad", frustrated: "bg-mood-bad", angry: "bg-mood-bad", bad: "bg-mood-bad",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function TopicsPage() {
  const [data, setData] = useState<TopicsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    cachedFetch<TopicsData>("/api/topics")
      .then(setData)
      .catch(() => setData({ topics: [], totalTopics: 0, totalTaggedMemories: 0 }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTopics = useMemo(() => {
    if (!data) return [];
    if (!searchQuery) return data.topics;
    const q = searchQuery.toLowerCase();
    return data.topics.filter((t) => t.name.includes(q));
  }, [data, searchQuery]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Topics"
        subtitle={data && data.totalTopics > 0 ? `${data.totalTopics} topics from your conversations` : "Your knowledge organized"}
      />

      {/* Summary strip */}
      {data && data.totalTopics > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <CardContent className="py-4 px-3">
              <NumberTicker value={data.totalTopics} className="text-2xl font-bold tracking-tight text-primary" />
              <p className="text-[11px] mt-1 uppercase tracking-wide text-muted-foreground">topics</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-4 px-3">
              <NumberTicker value={data.totalTaggedMemories} className="text-2xl font-bold tracking-tight text-accent" />
              <p className="text-[11px] mt-1 uppercase tracking-wide text-muted-foreground">tagged memories</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      {data && data.totalTopics > 0 && (
        <div className="sticky top-0 z-10 py-2 bg-background">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter topics..."
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Topics grid */}
      {!data || data.totalTopics === 0 ? (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center text-center">
            <Tag className="size-10 text-muted-foreground mb-3" />
            <p className="font-medium text-base mb-1 text-foreground">No topics yet</p>
            <p className="text-sm text-muted-foreground">
              As you talk to Groot, topics from your conversations will be organized here automatically.
            </p>
          </CardContent>
        </Card>
      ) : filteredTopics.length === 0 ? (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center text-center">
            <Search className="size-10 text-muted-foreground mb-3" />
            <p className="font-medium text-base mb-1 text-foreground">No topics match &ldquo;{searchQuery}&rdquo;</p>
            <p className="text-sm text-muted-foreground">Try a different search term.</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {filteredTopics.map((topic) => {
            const color = getTopicColor(topic.name);
            const isExpanded = expandedTopic === topic.name;
            const moodDotClass = topic.dominantMood ? (MOOD_DOT[topic.dominantMood] ?? "bg-border") : null;

            return (
              <motion.div key={topic.name} variants={itemVariants}>
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => setExpandedTopic(isExpanded ? null : topic.name)}
                >
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer py-0 transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="size-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${color}18` }}
                          >
                            <Hash className="size-4" style={{ color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm capitalize truncate text-foreground">
                                {topic.name}
                              </p>
                              <Badge
                                variant={topic.memoryCount >= 10 ? "default" : topic.memoryCount >= 5 ? "secondary" : "outline"}
                                className="text-[9px] uppercase tracking-wide shrink-0"
                              >
                                {topic.memoryCount}
                              </Badge>
                              {moodDotClass && (
                                <div className={cn("size-2 rounded-full shrink-0", moodDotClass)} />
                              )}
                            </div>
                            <p className="text-[11px] mt-0.5 text-muted-foreground">
                              Last mentioned {new Date(topic.lastMentioned).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <ChevronRight
                            className={cn(
                              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                              isExpanded && "rotate-90",
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 ml-6 space-y-2 relative"
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full -ml-3 opacity-30"
                          style={{ backgroundColor: color }}
                        />

                        {topic.sampleMemories.length === 0 ? (
                          <p className="text-xs py-2 text-muted-foreground">No memories found.</p>
                        ) : (
                          topic.sampleMemories.map((m) => (
                            <Card key={m.id} className="py-0">
                              <CardContent className="p-3">
                                <MarkdownContent content={m.content} className="text-xs line-clamp-2" />
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {m.message_type === "audio" ? "Voice" : m.message_type === "image" ? "Photo" : "Text"}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
