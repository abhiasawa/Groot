import OpenAI from "openai";
import { logger } from "@/lib/logger";
import type { TTSProvider } from "../types";

export class OpenAITTSProvider implements TTSProvider {
  name = "openai-tts";
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for TTS");
    }
    this.client = new OpenAI({ apiKey });
  }

  async synthesize(text: string, voice?: string): Promise<Buffer> {
    const selectedVoice = (voice ?? process.env.TTS_VOICE ?? "nova") as
      | "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

    try {
      const response = await this.client.audio.speech.create({
        model: "tts-1",
        voice: selectedVoice,
        input: text,
        response_format: "opus",
      });

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      logger.error({ error, voice: selectedVoice }, "TTS synthesis failed");
      throw error;
    }
  }
}
