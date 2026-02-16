import { logger } from "@/lib/logger";

const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";

/**
 * Upload audio buffer and send as voice note via WhatsApp.
 *
 * Two-step process:
 * 1. Upload audio to WhatsApp Media API
 * 2. Send the media ID as an audio message
 */
export async function sendVoiceNote(
  to: string,
  audioBuffer: Buffer,
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;

  try {
    // Step 1: Upload the audio file
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/ogg" });
    formData.append("file", blob, "voice.ogg");
    formData.append("messaging_product", "whatsapp");
    formData.append("type", "audio/ogg");

    const uploadResponse = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      },
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      logger.error({ error }, "Voice note upload failed");
      throw new Error("Failed to upload voice note");
    }

    const { id: mediaId } = (await uploadResponse.json()) as { id: string };

    // Step 2: Send the audio message
    const sendResponse = await fetch(
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
          type: "audio",
          audio: { id: mediaId },
        }),
      },
    );

    if (!sendResponse.ok) {
      const error = await sendResponse.json();
      logger.error({ error }, "Voice note send failed");
      throw new Error("Failed to send voice note");
    }

    logger.info({ to }, "Voice note sent");
  } catch (error) {
    logger.error({ error, to }, "Voice reply failed");
    throw error;
  }
}
