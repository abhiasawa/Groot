import type { WhatsAppWebhookPayload, ParsedMessage } from "@/types/whatsapp";

/**
 * Parses the deeply nested WhatsApp webhook payload into a flat structure.
 * Raw payload shape:
 * { object, entry: [{ id, changes: [{ value: { messages: [...], contacts: [...] } }] }] }
 */
export function parseWebhookPayload(
  body: WhatsAppWebhookPayload,
): ParsedMessage | null {
  const parsed = parseWebhookPayloads(body);
  return parsed[0] ?? null;
}

/**
 * Parses ALL messages from a webhook payload.
 * WhatsApp can batch multiple messages under one webhook event.
 */
export function parseWebhookPayloads(
  body: WhatsAppWebhookPayload,
): ParsedMessage[] {
  const parsedMessages: ParsedMessage[] = [];

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value?.messages?.length) continue;

        const contact = value.contacts?.[0];

        for (const message of value.messages) {
          let interactiveReply: ParsedMessage["interactiveReply"] = null;
          if (message.type === "interactive" && message.interactive) {
            if (
              message.interactive.type === "button_reply" &&
              message.interactive.button_reply
            ) {
              interactiveReply = {
                type: "button",
                id: message.interactive.button_reply.id,
                title: message.interactive.button_reply.title,
              };
            } else if (
              message.interactive.type === "list_reply" &&
              message.interactive.list_reply
            ) {
              interactiveReply = {
                type: "list",
                id: message.interactive.list_reply.id,
                title: message.interactive.list_reply.title,
              };
            }
          }

          parsedMessages.push({
            messageId: message.id,
            from: message.from,
            displayName: contact?.profile?.name ?? "Unknown",
            timestamp: new Date(parseInt(message.timestamp) * 1000),
            type: message.type,
            text:
              message.text?.body ??
              interactiveReply?.title ??
              message.image?.caption ??
              null,
            mediaId:
              message.audio?.id ??
              message.image?.id ??
              message.document?.id ??
              null,
            mediaMimeType:
              message.audio?.mime_type ??
              message.image?.mime_type ??
              message.document?.mime_type ??
              null,
            caption: message.image?.caption ?? null,
            interactiveReply,
          });
        }
      }
    }
  } catch {
    return [];
  }

  return parsedMessages;
}
