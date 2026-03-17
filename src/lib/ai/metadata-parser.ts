import type { LLMResponse } from "@/lib/providers/types";

/**
 * Extract the ---METADATA--- JSON block from an LLM response.
 * Shared between the streaming chat route and the provider abstraction.
 */
export function extractMetadataBlock(
  text: string,
): { cleanText: string; metadata: LLMResponse["metadata"] } | null {
  const match = text.match(/\n---METADATA---\n([\s\S]+)$/);
  if (!match?.[1]) return null;

  try {
    const metadata = JSON.parse(match[1]) as LLMResponse["metadata"];
    const cleanText = text.replace(/\n---METADATA---\n[\s\S]+$/, "").trim();
    return { cleanText, metadata };
  } catch {
    return null;
  }
}

/** Strip metadata block from text for display purposes. */
export function stripMetadata(text: string): string {
  return text.replace(/\n---METADATA---\n[\s\S]*$/, "").trim();
}
