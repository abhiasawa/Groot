import { logger } from "@/lib/logger";
import type { TTSProvider } from "../types";
import { OpenAITTSProvider } from "./openai";

let cached: TTSProvider | null = null;

export function getTTSProvider(): TTSProvider {
  if (cached) return cached;

  const provider = process.env.TTS_PROVIDER ?? "openai";

  switch (provider) {
    case "openai": {
      cached = new OpenAITTSProvider() as TTSProvider;
      break;
    }
    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }

  logger.info({ provider }, "TTS provider initialized");
  return cached!;
}
