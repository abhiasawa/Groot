import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";

const BUCKET = "media";

/** MIME → file extension map */
const EXT_MAP: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/aac": "aac",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
};

/**
 * Upload a media buffer to Supabase Storage.
 *
 * Storage path: `{userId}/{type}/{uuid}.{ext}`
 * e.g. `9be7df50-.../audio/a1b2c3d4.ogg`
 *
 * Returns the storage path (NOT a full URL — we generate signed URLs on demand).
 */
export async function uploadMediaToStorage(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  mediaType: "audio" | "image",
): Promise<string | null> {
  try {
    const ext = EXT_MAP[mimeType] ?? (mediaType === "audio" ? "ogg" : "jpg");
    const filename = `${randomUUID()}.${ext}`;
    const storagePath = `${userId}/${mediaType}/${filename}`;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      logger.error({ error, storagePath, mimeType }, "Failed to upload media to storage");
      return null;
    }

    logger.info(
      { storagePath, size: buffer.length, mimeType },
      "Media uploaded to storage",
    );

    return storagePath;
  } catch (error) {
    logger.error({ error, userId, mediaType }, "Media storage upload exception");
    return null;
  }
}

/**
 * Generate a signed URL for a stored media file.
 * Signed URLs expire after `expiresIn` seconds (default: 1 hour).
 */
export async function getMediaSignedUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      logger.error({ error, storagePath }, "Failed to create signed URL");
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    logger.error({ error, storagePath }, "Signed URL exception");
    return null;
  }
}
