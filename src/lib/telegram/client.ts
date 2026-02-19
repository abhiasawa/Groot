import { logger } from "@/lib/logger";

const TELEGRAM_API = "https://api.telegram.org";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  return token;
}

/**
 * Send a text message via Telegram Bot API.
 * Uses Markdown parse mode for compatibility with Groot's WhatsApp formatting
 * (*bold*, _italic_).
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<void> {
  const token = getBotToken();
  const t0 = Date.now();

  const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    logger.error({ error, chatId, apiMs: Date.now() - t0 }, "Telegram send failed");
    throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
  }

  logger.info(
    { chatId, textLength: text.length, apiMs: Date.now() - t0 },
    "Telegram message sent",
  );
}

/**
 * Send a message with inline keyboard buttons.
 */
export async function sendTelegramButtons(
  chatId: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
): Promise<void> {
  const token = getBotToken();

  const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: bodyText,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons.map((b) => [
          { text: b.title, callback_data: b.id },
        ]),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    logger.error({ error, chatId }, "Telegram buttons send failed");
    throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
  }
}

/**
 * Acknowledge a callback query (button click).
 * Must be called within 30 seconds or the user sees a loading spinner.
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
): Promise<void> {
  const token = getBotToken();

  await fetch(`${TELEGRAM_API}/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  }).catch((error) => {
    logger.warn({ error, callbackQueryId }, "Failed to answer callback query");
  });
}

/**
 * Download media from Telegram.
 * Two-step: (1) getFile to get file_path, (2) download binary.
 * Telegram bot API supports files up to 20MB.
 */
export async function downloadTelegramMedia(
  fileId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const token = getBotToken();

  // Step 1: Get file path
  const fileResponse = await fetch(
    `${TELEGRAM_API}/bot${token}/getFile?file_id=${fileId}`,
  );

  if (!fileResponse.ok) {
    const errorBody = await fileResponse.text().catch(() => "no body");
    logger.error(
      { fileId, status: fileResponse.status, errorBody },
      "Telegram getFile failed",
    );
    throw new Error(`Telegram getFile failed: ${fileResponse.status}`);
  }

  const fileData = (await fileResponse.json()) as {
    ok: boolean;
    result: { file_path: string; file_size?: number };
  };

  if (!fileData.ok || !fileData.result?.file_path) {
    logger.error({ fileId, fileData }, "Telegram file_path missing from response");
    throw new Error("Telegram file_path missing from response");
  }

  // Step 2: Download binary
  const downloadUrl = `${TELEGRAM_API}/file/bot${token}/${fileData.result.file_path}`;
  const mediaResponse = await fetch(downloadUrl);

  if (!mediaResponse.ok) {
    logger.error(
      { fileId, status: mediaResponse.status },
      "Telegram file download failed",
    );
    throw new Error(`Telegram file download failed: ${mediaResponse.status}`);
  }

  const arrayBuffer = await mediaResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = mediaResponse.headers.get("content-type") ?? "application/octet-stream";

  logger.info(
    { fileId, size: buffer.length, mimeType },
    "Telegram media downloaded",
  );

  return { buffer, mimeType };
}
