import { logger } from "@/lib/logger";

function getConfig() {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
  };
}

/**
 * Send a text message via Telegram Bot API.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<void> {
  const { botToken } = getConfig();
  const t0 = Date.now();

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error(
      { chatId, status: response.status, body, ms: Date.now() - t0 },
      "Telegram sendMessage failed",
    );
    throw new Error(`Telegram API error: ${response.status}`);
  }

  logger.info({ chatId, ms: Date.now() - t0 }, "Telegram message sent");
}
