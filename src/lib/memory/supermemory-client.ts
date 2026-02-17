import { logger } from "@/lib/logger";

/**
 * Supermemory client for long-term semantic memory.
 *
 * Uses Supermemory.ai SDK for:
 * - Adding memories (with metadata tags)
 * - Semantic search (natural language queries)
 * - Listing/deleting memories
 *
 * If SUPERMEMORY_API_KEY is not configured, all operations degrade gracefully
 * (return empty results instead of erroring).
 */

interface SupermemoryMemory {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

interface SupermemorySearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

function getApiKey(): string | null {
  return process.env.SUPERMEMORY_API_KEY ?? null;
}

function getBaseUrl(): string {
  return "https://api.supermemory.ai/v1";
}

/**
 * Check if Supermemory is configured and available.
 */
export function isSupermemoryConfigured(): boolean {
  return !!getApiKey();
}

/**
 * Add a memory to Supermemory.
 * Tags are used for filtering (e.g., "note", "idea", "article", "journal").
 */
export async function addMemory(
  content: string,
  userId: string,
  tags: string[] = [],
  metadata: Record<string, unknown> = {},
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.debug("Supermemory not configured, skipping addMemory");
    return null;
  }

  try {
    const response = await fetch(`${getBaseUrl()}/memories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        metadata: {
          userId,
          tags,
          ...metadata,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error, userId }, "Supermemory addMemory failed");
      return null;
    }

    const result = (await response.json()) as { id: string };
    logger.info({ memoryId: result.id, userId, tags }, "Memory added to Supermemory");
    return result.id;
  } catch (error) {
    logger.error({ error, userId }, "Supermemory addMemory error");
    return null;
  }
}

/**
 * Search memories by natural language query.
 * Returns semantically similar memories ranked by relevance.
 */
export async function searchMemories(
  query: string,
  userId: string,
  limit: number = 5,
): Promise<SupermemorySearchResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.debug("Supermemory not configured, skipping search");
    return [];
  }

  try {
    const response = await fetch(`${getBaseUrl()}/memories/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit,
        filter: { userId },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error, userId }, "Supermemory search failed");
      return [];
    }

    const result = (await response.json()) as { results: SupermemorySearchResult[] };
    const results = result.results ?? [];
    logger.info({ userId, query: query.slice(0, 80), resultsCount: results.length }, "Supermemory search complete");
    return results;
  } catch (error) {
    logger.error({ error, userId }, "Supermemory search error");
    return [];
  }
}

/**
 * List all memories for a user (paginated).
 */
export async function listMemories(
  userId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<SupermemoryMemory[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch(
      `${getBaseUrl()}/memories?userId=${userId}&limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const result = (await response.json()) as { memories: SupermemoryMemory[] };
    return result.memories ?? [];
  } catch (error) {
    logger.error({ error, userId }, "Supermemory listMemories error");
    return [];
  }
}

/**
 * Delete a specific memory.
 */
export async function deleteMemory(memoryId: string): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return false;
  }

  try {
    const response = await fetch(`${getBaseUrl()}/memories/${memoryId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    return response.ok;
  } catch (error) {
    logger.error({ error, memoryId }, "Supermemory deleteMemory error");
    return false;
  }
}
