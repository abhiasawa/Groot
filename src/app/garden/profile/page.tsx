"use client";

import { useEffect, useState } from "react";
import { User, Zap, Heart, Target, Brain, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

const CATEGORY_LABELS: Record<string, { title: string; icon: React.ReactNode; description: string }> = {
  static: { title: "About You", icon: <User className="size-4" />, description: "Who you are" },
  dynamic: { title: "Current", icon: <Zap className="size-4" />, description: "What's happening now" },
  preference: { title: "Preferences", icon: <Heart className="size-4" />, description: "What you like" },
  goal: { title: "Goals", icon: <Target className="size-4" />, description: "What you're working toward" },
};

export default function ProfilePage() {
  const { user } = useCurrentUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cachedFetch<ProfileData>("/api/profile")
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (factId: string) => {
    try {
      await fetch("/api/profile", {
        method: "DELETE",
        credentials: "include",
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
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
      <Card>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {(user?.display_name ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {user?.display_name ?? "Unknown"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Member since {user ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "\u2014"}
              {" \u00B7 "}{totalFacts} fact{totalFacts !== 1 ? "s" : ""} learned
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Facts by Category */}
      {totalFacts === 0 ? (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center text-center">
            <Brain className="size-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Groot is still getting to know you</p>
            <p className="text-sm mt-1 text-muted-foreground">
              Share about yourself on WhatsApp and facts will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        (["static", "dynamic", "preference", "goal"] as const).map((cat) => {
          const facts = profile?.facts[cat] ?? [];
          if (facts.length === 0) return null;
          const meta = CATEGORY_LABELS[cat]!;
          return (
            <section key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-muted-foreground">{meta.icon}</span>
                <h3 className="text-base font-semibold text-foreground">
                  {meta.title}
                </h3>
                <span className="text-xs text-muted-foreground">{meta.description}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {facts.map((fact) => (
                  <Card key={fact.id} className="group py-0">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide mb-0.5 text-muted-foreground">
                            {fact.key}
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {fact.value}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(fact.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          title="Remove this fact"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Link to Topics */}
      <div className="pt-4">
        <Button variant="link" asChild className="px-0">
          <Link href="/garden/topics">
            Browse your topics &rarr;
          </Link>
        </Button>
      </div>
    </div>
  );
}
