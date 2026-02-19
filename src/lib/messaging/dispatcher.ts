import type { Platform } from "@/types/whatsapp";
import {
  sendWhatsAppMessage,
  sendWhatsAppButtons,
  sendWhatsAppImage,
} from "@/lib/whatsapp/client";
import {
  sendTelegramMessage,
  sendTelegramButtons,
  sendTelegramPhoto,
} from "@/lib/telegram/client";
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

export async function sendImage(
  platform: Platform,
  to: string,
  mediaId: string,
  caption?: string,
): Promise<void> {
  if (platform === "whatsapp") {
    await sendWhatsAppImage(to, mediaId, caption);
  } else if (platform === "telegram") {
    await sendTelegramPhoto(to, mediaId, caption);
  } else {
    logger.error({ platform, to }, "Unknown platform for sendImage");
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
