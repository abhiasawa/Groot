import { logger } from "@/lib/logger";
import type { VisionProvider } from "../types";
import { AnthropicVisionProvider } from "./anthropic";
import { OpenAIVisionProvider } from "./openai";

let cached: VisionProvider | null = null;

export function getVisionProvider(): VisionProvider {
  if (cached) return cached;

  const provider = process.env.VISION_PROVIDER ?? "anthropic";

  switch (provider) {
    case "anthropic": {
      cached = new AnthropicVisionProvider() as VisionProvider;
      break;
    }
    case "openai": {
      cached = new OpenAIVisionProvider() as VisionProvider;
      break;
    }
    default:
      throw new Error(`Unknown vision provider: ${provider}`);
  }

  logger.info({ provider }, "Vision provider initialized");
  return cached!;
}
