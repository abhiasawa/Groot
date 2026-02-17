import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Profile Builder — extracts and upserts facts about the user.
 *
 * Profile categories:
 * - static: name, age, location, occupation, family (rarely changes)
 * - dynamic: weight, mood, current project (changes often)
 * - preference: food, music, communication style
 * - goal: fitness targets, learning goals, career goals
 *
 * Phase 3: Manual extraction via patterns.
 * Phase 5: AI-powered extraction from Claude metadata.
 */

export interface ProfileFact {
  category: "static" | "dynamic" | "preference" | "goal";
  key: string;
  value: string;
  confidence: number;
  source: string;
}

/**
 * Extract profile facts from a message using pattern matching.
 * Returns an array of facts to upsert (may be empty).
 */
export function extractProfileFacts(text: string): ProfileFact[] {
  const facts: ProfileFact[] = [];
  const lower = text.toLowerCase();

  // ─── Static facts ───

  // "My name is X" / "I'm X" / "Call me X"
  const nameMatch = text.match(
    /(?:my name is|i'm|i am|call me|they call me)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i,
  );
  if (nameMatch?.[1]) {
    facts.push({
      category: "static",
      key: "name",
      value: nameMatch[1],
      confidence: 0.9,
      source: "message_extraction",
    });
  }

  // "I live in X" / "I'm from X" / "I'm based in X"
  const locationMatch = text.match(
    /(?:i live in|i'm from|i am from|i'm based in|i am based in|based out of)\s+(.+?)(?:\.|,|$)/i,
  );
  if (locationMatch?.[1]) {
    facts.push({
      category: "static",
      key: "location",
      value: locationMatch[1].trim(),
      confidence: 0.8,
      source: "message_extraction",
    });
  }

  // "I'm a/an X" (occupation)
  const occupationMatch = text.match(
    /(?:i'm a|i am a|i'm an|i am an|i work as a|i work as an)\s+(.+?)(?:\.|,|$)/i,
  );
  if (occupationMatch?.[1] && !lower.includes("feeling") && !lower.includes("bit")) {
    facts.push({
      category: "static",
      key: "occupation",
      value: occupationMatch[1].trim(),
      confidence: 0.7,
      source: "message_extraction",
    });
  }

  // "My X's name is Y" / "My X is Y" (family/relationships)
  const relationMatch = text.match(
    /my\s+(sister|brother|wife|husband|partner|mom|dad|mother|father|son|daughter|friend|boss|manager)(?:'s name is|\s+is)\s+(.+?)(?:\.|,|$)/i,
  );
  if (relationMatch?.[1] && relationMatch[2]) {
    facts.push({
      category: "static",
      key: `${relationMatch[1].toLowerCase()}_name`,
      value: relationMatch[2].trim(),
      confidence: 0.9,
      source: "message_extraction",
    });
  }

  // Age: "I'm X years old" / "I am X"
  const ageMatch = text.match(/(?:i'm|i am)\s+(\d{1,3})\s*(?:years?\s*old|yrs?\s*old)/i);
  if (ageMatch?.[1]) {
    facts.push({
      category: "static",
      key: "age",
      value: ageMatch[1],
      confidence: 0.9,
      source: "message_extraction",
    });
  }

  // ─── Dynamic facts ───

  // Weight: "my weight is X" / "I weigh X" / "current weight X"
  const weightMatch = text.match(
    /(?:my weight is|i weigh|current weight|weight today|weight:?)\s*(\d{2,3}(?:\.\d+)?)\s*(kg|lbs?|pounds?|kilos?)?/i,
  );
  if (weightMatch?.[1]) {
    const unit = weightMatch[2]?.toLowerCase().startsWith("l") ? "lbs" : "kg";
    facts.push({
      category: "dynamic",
      key: "weight",
      value: `${weightMatch[1]} ${unit}`,
      confidence: 0.95,
      source: "message_extraction",
    });
  }

  // ─── Preferences ───

  // "I love X" / "I prefer X" / "My favorite X is Y"
  const prefMatch = text.match(
    /my favorite\s+(.+?)\s+is\s+(.+?)(?:\.|,|$)/i,
  );
  if (prefMatch?.[1] && prefMatch[2]) {
    facts.push({
      category: "preference",
      key: `favorite_${prefMatch[1].toLowerCase().trim()}`,
      value: prefMatch[2].trim(),
      confidence: 0.8,
      source: "message_extraction",
    });
  }

  // Allergies: "I'm allergic to X" / "I have a X allergy"
  const allergyMatch = text.match(
    /(?:i'm allergic to|i am allergic to|allergic to|allergy to)\s+(.+?)(?:\.|,|$)/i,
  );
  if (allergyMatch?.[1]) {
    facts.push({
      category: "preference",
      key: "allergy",
      value: allergyMatch[1].trim(),
      confidence: 0.95,
      source: "message_extraction",
    });
  }

  return facts;
}

/**
 * Upsert profile facts into the user_profile table.
 * Uses ON CONFLICT to update existing facts.
 */
export async function upsertProfileFacts(
  userId: string,
  facts: ProfileFact[],
): Promise<void> {
  if (facts.length === 0) return;

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  for (const fact of facts) {
    const { error } = await supabase.from("user_profile").upsert(
      {
        user_id: userId,
        category: fact.category,
        key: fact.key,
        value: fact.value,
        confidence: fact.confidence,
        source: fact.source,
        last_mentioned_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,category,key" },
    );

    if (error) {
      logger.error({ error, userId, fact }, "Failed to upsert profile fact");
    } else {
      logger.info({ userId, key: fact.key, value: fact.value }, "Profile fact upserted");
    }
  }
}

/**
 * Get the full user profile as a readable summary for the AI context.
 */
export async function getUserProfileSummary(userId: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("user_profile")
    .select("category, key, value")
    .eq("user_id", userId)
    .order("category")
    .order("key");

  if (error) {
    logger.error({ error, userId }, "Failed to fetch user profile");
    return "";
  }
  if (!data || data.length === 0) {
    logger.info({ userId }, "User profile is empty");
    return "";
  }

  logger.info({ userId, factCount: data.length }, "User profile loaded");

  const grouped: Record<string, string[]> = {};
  for (const row of data) {
    const cat = row.category as string;
    if (!grouped[cat]) grouped[cat] = [];
    const key = (row.key as string).replace(/_/g, " ");
    grouped[cat]!.push(`${key}: ${row.value}`);
  }

  const lines: string[] = [];
  for (const [category, items] of Object.entries(grouped)) {
    lines.push(`[${category}]`);
    for (const item of items) {
      lines.push(`  ${item}`);
    }
  }

  return lines.join("\n");
}
