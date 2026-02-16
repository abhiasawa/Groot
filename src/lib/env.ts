import { z } from "zod/v4";

const envSchema = z.object({
  // Meta / WhatsApp
  META_APP_SECRET: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI Providers (optional at startup — validated when used)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  SUPERMEMORY_API_KEY: z.string().optional(),

  // Upstash (optional — rate limiting disabled without it)
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // App config
  CRON_SECRET: z.string().optional(),
  OWNER_WHATSAPP_NUMBER: z.string().optional(),
  OWNER_EMAIL: z.string().email().optional(),
  AI_PROVIDER: z.enum(["anthropic", "openai", "gemini"]).default("anthropic"),
  VISION_PROVIDER: z
    .enum(["anthropic", "openai", "gemini"])
    .default("anthropic"),
  TRANSCRIPTION_PROVIDER: z.enum(["openai", "gemini"]).default("openai"),
  TTS_PROVIDER: z
    .enum(["openai", "google", "elevenlabs"])
    .default("openai"),
  TTS_VOICE: z.string().default("nova"),
});

function getEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error(
      "Invalid environment variables:",
      result.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables. Check .env.example.");
  }
  return result.data;
}

export const env = getEnv();
