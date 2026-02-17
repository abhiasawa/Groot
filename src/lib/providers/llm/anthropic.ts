import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import type { LLMProvider, LLMMessage, LLMResponse } from "../types";

export class AnthropicProvider implements LLMProvider {
  name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
    }
    this.client = new Anthropic({ apiKey });
    this.model = process.env.ANTHROPIC_CHAT_MODEL ?? "claude-sonnet-4-5-20250514";
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
    const contextualSystemPromptParts = [systemPrompt];
    const additionalSystemMessages = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .filter(Boolean);

    if (additionalSystemMessages.length > 0) {
      contextualSystemPromptParts.push(additionalSystemMessages.join("\n\n"));
    }

    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        system: contextualSystemPromptParts.join("\n\n"),
        messages: anthropicMessages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text : "";

      // Parse metadata if response contains JSON block
      const metadata = this.extractMetadata(text);

      return {
        text: metadata ? metadata.cleanText : text,
        metadata: metadata?.parsed,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      logger.error({ error }, "Anthropic API error");
      throw error;
    }
  }

  private extractMetadata(text: string): { cleanText: string; parsed: LLMResponse["metadata"] } | null {
    // Look for JSON metadata block at the end of the response
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
