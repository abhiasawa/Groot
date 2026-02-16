import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import type { VisionProvider, VisionResult } from "../types";

export class AnthropicVisionProvider implements VisionProvider {
  name = "anthropic-vision";
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for Anthropic Vision");
    }
    this.client = new Anthropic({ apiKey });
  }

  async analyzeImage(
    imageBuffer: Buffer,
    mimeType: string,
    prompt: string,
  ): Promise<VisionResult> {
    const base64 = imageBuffer.toString("base64");
    const mediaType = mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: `${prompt}\n\nRespond in JSON format:\n{"description": "what the image shows", "extractedText": "any text visible in the image or null", "category": "photo|screenshot|document|meme|chart|other"}`,
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text : "{}";

      try {
        // Try to parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as VisionResult;
          return {
            description: parsed.description || "Image analyzed",
            extractedText: parsed.extractedText || null,
            category: parsed.category || "other",
          };
        }
      } catch {
        // If JSON parsing fails, use the raw text
      }

      return {
        description: text,
        extractedText: null,
        category: "other",
      };
    } catch (error) {
      logger.error({ error, mimeType }, "Anthropic Vision analysis failed");
      throw error;
    }
  }
}
