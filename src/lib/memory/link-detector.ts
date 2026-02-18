import { getSupabaseAdmin } from "@/lib/supabase/server";
import { searchMemories } from "./supermemory-client";
import { logger } from "@/lib/logger";

/**
 * Detect semantically similar memories and create bidirectional links.
 * Called after a message is saved and synced to Supermemory.
 * Fire-and-forget — failures don't affect message processing.
 */
export async function detectAndLinkMemory(
  messageId: string,
  content: string,
  userId: string,
): Promise<number> {
  try {
    // Search for top 5 semantically similar memories
    const results = await searchMemories(content, userId, 5);
    if (results.length === 0) return 0;

    const supabase = getSupabaseAdmin();

    // Filter to high-confidence results only
    const highConfidenceResults = results.filter((r) => r.score >= 0.7);
    if (highConfidenceResults.length === 0) return 0;

    // Find messages matching these snippets
    const { data: matchedMessages } = await supabase
      .from("messages")
      .select("id, content")
      .eq("user_id", userId)
      .eq("direction", "inbound")
      .not("content", "is", null)
      .neq("id", messageId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!matchedMessages || matchedMessages.length === 0) return 0;

    // Match by content prefix overlap with search results
    const linkedIds: string[] = [];
    for (const result of highConfidenceResults) {
      const resultSnippet = result.content.substring(0, 80).toLowerCase();
      const match = matchedMessages.find(
        (m) => m.content && (m.content as string).substring(0, 80).toLowerCase() === resultSnippet,
      );
      if (match) {
        linkedIds.push(match.id as string);
      }
    }

    if (linkedIds.length === 0) return 0;

    // Create links with normalized source_id < target_id
    let linksCreated = 0;
    for (const targetId of linkedIds) {
      const [sourceNorm, targetNorm] =
        messageId < targetId ? [messageId, targetId] : [targetId, messageId];

      const confidence = results.find((r) =>
        matchedMessages.some(
          (m) =>
            m.id === targetId &&
            m.content &&
            (m.content as string).substring(0, 80).toLowerCase() ===
              r.content.substring(0, 80).toLowerCase(),
        ),
      )?.score ?? 0.8;

      const { error } = await supabase.from("memory_links").upsert(
        {
          source_id: sourceNorm,
          target_id: targetNorm,
          link_type: "related",
          confidence,
        },
        { onConflict: "source_id,target_id" },
      );

      if (!error) linksCreated++;
    }

    if (linksCreated > 0) {
      logger.info(
        { messageId, userId, linksCreated },
        "Memory links created",
      );
    }

    return linksCreated;
  } catch (error) {
    logger.error({ error, messageId, userId }, "detectAndLinkMemory failed");
    return 0;
  }
}
