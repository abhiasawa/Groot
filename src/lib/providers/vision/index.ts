import { logger } from "@/lib/logger";
import type { VisionProvider } from "../types";

let cached: VisionProvider | null = null;

export function getVisionProvider(): VisionProvider {
  if (cached) return cached;

  const provider = process.env.VISION_PROVIDER ?? "anthropic";

  switch (provider) {
    case "anthropic": {
      const { AnthropicVisionProvider } = require("./anthropic");
      cached = new AnthropicVisionProvider() as VisionProvider;
      break;
    }
    case "openai": {
      const { OpenAIVisionProvider } = require("./openai");
      cached = new OpenAIVisionProvider() as VisionProvider;
      break;
    }
    default:
      throw new Error(`Unknown vision provider: ${provider}`);
  }

  logger.info({ provider }, "Vision provider initialized");
  return cached!;
}
