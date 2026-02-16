import { logger } from "@/lib/logger";
import type { TranscriptionProvider } from "../types";

let cached: TranscriptionProvider | null = null;

export function getTranscriptionProvider(): TranscriptionProvider {
  if (cached) return cached;

  const provider = process.env.TRANSCRIPTION_PROVIDER ?? "openai";

  switch (provider) {
    case "openai": {
      const { WhisperProvider } = require("./openai-whisper");
      cached = new WhisperProvider() as TranscriptionProvider;
      break;
    }
    default:
      throw new Error(`Unknown transcription provider: ${provider}`);
  }

  logger.info({ provider }, "Transcription provider initialized");
  return cached!;
}
