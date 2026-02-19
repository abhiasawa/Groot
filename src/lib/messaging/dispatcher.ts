import type { Platform } from "@/types/whatsapp";
import { sendWhatsAppMessage, sendWhatsAppButtons } from "@/lib/whatsapp/client";
import { sendTelegramMessage, sendTelegramButtons } from "@/lib/telegram/client";
import { logger } from "@/lib/logger";

/**
 * Platform-agnostic message dispatcher.
 * Routes to WhatsApp or Telegram based on the platform field.
 */

export async function sendMessage(
  platform: Platform,
  to: string,
  text: string,
): Promise<void> {
  if (platform === "whatsapp") {
    await sendWhatsAppMessage(to, text);
  } else if (platform === "telegram") {
    await sendTelegramMessage(to, text);
  } else {
    logger.error({ platform, to }, "Unknown platform for sendMessage");
  }
}

export async function sendButtons(
  platform: Platform,
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
): Promise<void> {
  if (platform === "whatsapp") {
    await sendWhatsAppButtons(to, bodyText, buttons);
  } else if (platform === "telegram") {
    await sendTelegramButtons(to, bodyText, buttons);
  } else {
    logger.error({ platform, to }, "Unknown platform for sendButtons");
  }
}

/**
 * Determine which platform to use for outbound messages to a user.
 * Prefers WhatsApp if both are available.
 */
export function getUserPlatform(user: {
  whatsapp_number: string | null;
  telegram_chat_id: number | null;
}): { platform: Platform; platformId: string } {
  if (user.whatsapp_number) {
    return { platform: "whatsapp", platformId: user.whatsapp_number };
  }
  if (user.telegram_chat_id) {
    return { platform: "telegram", platformId: String(user.telegram_chat_id) };
  }
  throw new Error("User has no platform identifier");
}
