import { downloadWhatsAppMedia } from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";

/**
 * Media handler — downloads WhatsApp media and routes to the correct processor.
 *
 * Phase 4: Download + routing logic.
 * Phase 5: Actual transcription/vision providers plugged in.
 *
 * Supported media types:
 * - audio/* → TranscriptionProvider (Whisper by default)
 * - image/* → VisionProvider (Claude Vision by default)
 * - document/* → future PDF/document processing
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
 * Download and process WhatsApp media.
 * Returns extracted text/description or null if processing fails.
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

    if (isAudioType(mime)) {
      return await processAudio(buffer, mime);
    }

    if (isImageType(mime)) {
      return await processImage(buffer, mime);
    }

    logger.warn({ mediaId, mimeType: mime }, "Unsupported media type");
    return {
      type: "unsupported",
      text: "",
    };
  } catch (error) {
    logger.error({ error, mediaId }, "Media processing failed");
    return null;
  }
}

/**
 * Transcription and vision functions.
 * These will be connected to actual providers in Phase 5.
 * The media handler stores the buffer and metadata so Phase 5
 * can wire in real providers without changing this file.
 */

let transcribeFn: ((buffer: Buffer, mimeType: string) => Promise<MediaProcessingResult>) | null = null;
let analyzeImageFn: ((buffer: Buffer, mimeType: string) => Promise<MediaProcessingResult>) | null = null;

/**
 * Register a transcription handler (called by Phase 5 provider setup).
 */
export function registerTranscriptionHandler(
  fn: (buffer: Buffer, mimeType: string) => Promise<MediaProcessingResult>,
): void {
  transcribeFn = fn;
}

/**
 * Register a vision handler (called by Phase 5 provider setup).
 */
export function registerVisionHandler(
  fn: (buffer: Buffer, mimeType: string) => Promise<MediaProcessingResult>,
): void {
  analyzeImageFn = fn;
}

async function processAudio(
  buffer: Buffer,
  mimeType: string,
): Promise<MediaProcessingResult> {
  if (transcribeFn) {
    return transcribeFn(buffer, mimeType);
  }
  logger.info("Transcription provider not yet registered");
  return {
    type: "transcription",
    text: "[Voice note received — transcription coming soon]",
  };
}

async function processImage(
  buffer: Buffer,
  mimeType: string,
): Promise<MediaProcessingResult> {
  if (analyzeImageFn) {
    return analyzeImageFn(buffer, mimeType);
  }
  logger.info("Vision provider not yet registered");
  return {
    type: "vision",
    text: "[Image received — analysis coming soon]",
  };
}

function isAudioType(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}

function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
