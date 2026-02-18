import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

/**
 * GET /api/graph — Build knowledge graph data from memories.
 * Returns nodes (memories) and links (connections by shared topics/tags).
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

  // Fetch recent messages with content
  const { data: messages } = await supabase
    .from("messages")
    .select("id, content, message_type, metadata, created_at")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!messages || messages.length === 0) {
    return NextResponse.json({ nodes: [], links: [] }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } });
  }

  // Fetch profile facts for context
  const { data: profile } = await supabase
    .from("user_profile")
    .select("category, key, value")
    .eq("user_id", userId);

  // Build nodes
  const nodes = messages.map((m) => ({
    id: m.id as string,
    label: ((m.content as string) ?? "").substring(0, 50),
    type: m.message_type as string,
    content: m.content as string,
    date: m.created_at as string,
    size: Math.min(((m.content as string) ?? "").length / 20, 10) + 3,
  }));

  // Add profile nodes
  const profileNodes = (profile ?? []).map((p) => ({
    id: `profile_${p.key}`,
    label: `${p.key}: ${(p.value as string).substring(0, 30)}`,
    type: "profile",
    content: `${p.category}/${p.key}: ${p.value}`,
    date: "",
    size: 5,
  }));

  // Build links based on word overlap (simple approach)
  const linkMap = new Map<string, { source: string; target: string; strength: number }>();
  const allNodes = [...nodes, ...profileNodes];

  for (let i = 0; i < Math.min(nodes.length, 50); i++) {
    const wordsA = new Set(
      (nodes[i]!.content ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 4),
    );

    for (let j = i + 1; j < Math.min(nodes.length, 50); j++) {
      const wordsB = (nodes[j]!.content ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      const overlap = wordsB.filter((w) => wordsA.has(w)).length;
      if (overlap >= 2) {
        const key = `${nodes[i]!.id}:${nodes[j]!.id}`;
        linkMap.set(key, {
          source: nodes[i]!.id,
          target: nodes[j]!.id,
          strength: Math.min(overlap / 5, 1),
        });
      }
    }
  }

  const links = [...linkMap.values()];

  return NextResponse.json({ nodes: allNodes, links }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } });
}
