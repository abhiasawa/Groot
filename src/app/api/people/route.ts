import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { logger } from "@/lib/logger";

interface PersonEntry {
  name: string;
  relationship: string | null;
  context: string | null;
  lastMentioned: string | null;
  mentionCount: number;
  source: "profile" | "contacts" | "ai_detected";
}

const SOURCE_PRIORITY: Record<PersonEntry["source"], number> = {
  ai_detected: 3,
  profile: 2,
  contacts: 1,
};

function chooseLatestDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/**
 * GET /api/people — Auto-extracted people from profile + contacts.
 */
export async function GET(request: NextRequest) {
  let userId: string;
  try {
    const user = await getAuthenticatedPortalUser(request);
    userId = user.id;
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const peopleMap = new Map<string, PersonEntry>();

  function upsertPerson(entry: PersonEntry) {
    const normalized = entry.name.toLowerCase().trim();
    if (!normalized) return;

    const existing = peopleMap.get(normalized);
    if (!existing) {
      peopleMap.set(normalized, entry);
      return;
    }

    const source =
      SOURCE_PRIORITY[entry.source] > SOURCE_PRIORITY[existing.source]
        ? entry.source
        : existing.source;

    peopleMap.set(normalized, {
      name: existing.name.length >= entry.name.length ? existing.name : entry.name,
      relationship: existing.relationship ?? entry.relationship,
      context: existing.context ?? entry.context,
      lastMentioned: chooseLatestDate(existing.lastMentioned, entry.lastMentioned),
      mentionCount: existing.mentionCount + entry.mentionCount,
      source,
    });
  }

  // Fetch profile facts, AI-detected people, and contacts in parallel
  const [{ data: profileFacts }, { data: detectedPeople }, { data: contacts }] = await Promise.all([
    supabase
      .from("user_profile")
      .select("key, value, last_mentioned_at")
      .eq("user_id", userId)
      .eq("category", "static"),
    supabase
      .from("user_profile")
      .select("key, value, last_mentioned_at")
      .eq("user_id", userId)
      .eq("category", "people"),
    supabase
      .from("contacts")
      .select("name, last_messaged_at")
      .eq("owner_user_id", userId),
  ]);

  const PEOPLE_KEYS = ["family", "partner", "spouse", "wife", "husband", "friend", "sibling", "parent",
    "mother", "father", "brother", "sister", "son", "daughter", "child", "boss", "colleague",
    "roommate", "girlfriend", "boyfriend", "relationship"];

  for (const fact of profileFacts ?? []) {
    const key = (fact.key as string).toLowerCase();
    if (PEOPLE_KEYS.some(pk => key.includes(pk))) {
      const name = fact.value as string;
      upsertPerson({
        name,
        relationship: (fact.key as string).replace(/_/g, " "),
        context: null,
        lastMentioned: fact.last_mentioned_at as string | null,
        mentionCount: 1,
        source: "profile",
      });
    }
  }

  // AI-detected people (category = "people")
  for (const entry of detectedPeople ?? []) {
    try {
      const parsed = JSON.parse(entry.value as string) as {
        name?: string;
        relationship?: string | null;
        context?: string | null;
      };
      const name = parsed.name ?? (entry.key as string).replace(/_/g, " ");
      upsertPerson({
        name,
        relationship: parsed.relationship ?? null,
        context: parsed.context ?? null,
        lastMentioned: entry.last_mentioned_at as string | null,
        mentionCount: 1,
        source: "ai_detected",
      });
    } catch {
      // value isn't valid JSON — use key as name fallback
      const name = (entry.key as string).replace(/_/g, " ");
      upsertPerson({
        name,
        relationship: null,
        context: null,
        lastMentioned: entry.last_mentioned_at as string | null,
        mentionCount: 1,
        source: "ai_detected",
      });
    }
  }

  for (const contact of contacts ?? []) {
    upsertPerson({
      name: contact.name as string,
      relationship: "contact",
      context: null,
      lastMentioned: contact.last_messaged_at as string | null,
      mentionCount: 1,
      source: "contacts",
    });
  }

  const people = [...peopleMap.values()];

  // Sort: most recently mentioned first
  people.sort((a, b) => {
    if (!a.lastMentioned && !b.lastMentioned) return 0;
    if (!a.lastMentioned) return 1;
    if (!b.lastMentioned) return -1;
    return b.lastMentioned.localeCompare(a.lastMentioned);
  });

  logger.info({ userId, peopleCount: people.length }, "People loaded for portal");
  return NextResponse.json({ people }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } });
}
