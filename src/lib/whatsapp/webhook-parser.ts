import type { WhatsAppWebhookPayload, ParsedMessage } from "@/types/whatsapp";

/**
 * Parses the deeply nested WhatsApp webhook payload into a flat structure.
 * Raw payload shape:
 * { object, entry: [{ id, changes: [{ value: { messages: [...], contacts: [...] } }] }] }
 */
export function parseWebhookPayload(
  body: WhatsAppWebhookPayload,
): ParsedMessage | null {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.messages?.length) return null;

    const message = value.messages[0]!;
    const contact = value.contacts?.[0];

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

    return {
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
        message.audio?.mime_type ?? message.image?.mime_type ?? null,
      caption: message.image?.caption ?? null,
      interactiveReply,
    };
  } catch {
    return null;
  }
}
