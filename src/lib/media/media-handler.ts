import { downloadWhatsAppMedia } from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";
import { getTranscriptionProvider } from "@/lib/providers/transcription";
import { getVisionProvider } from "@/lib/providers/vision";

/**
 * Media handler — downloads WhatsApp media and routes to the correct processor.
 *
 * Supported media types:
 * - audio/* → TranscriptionProvider (Whisper by default)
 * - image/* → VisionProvider (Claude Vision by default)
 */

export interface MediaProcessingResult {
  type: "transcription" | "vision" | "unsupported";
  text: string;
  language?: string;
  duration?: number;
  description?: string;
  category?: string;
}

/**
 * Process media from an already-downloaded buffer.
 */
export async function processMediaFromBuffer(
  buffer: Buffer,
  mediaType: string,
  mimeType: string,
): Promise<MediaProcessingResult | null> {
  try {
    logger.info(
      { size: buffer.length, mediaType, mimeType },
      "Processing media from buffer",
    );

    if (isAudioType(mimeType)) {
      return await processAudio(buffer, mimeType);
    }

    if (isImageType(mimeType)) {
      return await processImage(buffer, mimeType);
    }

    logger.warn({ mediaType, mimeType }, "Unsupported media type");
    return {
      type: "unsupported",
      text: "",
    };
  } catch (error) {
    logger.error({ error, mediaType }, "Media processing failed");
    return null;
  }
}

/**
 * Download and process WhatsApp media (convenience wrapper).
 */
export async function processMedia(
  mediaId: string,
  mediaType: string,
  mimeType: string,
): Promise<MediaProcessingResult | null> {
  try {
    logger.info({ mediaId, mediaType, mimeType }, "Downloading media");

    const { buffer, mimeType: actualMimeType } = await downloadWhatsAppMedia(mediaId);
    const mime = actualMimeType || mimeType;

    logger.info(
      { mediaId, size: buffer.length, mimeType: mime },
      "Media downloaded",
    );

    return await processMediaFromBuffer(buffer, mediaType, mime);
  } catch (error) {
    logger.error({ error, mediaId }, "Media processing failed");
    return null;
  }
}

async function processAudio(
  buffer: Buffer,
  mimeType: string,
): Promise<MediaProcessingResult> {
  try {
    const provider = getTranscriptionProvider();
    const result = await provider.transcribe(buffer, mimeType);
    logger.info(
      { provider: provider.name, textLength: result.text.length, language: result.language, duration: result.duration },
      "Audio transcription successful",
    );
    return {
      type: "transcription",
      text: result.text,
      language: result.language,
      duration: result.duration,
    };
  } catch (error) {
    logger.warn({ error }, "Transcription failed");
    return {
      type: "transcription",
      text: "_Couldn't transcribe this voice note right now. Try again in a moment._",
    };
  }
}

async function processImage(
  buffer: Buffer,
  mimeType: string,
): Promise<MediaProcessingResult> {
  try {
    const provider = getVisionProvider();
    const result = await provider.analyzeImage(
      buffer,
      mimeType,
      "Describe this image and extract any text visible in it.",
    );
    logger.info(
      { provider: provider.name, hasText: !!result.extractedText, category: result.category },
      "Image analysis successful",
    );
    return {
      type: "vision",
      text: result.extractedText ?? "",
      description: result.description,
      category: result.category,
    };
  } catch (error) {
    logger.warn({ error }, "Vision analysis failed");
    return {
      type: "vision",
      text: "_Couldn't analyze this image right now. Try again in a moment._",
    };
  }
}

function isAudioType(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}

function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
