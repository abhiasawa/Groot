"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import PageHeader from "@/components/garden/page-header";
import DiaryCard from "@/components/garden/diary-card";

interface Person {
  name: string;
  relationship: string | null;
  lastMentioned: string | null;
  mentionCount: number;
  source: "profile" | "contacts";
}

export default function PeoplePage() {
  const { user } = useCurrentUser();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [personMemories, setPersonMemories] = useState<Array<{ id: string; content: string; created_at: string }>>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/people")
      .then((r) => r.json())
      .then((data) => setPeople(data.people ?? []))
      .catch(() => setPeople([]))
      .finally(() => setLoading(false));
  }, [user]);

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
    <div className="space-y-6">
      <PageHeader title="People" subtitle="People from your conversations" />

      {people.length === 0 ? (
        <DiaryCard variant="paper" className="text-center">
          <span className="text-3xl block mb-2">👥</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>No people tracked yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            As you talk to Groot about the people in your life, they&apos;ll appear here automatically.
          </p>
        </DiaryCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {people.map((person) => (
            <div key={person.name}>
              <DiaryCard onClick={() => handleExpand(person.name)} className="!p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                    style={{ backgroundColor: "var(--color-primary)", color: "white" }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate" style={{ color: "var(--color-text)" }}>
                        {person.name}
                      </p>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: person.mentionCount >= 10 ? "var(--color-primary)" : person.mentionCount >= 5 ? "var(--color-accent)" : "var(--color-surface)",
                          color: person.mentionCount >= 5 ? "white" : "var(--color-text-secondary)",
                        }}
                      >
                        {person.mentionCount >= 10 ? "frequent" : person.mentionCount >= 5 ? "regular" : "few"}
                      </span>
                    </div>
                    {person.relationship && (
                      <p className="text-xs capitalize" style={{ color: "var(--color-text-secondary)" }}>
                        {person.relationship}
                      </p>
                    )}
                    {person.lastMentioned && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                        Last mentioned {new Date(person.lastMentioned).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              </DiaryCard>

              {/* Expanded: related memories */}
              {expandedPerson === person.name && (
                <div className="mt-2 ml-4 space-y-2">
                  {loadingMemories ? (
                    <div className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: "var(--color-surface)" }} />
                  ) : personMemories.length === 0 ? (
                    <p className="text-xs py-2" style={{ color: "var(--color-text-secondary)" }}>No related memories found.</p>
                  ) : (
                    personMemories.map((m) => (
                      <div key={m.id} className="p-3 rounded-lg text-xs" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}>
                        <p className="line-clamp-2">{typeof m.content === "string" ? m.content : ""}</p>
                        <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>
                          {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
