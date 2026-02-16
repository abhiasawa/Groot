import OpenAI, { toFile } from "openai";
import { logger } from "@/lib/logger";
import type { TranscriptionProvider, TranscriptionResult } from "../types";

export class WhisperProvider implements TranscriptionProvider {
  name = "openai-whisper";
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for Whisper transcription");
    }
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
  ): Promise<TranscriptionResult> {
    const ext = mimeTypeToExt(mimeType);

    try {
      const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType });

      const response = await this.client.audio.transcriptions.create({
        file,
        model: "whisper-1",
        response_format: "verbose_json",
      });

      return {
        text: response.text,
        language: response.language,
        duration: response.duration,
      };
    } catch (error) {
      logger.error({ error, mimeType }, "Whisper transcription failed");
      throw error;
    }
  }
}

function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/opus": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/ogg; codecs=opus": "ogg",
  };
  return map[mimeType] ?? "ogg";
}
