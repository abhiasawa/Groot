export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<WhatsAppRawMessage>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface WhatsAppRawMessage {
  from: string;
  id: string;
  timestamp: string;
  type:
    | "text"
    | "audio"
    | "image"
    | "document"
    | "reaction"
    | "sticker"
    | "interactive";
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename: string };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

export interface ParsedMessage {
  messageId: string;
  from: string;
  displayName: string;
  timestamp: Date;
  type: string;
  text: string | null;
  mediaId: string | null;
  mediaMimeType: string | null;
  caption: string | null;
  interactiveReply: {
    type: "button" | "list";
    id: string;
    title: string;
  } | null;
}
