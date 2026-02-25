import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getLLMProvider } from "@/lib/providers/llm";
import { logger } from "@/lib/logger";

export interface BehavioralPattern {
  id: string;
  category: "emotional" | "behavioral" | "relational" | "growth";
  title: string;
  description: string;
  confidence: number; // 0-1
  timeframe: string;
}

/**
 * Detect behavioral patterns from a user's recent messages using LLM analysis.
 * Returns up to 5 key patterns.
 */
export async function detectPatterns(userId: string): Promise<BehavioralPattern[]> {
  const supabase = getSupabaseAdmin();

  try {
    // Get recent messages for analysis (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: messages } = await supabase
      .from("messages")
      .select("content, created_at")
      .eq("user_id", userId)
      .eq("direction", "incoming")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!messages || messages.length < 5) {
      return getDefaultPatterns();
    }

    // Get mood entries for emotional patterns
    const { data: moods } = await supabase
      .from("mood_entries")
      .select("mood, score, recorded_at")
      .eq("user_id", userId)
      .gte("recorded_at", thirtyDaysAgo)
      .order("recorded_at");

    const messageSummary = messages
      .map((m) => `[${new Date(m.created_at as string).toLocaleDateString()}] ${(m.content as string).slice(0, 150)}`)
      .join("\n");

    const moodSummary = (moods ?? [])
      .map((m) => `${new Date(m.recorded_at as string).toLocaleDateString()}: ${m.mood} (${m.score}/5)`)
      .join(", ");

    const provider = getLLMProvider();
    const response = await provider.generateResponse(
      `You are an expert behavioral analyst. Analyze the user's recent messages and mood data to identify recurring patterns. Output ONLY valid JSON.`,
      [
        {
          role: "user",
          content: `Analyze these messages and moods to find up to 5 behavioral patterns.

Messages (last 30 days):
${messageSummary}

Mood entries: ${moodSummary || "none"}

Output JSON array:
[
  {
    "category": "emotional|behavioral|relational|growth",
    "title": "Short pattern name (3-5 words)",
    "description": "One sentence describing the pattern",
    "confidence": 0.0-1.0,
    "timeframe": "e.g. last 2 weeks, ongoing"
  }
]

Be specific and grounded in the actual data. Don't invent patterns not supported by the messages.`,
        },
      ],
      { maxTokens: 2048, temperature: 0.4 },
    );

    try {
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<Omit<BehavioralPattern, "id">>;
        return parsed.slice(0, 5).map((p, i) => ({
          id: `pattern-${i}`,
          category: p.category || "behavioral",
          title: p.title || "Unnamed pattern",
          description: p.description || "",
          confidence: Math.min(1, Math.max(0, p.confidence || 0.5)),
          timeframe: p.timeframe || "recent",
        }));
      }
    } catch {
      logger.warn({ userId }, "Failed to parse pattern detection response");
    }

    return getDefaultPatterns();
  } catch (error) {
    logger.error({ error, userId }, "Failed to detect patterns");
    return getDefaultPatterns();
  }
}

function getDefaultPatterns(): BehavioralPattern[] {
  return [
    {
      id: "default-1",
      category: "growth",
      title: "Building a journaling habit",
      description: "You're developing a regular practice of reflection and self-awareness.",
      confidence: 0.6,
      timeframe: "ongoing",
    },
  ];
}
