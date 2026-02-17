import OpenAI from "openai";
import { logger } from "@/lib/logger";
import type { LLMProvider, LLMMessage, LLMResponse } from "../types";

export class OpenAIProvider implements LLMProvider {
  name = "openai";
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAI provider");
    }
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
  }

  async generateResponse(
    systemPrompt: string,
    messages: LLMMessage[],
    options?: {
      maxTokens?: number;
      temperature?: number;
      jsonMode?: boolean;
    },
  ): Promise<LLMResponse> {
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        max_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
        ...(options?.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      });

      const text = response.choices[0]?.message?.content ?? "";
      const metadata = this.extractMetadata(text);

      return {
        text: metadata ? metadata.cleanText : text,
        metadata: metadata?.parsed,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    } catch (error) {
      logger.error({ error }, "OpenAI API error");
      throw error;
    }
  }

  private extractMetadata(text: string): { cleanText: string; parsed: LLMResponse["metadata"] } | null {
    const metadataMatch = text.match(/\n---METADATA---\n([\s\S]+)$/);
    if (!metadataMatch?.[1]) return null;

    try {
      const parsed = JSON.parse(metadataMatch[1]) as LLMResponse["metadata"];
      const cleanText = text.replace(/\n---METADATA---\n[\s\S]+$/, "").trim();
      return { cleanText, parsed };
    } catch {
      return null;
    }
  }
}
