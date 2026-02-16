import { getLLMProvider } from "@/lib/providers/llm";
import { addMemory } from "@/lib/memory/supermemory-client";
import { logger } from "@/lib/logger";

/**
 * Link processor — fetches URL content, summarizes, stores in Supermemory.
 */

const URL_REGEX = /https?:\/\/[^\s]+/gi;

/**
 * Extract URLs from a message.
 */
export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) ?? [];
}

/**
 * Process a shared URL: fetch content, summarize, store.
 */
export async function processLink(
  url: string,
  userId: string,
): Promise<string> {
  try {
    // Fetch the page content
    const content = await fetchPageContent(url);

    if (!content || content.length < 100) {
      // Store just the URL if content is too short
      await addMemory(`Link saved: ${url}`, userId, ["link"]);
      return `I saved the link, but couldn't extract much content from it.\n\n${url}`;
    }

    // Summarize using LLM
    const summary = await summarizeContent(content, url);

    // Store in Supermemory
    await addMemory(
      `Article: ${url}\n\nSummary:\n${summary}`,
      userId,
      ["article", "link"],
      { url, originalLength: content.length },
    );

    return `*Saved!* Here's the gist:\n\n${summary}`;
  } catch (error) {
    logger.error({ error, url }, "Link processing failed");

    // Still save the URL even if processing fails
    await addMemory(`Link saved (unprocessed): ${url}`, userId, ["link"]);
    return `I saved the URL itself — I'll try summarizing again later.\n\n${url}`;
  }
}

/**
 * Fetch and extract readable text from a URL.
 */
async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GrootBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Basic HTML text extraction (strips tags, scripts, styles)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    // Truncate to ~4000 chars for LLM context
    return text.substring(0, 4000);
  } catch (error) {
    logger.error({ error, url }, "Failed to fetch page content");
    return null;
  }
}

/**
 * Generate a 3-5 bullet summary of article content.
 */
async function summarizeContent(content: string, url: string): Promise<string> {
  const provider = getLLMProvider();

  const response = await provider.generateResponse(
    "You are a helpful assistant that summarizes articles. Create concise summaries.",
    [
      {
        role: "user",
        content: `Summarize this article in 3-5 bullet points. Use • for bullets. Be concise but capture key insights.\n\nURL: ${url}\n\nContent:\n${content}`,
      },
    ],
    { maxTokens: 300, temperature: 0.3 },
  );

  return response.text;
}
