import type { TelegramUpdate } from "@/types/telegram";
import type { ParsedMessage } from "@/types/whatsapp";

/**
 * Parse a Telegram message update into a ParsedMessage.
 * Returns null for unsupported update types.
 */
export function parseTelegramUpdate(update: TelegramUpdate): ParsedMessage | null {
  const message = update.message;
  if (!message) return null;

  // Only handle private chats (direct messages to the bot)
  if (message.chat.type !== "private") return null;

  const chatId = String(message.chat.id);
  const displayName = [message.from?.first_name, message.from?.last_name]
    .filter(Boolean)
    .join(" ") || "Unknown";

  let type = "text";
  let mediaId: string | null = null;
  let mediaMimeType: string | null = null;
  let text: string | null = message.text ?? null;
  const caption: string | null = message.caption ?? null;

  if (message.photo && message.photo.length > 0) {
    type = "image";
    // Telegram sends multiple sizes — pick the largest (last in array)
    const largest = message.photo[message.photo.length - 1]!;
    mediaId = largest.file_id;
    mediaMimeType = "image/jpeg"; // Telegram always compresses photos to JPEG
    text = caption;
  } else if (message.voice) {
    type = "audio";
    mediaId = message.voice.file_id;
    mediaMimeType = message.voice.mime_type ?? "audio/ogg";
  } else if (message.audio) {
    type = "audio";
    mediaId = message.audio.file_id;
    mediaMimeType = message.audio.mime_type ?? "audio/mpeg";
  } else if (message.document) {
    const mime = message.document.mime_type ?? "";
    if (mime.startsWith("image/")) {
      type = "image";
      mediaId = message.document.file_id;
      mediaMimeType = mime;
      text = caption;
    } else if (mime.startsWith("audio/")) {
      type = "audio";
      mediaId = message.document.file_id;
      mediaMimeType = mime;
    } else {
      // Unsupported document type
      type = "document";
      text = caption;
    }
  }

  return {
    platform: "telegram",
    messageId: `tg_${update.update_id}`,
    from: chatId,
    displayName,
    timestamp: new Date(message.date * 1000),
    type,
    text,
    mediaId,
    mediaMimeType,
    caption,
    interactiveReply: null,
  };
}

/**
 * Parse a Telegram callback query (inline button click) into a ParsedMessage.
 */
export function parseTelegramCallbackQuery(update: TelegramUpdate): ParsedMessage | null {
  const cq = update.callback_query;
  if (!cq || !cq.message) return null;

  const chatId = String(cq.message.chat.id);
  const displayName = [cq.from.first_name, cq.from.last_name]
    .filter(Boolean)
    .join(" ") || "Unknown";

  return {
    platform: "telegram",
    messageId: `tg_cb_${cq.id}`,
    from: chatId,
    displayName,
    timestamp: new Date(cq.message.date * 1000),
    type: "interactive",
    text: null,
    mediaId: null,
    mediaMimeType: null,
    caption: null,
    interactiveReply: cq.data
      ? {
          type: "button",
          id: cq.data,
          title: cq.data,
        }
      : null,
  };
}
