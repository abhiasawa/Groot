"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Users } from "lucide-react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import MarkdownContent from "@/components/garden/markdown-content";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Person {
  name: string;
  relationship: string | null;
  lastMentioned: string | null;
  mentionCount: number;
  source: "profile" | "contacts" | "ai_detected";
}

// Deterministic avatar colors — Notion palette
const AVATAR_COLORS = [
  "#2383E2", "#D9730D", "#0F7B6C", "#6940A5", "#E03E3E",
  "#CB912F", "#448361", "#AD1A72", "#64473A", "#9B9A97",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [personMemories, setPersonMemories] = useState<Array<{ id: string; content: string; created_at: string }>>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  useEffect(() => {
    cachedFetch<{ people: Person[] }>("/api/people")
      .then((data) => setPeople(data.people ?? []))
      .catch(() => setPeople([]))
      .finally(() => setLoading(false));
  }, []);

  const handleExpand = async (name: string) => {
    if (expandedPerson === name) {
      setExpandedPerson(null);
      return;
    }
    setExpandedPerson(name);
    setLoadingMemories(true);
    try {
      const res = await fetch(`/api/memories?q=${encodeURIComponent(name)}&limit=5`);
      const data = await res.json();
      setPersonMemories(data.memories ?? []);
    } catch {
      setPersonMemories([]);
    }
    setLoadingMemories(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="People" subtitle="People from your conversations" />

      {people.length === 0 ? (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center text-center">
            <Users className="size-10 text-muted-foreground mb-3" />
            <p className="font-medium text-base mb-1 text-foreground">
              No people tracked yet
            </p>
            <p className="text-sm text-muted-foreground">
              As you talk to Groot about the people in your life, they&apos;ll appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {people.map((person) => {
            const avatarColor = getAvatarColor(person.name);
            const isExpanded = expandedPerson === person.name;

            return (
              <Collapsible
                key={person.name}
                open={isExpanded}
                onOpenChange={() => handleExpand(person.name)}
              >
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer py-0 transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-11">
                            <AvatarFallback
                              className="text-sm font-semibold text-white"
                              style={{ backgroundColor: avatarColor }}
                            >
                              {person.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate text-foreground">
                                {person.name}
                              </p>
                              <Badge
                                variant={
                                  person.mentionCount >= 10
                                    ? "default"
                                    : person.mentionCount >= 5
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-[9px] uppercase tracking-wide"
                              >
                                {person.mentionCount >= 10 ? "frequent" : person.mentionCount >= 5 ? "regular" : "few"}
                              </Badge>
                            </div>
                            {person.relationship && (
                              <p className="text-xs capitalize mt-0.5 text-muted-foreground">
                                {person.relationship}
                              </p>
                            )}
                            {person.lastMentioned && (
                              <p className="text-[11px] mt-0.5 text-muted-foreground">
                                Last mentioned {new Date(person.lastMentioned).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                            )}
                          </div>
                          <ChevronRight
                            className={cn(
                              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                              isExpanded && "rotate-90"
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleTrigger>
                </motion.div>

                {/* Expanded: related memories */}
                <CollapsibleContent>
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 ml-6 space-y-2 relative"
                    >
                      {/* Connecting line */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full -ml-3 opacity-30"
                        style={{ backgroundColor: avatarColor }}
                      />

                      {loadingMemories ? (
                        <Skeleton className="h-16 rounded-lg" />
                      ) : personMemories.length === 0 ? (
                        <p className="text-xs py-2 text-muted-foreground">
                          No related memories found.
                        </p>
                      ) : (
                        personMemories.map((m) => (
                          <Card key={m.id} className="py-0">
                            <CardContent className="p-3">
                              <MarkdownContent content={typeof m.content === "string" ? m.content : ""} className="text-xs line-clamp-2" />
                              <p className="mt-1.5 text-[10px] text-muted-foreground">
                                {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </motion.div>
                  </AnimatePresence>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
