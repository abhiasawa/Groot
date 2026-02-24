import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Profile Builder — stores and retrieves user profile facts.
 *
 * All extraction is handled by the LLM via metadata.profileUpdates.
 * This module only handles persistence and retrieval.
 *
 * Profile categories:
 * - static: name, age, location, occupation, family (rarely changes)
 * - dynamic: weight, mood, current project (changes often)
 * - preference: food, music, communication style
 * - goal: fitness targets, learning goals, career goals
 * - people: detected people from conversations
 */

export interface ProfileFact {
  category: "static" | "dynamic" | "preference" | "goal" | "people";
  key: string;
  value: string;
  confidence: number;
  source: string;
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

  await Promise.allSettled(
    facts.map((fact) =>
      supabase.from("user_profile").upsert(
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
      ).then(({ error }) => {
        if (error) {
          logger.error({ error, userId, fact }, "Failed to upsert profile fact");
        } else {
          logger.info({ userId, key: fact.key, value: fact.value }, "Profile fact upserted");
        }
      }),
    ),
  );
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
