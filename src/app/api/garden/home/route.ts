import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

/**
 * GET /api/garden/home — Consolidated home page data.
 * Single request replaces 6 separate API calls.
 * All DB queries run in parallel after a single auth check.
 */
export async function GET() {
  let userId: string;
  let displayName: string;
  let createdAt: string;
  try {
    const user = await getAuthenticatedPortalUser();
    userId = user.id;
    displayName = user.display_name || "friend";
    createdAt = user.created_at;
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();

  // Flashback date: 30 days ago
  const flashbackDate = new Date();
  flashbackDate.setDate(flashbackDate.getDate() - 30);
  const flashbackDateStr = flashbackDate.toISOString().split("T")[0]!;

  // All queries in parallel — single DB connection, no extra cold starts
  const [memoriesRes, tasksRes, remindersRes, flashbackRes, moodRes, peopleProfileRes, contactsRes, habitsRes] = await Promise.all([
    // 1. Recent memories (5)
    supabase
      .from("messages")
      .select("id, message_type, content, created_at", { count: "exact" })
      .eq("user_id", userId)
      .eq("direction", "inbound")
      .not("content", "is", null)
      .order("created_at", { ascending: false })
      .limit(5),

    // 2. Pending tasks count
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_completed", false),

    // 3. Upcoming reminders count
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_sent", false),

    // 4. Flashback (memory from 30 days ago)
    supabase
      .from("messages")
      .select("content, created_at")
      .eq("user_id", userId)
      .eq("direction", "inbound")
      .not("content", "is", null)
      .gte("created_at", `${flashbackDateStr}T00:00:00`)
      .lt("created_at", `${flashbackDateStr}T23:59:59`)
      .order("created_at", { ascending: false })
      .limit(1),

    // 5. Recent mood (last 7 days of outbound messages with mood metadata)
    supabase
      .from("messages")
      .select("metadata")
      .eq("user_id", userId)
      .eq("direction", "outbound")
      .not("metadata", "is", null)
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(20),

    // 6. People from profile
    supabase
      .from("user_profile")
      .select("key, value")
      .eq("user_id", userId)
      .eq("category", "static"),

    // 7. People from contacts
    supabase
      .from("contacts")
      .select("name")
      .eq("owner_user_id", userId),

    // 8. Habits count
    supabase
      .from("habits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  // Extract recent mood from messages metadata
  let recentMood: string | null = null;
  for (const msg of moodRes.data ?? []) {
    const meta = msg.metadata as Record<string, unknown> | null;
    const mood = (meta?.detectedMood as string) ?? (meta?.mood as string);
    if (mood) { recentMood = mood.toLowerCase(); break; }
  }

  // Count unique people
  const PEOPLE_KEYS = ["family", "partner", "spouse", "wife", "husband", "friend", "sibling",
    "parent", "mother", "father", "brother", "sister", "son", "daughter", "child",
    "boss", "colleague", "roommate", "girlfriend", "boyfriend", "relationship"];
  const seen = new Set<string>();
  for (const fact of peopleProfileRes.data ?? []) {
    const key = (fact.key as string).toLowerCase();
    if (PEOPLE_KEYS.some(pk => key.includes(pk))) {
      seen.add((fact.value as string).toLowerCase().trim());
    }
  }
  for (const c of contactsRes.data ?? []) {
    seen.add((c.name as string).toLowerCase().trim());
  }

  const response = NextResponse.json({
    displayName,
    createdAt,
    memoriesCount: memoriesRes.count ?? 0,
    recentMemories: memoriesRes.data ?? [],
    pendingTasks: tasksRes.count ?? 0,
    upcomingReminders: remindersRes.count ?? 0,
    flashback: flashbackRes.data?.[0] ?? null,
    recentMood,
    peopleCount: seen.size,
    habitsCount: habitsRes.count ?? 0,
  });

  // Cache for 30 seconds, allow stale for 60 more
  response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
  return response;
}
