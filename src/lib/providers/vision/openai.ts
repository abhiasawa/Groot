import OpenAI from "openai";
import { logger } from "@/lib/logger";
import type { VisionProvider, VisionResult } from "../types";

export class OpenAIVisionProvider implements VisionProvider {
  name = "openai-vision";
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAI Vision");
    }
    this.client = new OpenAI({ apiKey });
  }

  async analyzeImage(
    imageBuffer: Buffer,
    mimeType: string,
    prompt: string,
  ): Promise<VisionResult> {
    const base64 = imageBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-5-mini",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
              {
                type: "text",
                text: `${prompt}\n\nRespond in JSON format:\n{"description": "what the image shows", "extractedText": "any text visible in the image or null", "category": "photo|screenshot|document|meme|chart|other"}`,
              },
            ],
          },
        ],
      });

      const text = response.choices[0]?.message?.content ?? "{}";

      try {
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
      logger.error({ error, mimeType }, "OpenAI Vision analysis failed");
      throw error;
    }
  }
}
