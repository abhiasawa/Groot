import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

const KNOWN_MOODS = new Set([
  "great", "happy", "excited", "energetic",
  "good", "positive", "motivated", "calm", "grateful",
  "okay", "neutral", "fine", "busy",
  "low", "tired", "anxious", "stressed", "overwhelmed",
  "bad", "sad", "angry", "frustrated", "upset",
]);

const POSITIVE_WORDS = [
  "happy", "great", "excited", "awesome", "nice", "good", "grateful",
  "motivated", "progress", "win", "worked", "better",
];

const NEGATIVE_WORDS = [
  "sad", "stressed", "anxious", "overwhelmed", "angry", "upset",
  "frustrated", "tired", "bad", "worried", "burnout", "exhausted",
];

function normalizeMood(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  return KNOWN_MOODS.has(normalized) ? normalized : null;
}

function inferMoodFromText(text: string): string | null {
  const normalized = text.toLowerCase();
  const positiveHits = POSITIVE_WORDS.filter((word) => normalized.includes(word)).length;
  const negativeHits = NEGATIVE_WORDS.filter((word) => normalized.includes(word)).length;
  if (positiveHits === 0 && negativeHits === 0) return null;
  if (positiveHits > negativeHits) return "good";
  if (negativeHits > positiveHits) return "low";
  return "okay";
}

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

  // Fetch inbound messages that have memoryTags in metadata (text + voice)
  const { data: messages } = await supabase
    .from("messages")
    .select("id, content, media_description, message_type, metadata, created_at")
    .eq("user_id", userId)
    .eq("direction", "inbound")
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
  const messageMoodMap = new Map<string, string | null>();

  let taggedCount = 0;

  for (const msg of messages) {
    // Skip truly empty messages (no content and no media_description)
    if (!msg.content && !msg.media_description) continue;

    const metadata = msg.metadata as Record<string, unknown> | null;
    const tags = metadata?.memoryTags as string[] | undefined;
    if (!tags || !Array.isArray(tags) || tags.length === 0) continue;

    taggedCount++;
    const explicitMood = normalizeMood(
      ((metadata?.detectedMood as string | undefined) ?? (metadata?.mood as string | undefined)),
    );
    const inferredMood = !explicitMood
      ? inferMoodFromText(`${msg.content ?? ""}\n${msg.media_description ?? ""}`)
      : null;
    const mood = explicitMood ?? inferredMood;
    messageMoodMap.set(msg.id as string, mood);

    for (const tag of tags) {
      // Remap "general" → "daily-life" for legacy messages
      let normalized = tag.toLowerCase().trim();
      if (!normalized) continue;
      if (normalized === "general") normalized = "daily-life";

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
          content: ((m.content as string) || (m.media_description as string) || "").substring(0, 200),
          message_type: m.message_type as string,
          created_at: m.created_at as string,
          mood: messageMoodMap.get(m.id as string) ?? null,
        })),
      };
    })
    .sort((a, b) => b.memoryCount - a.memoryCount);

  return NextResponse.json(
    { topics, totalTopics: topics.length, totalTaggedMemories: taggedCount },
    { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } },
  );
}
