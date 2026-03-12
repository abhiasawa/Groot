"use client";

import { useEffect, useState } from "react";

interface CurrentUser {
  id: string;
  whatsapp_number: string;
  display_name: string | null;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  created_at: string;
}

// Module-level cache — persists across navigations, fetched only once
let cachedUser: CurrentUser | null = null;
let fetchPromise: Promise<CurrentUser | null> | null = null;

function fetchUser(): Promise<CurrentUser | null> {
  if (cachedUser) return Promise.resolve(cachedUser);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/me", { credentials: "include" })
    .then((r) => r.json())
    .then((d) => {
      cachedUser = d.user ?? null;
      return cachedUser;
    })
    .catch(() => {
      cachedUser = null;
      return null;
    });

  return fetchPromise;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    if (cachedUser) {
      // Already cached — sync state without re-fetching
      if (!user) setUser(cachedUser);
      if (loading) setLoading(false);
      return;
    }
    let cancelled = false;
    fetchUser().then((u) => {
      if (!cancelled) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, loading };
}
