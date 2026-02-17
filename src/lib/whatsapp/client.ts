import { logger } from "@/lib/logger";

const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";

function getConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  };
}

interface WhatsAppSendResult {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

/**
 * Send a text message via WhatsApp Cloud API.
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string,
): Promise<WhatsAppSendResult> {
  const { phoneNumberId, accessToken } = getConfig();

  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: text },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    logger.error({ error, to }, "WhatsApp send failed");
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<WhatsAppSendResult>;
}

/**
 * Send interactive button message (up to 3 buttons).
 */
export async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
): Promise<WhatsAppSendResult> {
  const { phoneNumberId, accessToken } = getConfig();

  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: bodyText },
          action: {
            buttons: buttons.slice(0, 3).map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    logger.error({ error, to }, "WhatsApp buttons send failed");
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<WhatsAppSendResult>;
}

/**
 * Send interactive list message (up to 10 items).
 */
export async function sendWhatsAppList(
  to: string,
  bodyText: string,
  buttonText: string,
  items: Array<{ id: string; title: string; description?: string }>,
): Promise<WhatsAppSendResult> {
  const { phoneNumberId, accessToken } = getConfig();

  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: bodyText },
          action: {
            button: buttonText,
            sections: [
              {
                rows: items.slice(0, 10).map((item) => ({
                  id: item.id,
                  title: item.title,
                  description: item.description,
                })),
              },
            ],
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    logger.error({ error, to }, "WhatsApp list send failed");
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<WhatsAppSendResult>;
}

/**
 * Download media from WhatsApp (voice notes, images, documents).
 * Two-step: (1) get media URL, (2) download binary.
 * Media URLs expire in 5 minutes.
 */
export async function downloadWhatsAppMedia(
  mediaId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const { accessToken } = getConfig();

  // Step 1: Get media URL
  const metaResponse = await fetch(`${WHATSAPP_API_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaResponse.ok) {
    const errorBody = await metaResponse.text().catch(() => "no body");
    logger.error(
      { mediaId, status: metaResponse.status, errorBody },
      "WhatsApp media URL fetch failed",
    );
    throw new Error(`Media URL fetch failed: ${metaResponse.status}`);
  }

  const metaData = (await metaResponse.json()) as {
    url: string;
    mime_type: string;
  };

  if (!metaData.url) {
    logger.error({ mediaId, metaData }, "WhatsApp media URL missing from response");
    throw new Error("Media URL missing from WhatsApp response");
  }

  // Step 2: Download the binary
  const mediaResponse = await fetch(metaData.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!mediaResponse.ok) {
    logger.error(
      { mediaId, status: mediaResponse.status },
      "WhatsApp media binary download failed",
    );
    throw new Error(`Media download failed: ${mediaResponse.status}`);
  }

  const arrayBuffer = await mediaResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  logger.info(
    { mediaId, size: buffer.length, mimeType: metaData.mime_type },
    "Media downloaded successfully",
  );

  return {
    buffer,
    mimeType: metaData.mime_type,
  };
}

/**
 * Mark a message as "read" (blue checkmarks).
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  const { phoneNumberId, accessToken } = getConfig();

  await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}
