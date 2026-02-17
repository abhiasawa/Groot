/**
 * Client-side fetch cache with stale-while-revalidate semantics.
 * Stores API responses in memory so page navigations are instant.
 * Returns stale data immediately, refreshes in background.
 */

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const STALE_MS = 30_000; // 30 seconds before background refresh

export async function cachedFetch<T>(url: string, maxAge = STALE_MS): Promise<T> {
  const entry = cache.get(url);
  const now = Date.now();

  // Return cached data and refresh in background if stale
  if (entry) {
    if (now - entry.timestamp > maxAge) {
      // Stale — refresh in background, return stale immediately
      fetchAndCache(url);
    }
    return entry.data as T;
  }

  // No cache — must wait for fresh data
  return fetchAndCache<T>(url);
}

async function fetchAndCache<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  cache.set(url, { data, timestamp: Date.now() });
  return data as T;
}

export function invalidateCache(urlPrefix?: string) {
  if (!urlPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(urlPrefix)) cache.delete(key);
  }
}
