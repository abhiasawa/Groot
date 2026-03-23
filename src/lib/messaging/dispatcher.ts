import {
  sendWhatsAppMessage,
  sendWhatsAppButtons,
  sendWhatsAppImage,
} from "@/lib/whatsapp/client";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { logger } from "@/lib/logger";

/**
 * Message dispatcher — routes to WhatsApp or Telegram.
 */

export async function sendMessage(
  platform: string,
  to: string,
  text: string,
): Promise<void> {
  if (platform === "telegram") {
    await sendTelegramMessage(to, text);
  } else {
    await sendWhatsAppMessage(to, text);
  }
}

export async function sendButtons(
  platform: string,
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
): Promise<void> {
  if (platform === "telegram") {
    // Telegram doesn't support interactive buttons via simple message —
    // fall back to text with button labels listed
    const btnText = buttons.map((b) => `• ${b.title}`).join("\n");
    await sendTelegramMessage(to, `${bodyText}\n\n${btnText}`);
  } else {
    await sendWhatsAppButtons(to, bodyText, buttons);
  }
}

export async function sendImage(
  platform: string,
  to: string,
  mediaId: string,
  caption?: string,
): Promise<void> {
  if (platform === "telegram") {
    // Telegram image sending not yet implemented — send caption as text
    if (caption) await sendTelegramMessage(to, caption);
    logger.warn({ to }, "Telegram image sending not yet implemented");
  } else {
    await sendWhatsAppImage(to, mediaId, caption);
  }
}

/**
 * Determine which platform to use for outbound messages to a user.
 */
export function getUserPlatform(user: {
  whatsapp_number: string | null;
  telegram_chat_id?: string | null;
}): { platform: "whatsapp" | "telegram"; platformId: string } {
  if (user.telegram_chat_id) {
    return { platform: "telegram", platformId: user.telegram_chat_id };
  }
  if (user.whatsapp_number) {
    return { platform: "whatsapp", platformId: user.whatsapp_number };
  }
  throw new Error("User has no platform identifier");
}
