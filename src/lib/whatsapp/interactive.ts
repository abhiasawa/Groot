import { sendWhatsAppMessage, sendWhatsAppButtons } from "./client";
import { logger } from "@/lib/logger";

/**
 * Send a message with a simulated typing delay.
 * WhatsApp has no typing indicator API — we use a time delay
 * to feel more human-paced during onboarding.
 */
export async function sendWithDelay(
  to: string,
  text: string,
  delayMs: number = 1500,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  await sendWhatsAppMessage(to, text);
}

/**
 * Send buttons with a simulated typing delay.
 */
export async function sendButtonsWithDelay(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  delayMs: number = 1500,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  await sendWhatsAppButtons(to, bodyText, buttons);
}

/**
 * Send a sequence of messages with pacing delays.
 * Each message is sent after the previous one completes.
 */
export async function sendMessageSequence(
  to: string,
  messages: Array<{
    text: string;
    delayMs?: number;
    buttons?: Array<{ id: string; title: string }>;
  }>,
): Promise<void> {
  for (const msg of messages) {
    const delay = msg.delayMs ?? 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    if (msg.buttons && msg.buttons.length > 0) {
      await sendWhatsAppButtons(to, msg.text, msg.buttons);
    } else {
      await sendWhatsAppMessage(to, msg.text);
    }

    logger.debug({ to, preview: msg.text.substring(0, 50) }, "Sent sequenced message");
  }
}
