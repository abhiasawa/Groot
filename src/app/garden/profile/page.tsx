"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import PageHeader from "@/components/garden/page-header";
import DiaryCard from "@/components/garden/diary-card";
import Link from "next/link";

interface ProfileFact {
  id: string;
  key: string;
  value: string;
  confidence: number;
  source: string;
  lastMentioned: string | null;
}

interface ProfileData {
  facts: {
    static: ProfileFact[];
    dynamic: ProfileFact[];
    preference: ProfileFact[];
    goal: ProfileFact[];
  };
}

const CATEGORY_LABELS: Record<string, { title: string; icon: string; description: string }> = {
  static: { title: "About You", icon: "👤", description: "Who you are" },
  dynamic: { title: "Current", icon: "⚡", description: "What's happening now" },
  preference: { title: "Preferences", icon: "💜", description: "What you like" },
  goal: { title: "Goals", icon: "🎯", description: "What you're working toward" },
};

export default function ProfilePage() {
  const { user } = useCurrentUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (factId: string) => {
    try {
      await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factId }),
      });
      // Remove from local state
      if (profile) {
        const updated = { ...profile, facts: { ...profile.facts } };
        for (const cat of Object.keys(updated.facts) as Array<keyof typeof updated.facts>) {
          updated.facts[cat] = updated.facts[cat].filter((f) => f.id !== factId);
        }
        setProfile(updated);
      }
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 rounded" style={{ backgroundColor: "var(--color-surface)" }} />
        <div className="h-24 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
        <div className="h-48 rounded-xl" style={{ backgroundColor: "var(--color-surface)" }} />
      </div>
    );
  }

  const totalFacts = profile
    ? Object.values(profile.facts).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader title="Profile" subtitle="What Groot knows about you" />

      {/* Identity Header */}
      <DiaryCard variant="paper">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}
          >
            {(user?.display_name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
              {user?.display_name ?? "Unknown"}
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Member since {user ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
              {" · "}{totalFacts} fact{totalFacts !== 1 ? "s" : ""} learned
            </p>
          </div>
        </div>
      </DiaryCard>

      {/* Facts by Category */}
      {totalFacts === 0 ? (
        <DiaryCard variant="paper" className="text-center">
          <span className="text-3xl block mb-2">🧠</span>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>Groot is still getting to know you</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Share about yourself on WhatsApp and facts will appear here automatically.
          </p>
        </DiaryCard>
      ) : (
        (["static", "dynamic", "preference", "goal"] as const).map((cat) => {
          const facts = profile?.facts[cat] ?? [];
          if (facts.length === 0) return null;
          const meta = CATEGORY_LABELS[cat]!;
          return (
            <section key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span>{meta.icon}</span>
                <h3 className="text-base font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
                  {meta.title}
                </h3>
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{meta.description}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {facts.map((fact) => (
                  <DiaryCard key={fact.id} className="!p-3 group relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--color-text-secondary)" }}>
                          {fact.key}
                        </p>
                        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                          {fact.value}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(fact.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-0.5 rounded"
                        style={{ color: "var(--color-danger)" }}
                        title="Remove this fact"
                      >
                        ✕
                      </button>
                    </div>
                  </DiaryCard>
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Link to Knowledge Graph */}
      <div className="pt-4">
        <Link
          href="/garden/graph"
          className="text-sm underline"
          style={{ color: "var(--color-primary)" }}
        >
          View your knowledge graph →
        </Link>
      </div>
    </div>
  );
}
