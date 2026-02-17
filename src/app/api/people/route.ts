import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { logger } from "@/lib/logger";

interface PersonEntry {
  name: string;
  relationship: string | null;
  lastMentioned: string | null;
  mentionCount: number;
  source: "profile" | "contacts";
}

/**
 * GET /api/people — Auto-extracted people from profile + contacts.
 */
export async function GET() {
  let userId: string;
  try {
    const user = await getAuthenticatedPortalUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const people: PersonEntry[] = [];
  const seen = new Set<string>();

  // 1. Profile facts that mention people (relationship keys, family, etc.)
  const { data: profileFacts } = await supabase
    .from("user_profile")
    .select("key, value, last_mentioned_at")
    .eq("user_id", userId)
    .eq("category", "static");

  const PEOPLE_KEYS = ["family", "partner", "spouse", "wife", "husband", "friend", "sibling", "parent",
    "mother", "father", "brother", "sister", "son", "daughter", "child", "boss", "colleague",
    "roommate", "girlfriend", "boyfriend", "relationship"];

  for (const fact of profileFacts ?? []) {
    const key = (fact.key as string).toLowerCase();
    if (PEOPLE_KEYS.some(pk => key.includes(pk))) {
      const name = fact.value as string;
      const normalized = name.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        people.push({
          name,
          relationship: (fact.key as string).replace(/_/g, " "),
          lastMentioned: fact.last_mentioned_at as string | null,
          mentionCount: 1,
          source: "profile",
        });
      }
    }
  }

  // 2. Contacts table
  const { data: contacts } = await supabase
    .from("contacts")
    .select("name, last_messaged_at")
    .eq("owner_user_id", userId);

  for (const contact of contacts ?? []) {
    const normalized = (contact.name as string).toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      people.push({
        name: contact.name as string,
        relationship: "contact",
        lastMentioned: contact.last_messaged_at as string | null,
        mentionCount: 1,
        source: "contacts",
      });
    }
  }

  // Sort: most recently mentioned first
  people.sort((a, b) => {
    if (!a.lastMentioned && !b.lastMentioned) return 0;
    if (!a.lastMentioned) return 1;
    if (!b.lastMentioned) return -1;
    return b.lastMentioned.localeCompare(a.lastMentioned);
  });

  logger.info({ userId, peopleCount: people.length }, "People loaded for portal");
  return NextResponse.json({ people });
}
