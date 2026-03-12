"use client";

import { useEffect } from "react";
import { cachedFetch } from "@/lib/garden/fetch-cache";

/**
 * Silently prefetches common API routes after the current page loads,
 * so subsequent navigations feel instant.
 */
const PREFETCH_ROUTES = [
  "/api/garden/home",
  "/api/settings",
  "/api/memories?limit=100",
  "/api/habits?include=checkins",
  "/api/tasks",
  "/api/people",
];

export default function Prefetcher() {
  useEffect(() => {
    // Wait for current page to finish loading before prefetching
    const id = window.setTimeout(() => {
      for (const url of PREFETCH_ROUTES) {
        cachedFetch(url).catch(() => {});
      }
    }, 1500);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
