"use client";

import { useEffect, useState } from "react";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import DiaryCard from "@/components/garden/diary-card";

interface Person {
  name: string;
  relationship: string | null;
  lastMentioned: string | null;
  mentionCount: number;
  source: "profile" | "contacts";
}

// Deterministic avatar colors — warm leather + indigo palette
const AVATAR_COLORS = [
  "#5C5FA8", "#8B6F4E", "#7B5B8A", "#8A5B5B", "#4A6B8A",
  "#6B7A5B", "#9E6B3B", "#5C4A7A", "#8A6B4A", "#6B5B8A",
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-32 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="People" subtitle="People from your conversations" />

      {people.length === 0 ? (
        <DiaryCard variant="paper" className="text-center !py-10">
          <span className="text-4xl block mb-3">&#x1F465;</span>
          <p className="font-medium text-base mb-1" style={{ color: "var(--color-text)", fontFamily: "var(--font-heading)" }}>
            No people tracked yet
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-diary)", fontStyle: "italic" }}>
            As you talk to Groot about the people in your life, they&apos;ll appear here automatically.
          </p>
        </DiaryCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {people.map((person) => {
            const avatarColor = getAvatarColor(person.name);
            const isExpanded = expandedPerson === person.name;

            return (
              <div key={person.name}>
                <DiaryCard
                  variant="paper"
                  onClick={() => handleExpand(person.name)}
                  className="!p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 shadow-sm"
                      style={{ backgroundColor: avatarColor, color: "white" }}
                    >
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className="font-medium text-sm truncate"
                          style={{ color: "var(--color-text)", fontFamily: "var(--font-heading)" }}
                        >
                          {person.name}
                        </p>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wide"
                          style={{
                            backgroundColor: person.mentionCount >= 10 ? "var(--color-primary)" : person.mentionCount >= 5 ? "var(--color-accent)" : "var(--color-surface)",
                            color: person.mentionCount >= 5 ? "white" : "var(--color-text-secondary)",
                          }}
                        >
                          {person.mentionCount >= 10 ? "frequent" : person.mentionCount >= 5 ? "regular" : "few"}
                        </span>
                      </div>
                      {person.relationship && (
                        <p
                          className="text-xs capitalize mt-0.5"
                          style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-diary)", fontStyle: "italic" }}
                        >
                          {person.relationship}
                        </p>
                      )}
                      {person.lastMentioned && (
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                          Last mentioned {new Date(person.lastMentioned).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                    <span className="text-xs transition-transform" style={{ color: "var(--color-text-secondary)", transform: isExpanded ? "rotate(90deg)" : "none" }}>
                      &#x25B8;
                    </span>
                  </div>
                </DiaryCard>

                {/* Expanded: related memories */}
                {isExpanded && (
                  <div className="mt-2 ml-6 space-y-2 relative">
                    {/* Connecting line */}
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full -ml-3" style={{ backgroundColor: avatarColor, opacity: 0.3 }} />

                    {loadingMemories ? (
                      <div className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: "var(--color-surface)" }} />
                    ) : personMemories.length === 0 ? (
                      <p className="text-xs py-2 italic" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-diary)" }}>
                        No related memories found.
                      </p>
                    ) : (
                      personMemories.map((m) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl text-xs"
                          style={{
                            backgroundColor: "var(--color-paper)",
                            boxShadow: "var(--shadow-paper)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text)",
                          }}
                        >
                          <p className="line-clamp-2" style={{ fontFamily: "var(--font-diary)", lineHeight: 1.6 }}>
                            {typeof m.content === "string" ? m.content : ""}
                          </p>
                          <p className="mt-1.5 text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
                            {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
