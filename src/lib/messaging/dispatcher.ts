import {
  sendWhatsAppMessage,
  sendWhatsAppButtons,
  sendWhatsAppImage,
} from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";

/**
 * Message dispatcher — routes to WhatsApp.
 */

export async function sendMessage(
  _platform: string,
  to: string,
  text: string,
): Promise<void> {
  await sendWhatsAppMessage(to, text);
}

export async function sendButtons(
  _platform: string,
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
): Promise<void> {
  await sendWhatsAppButtons(to, bodyText, buttons);
}

export async function sendImage(
  _platform: string,
  to: string,
  mediaId: string,
  caption?: string,
): Promise<void> {
  await sendWhatsAppImage(to, mediaId, caption);
}

/**
 * Determine which platform to use for outbound messages to a user.
 */
export function getUserPlatform(user: {
  whatsapp_number: string | null;
}): { platform: "whatsapp"; platformId: string } {
  if (user.whatsapp_number) {
    return { platform: "whatsapp", platformId: user.whatsapp_number };
  }
  throw new Error("User has no platform identifier");
}
