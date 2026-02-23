import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

interface TopicMemory {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  mood: string | null;
}

interface TopicSummary {
  name: string;
  memoryCount: number;
  lastMentioned: string;
  dominantMood: string | null;
  sampleMemories: TopicMemory[];
}

/**
 * GET /api/topics — Group memories by AI-extracted memoryTags.
 * Returns topics sorted by frequency with sample memories.
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

  // Fetch inbound messages that have memoryTags in metadata
  const { data: messages } = await supabase
    .from("messages")
    .select("id, content, message_type, metadata, created_at")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .not("content", "is", null)
    .not("metadata", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { topics: [], totalTopics: 0, totalTaggedMemories: 0 },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } },
    );
  }

  // Group by tag
  const tagMap = new Map<string, {
    messages: typeof messages;
    moods: Map<string, number>;
  }>();

  let taggedCount = 0;

  for (const msg of messages) {
    const metadata = msg.metadata as Record<string, unknown> | null;
    const tags = metadata?.memoryTags as string[] | undefined;
    if (!tags || !Array.isArray(tags) || tags.length === 0) continue;

    taggedCount++;
    const mood = (metadata?.detectedMood as string) ?? null;

    for (const tag of tags) {
      const normalized = tag.toLowerCase().trim();
      if (!normalized) continue;

      if (!tagMap.has(normalized)) {
        tagMap.set(normalized, { messages: [], moods: new Map() });
      }
      const entry = tagMap.get(normalized)!;
      entry.messages.push(msg);
      if (mood) {
        entry.moods.set(mood, (entry.moods.get(mood) ?? 0) + 1);
      }
    }
  }

  // Build topic summaries sorted by frequency
  const topics: TopicSummary[] = [...tagMap.entries()]
    .map(([name, { messages: msgs, moods }]) => {
      let dominantMood: string | null = null;
      let maxCount = 0;
      for (const [mood, count] of moods) {
        if (count > maxCount) {
          dominantMood = mood;
          maxCount = count;
        }
      }

      return {
        name,
        memoryCount: msgs.length,
        lastMentioned: msgs[0]!.created_at as string,
        dominantMood,
        sampleMemories: msgs.slice(0, 5).map((m) => ({
          id: m.id as string,
          content: ((m.content as string) ?? "").substring(0, 200),
          message_type: m.message_type as string,
          created_at: m.created_at as string,
          mood: ((m.metadata as Record<string, unknown>)?.detectedMood as string) ?? null,
        })),
      };
    })
    .sort((a, b) => b.memoryCount - a.memoryCount);

  return NextResponse.json(
    { topics, totalTopics: topics.length, totalTaggedMemories: taggedCount },
    { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } },
  );
}
