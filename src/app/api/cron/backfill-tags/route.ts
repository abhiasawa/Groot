import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getLLMProvider } from "@/lib/providers/llm";
import { logger } from "@/lib/logger";

const VALID_TAGS = [
  "fitness", "health", "work", "career", "relationships", "family",
  "friends", "goals", "daily-life", "food", "travel", "hobbies",
  "learning", "finance", "emotions", "self-reflection", "productivity",
  "entertainment", "news", "tech",
];

const TAG_PROMPT = `You are a message categorizer. Given a user message, assign 1-3 topic tags from this exact list:
${VALID_TAGS.join(", ")}

Rules:
- Pick the closest match(es). Use 1-3 tags.
- Use "daily-life" only if nothing else fits.
- Never use "general" or invent new tags.
- Also detect the user's mood if possible (happy, excited, good, calm, neutral, tired, stressed, sad, anxious) or null.

Respond with ONLY valid JSON, no other text:
{"memoryTags": ["tag1", "tag2"], "detectedMood": "mood_or_null"}`;

const BATCH_SIZE = 20;

/**
 * POST /api/cron/backfill-tags — Re-tag messages that have "general" or empty tags.
 * Protected by CRON_SECRET Bearer token.
 * Processes in batches of 20. Call repeatedly until done.
 */
export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch a larger batch and filter in JS for messages needing re-tagging
  const { data: allMessages, error: fetchError } = await supabase
    .from("messages")
    .select("id, content, media_description, metadata")
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(200);

  if (fetchError) {
    logger.error({ error: fetchError }, "Failed to fetch messages for backfill");
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }

  if (!allMessages || allMessages.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0, message: "No messages found" });
  }

  // Filter to messages needing re-tagging: no tags, empty tags, or only "general"
  const needsRetagging = allMessages.filter((msg) => {
    const content = (msg.content as string) || (msg.media_description as string);
    if (!content) return false; // skip truly empty messages
    const metadata = msg.metadata as Record<string, unknown> | null;
    const tags = metadata?.memoryTags as string[] | undefined;
    if (!tags || !Array.isArray(tags) || tags.length === 0) return true;
    if (tags.length === 1 && tags[0] === "general") return true;
    return false;
  }).slice(0, BATCH_SIZE);

  if (needsRetagging.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0, message: "All messages already have proper tags" });
  }

  const llm = getLLMProvider();
  let processed = 0;
  let failed = 0;

  for (const msg of needsRetagging) {
    const content = (msg.content as string) || (msg.media_description as string) || "";
    if (!content.trim()) continue;

    try {
      const response = await llm.generateResponse(TAG_PROMPT, [
        { role: "user", content: content.substring(0, 500) },
      ], { maxTokens: 100, temperature: 0 });

      // Parse the JSON response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ messageId: msg.id }, "Backfill: no JSON in LLM response");
        failed++;
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        memoryTags?: string[];
        detectedMood?: string | null;
      };

      // Validate tags
      const validTags = (parsed.memoryTags ?? [])
        .filter((t): t is string => typeof t === "string" && VALID_TAGS.includes(t.toLowerCase()))
        .map((t) => t.toLowerCase());

      if (validTags.length === 0) {
        validTags.push("daily-life");
      }

      const existingMetadata = (msg.metadata as Record<string, unknown>) ?? {};
      const updatedMetadata = {
        ...existingMetadata,
        memoryTags: validTags,
        detectedMood: parsed.detectedMood ?? existingMetadata.detectedMood ?? null,
      };

      await supabase
        .from("messages")
        .update({ metadata: updatedMetadata })
        .eq("id", msg.id);

      processed++;
    } catch (error) {
      logger.error({ error, messageId: msg.id }, "Backfill: failed to process message");
      failed++;
    }
  }

  logger.info({ processed, failed, batchSize: needsRetagging.length }, "Backfill batch complete");

  return NextResponse.json({
    processed,
    failed,
    message: `Retagged ${processed} messages${failed > 0 ? `, ${failed} failed` : ""}. Call again to process more.`,
  });
}
