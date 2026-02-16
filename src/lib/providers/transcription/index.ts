import { logger } from "@/lib/logger";
import type { TranscriptionProvider } from "../types";
import { WhisperProvider } from "./openai-whisper";

let cached: TranscriptionProvider | null = null;

export function getTranscriptionProvider(): TranscriptionProvider {
  if (cached) return cached;

  const provider = process.env.TRANSCRIPTION_PROVIDER ?? "openai";

  switch (provider) {
    case "openai": {
      cached = new WhisperProvider() as TranscriptionProvider;
      break;
    }
    default:
      throw new Error(`Unknown transcription provider: ${provider}`);
  }

  logger.info({ provider }, "Transcription provider initialized");
  return cached!;
}
