import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { downloadWhatsAppMedia } from "@/lib/whatsapp/client";
import { uploadMediaToStorage, getMediaSignedUrl } from "@/lib/media/storage";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/media/proxy?mediaId=XXXX&messageType=image|audio
 *
 * Proxies WhatsApp media through our server:
 * 1. Downloads from WhatsApp Cloud API using the mediaId
 * 2. Uploads to Supabase Storage (opportunistic backfill)
 * 3. Returns JSON { url } — either a signed storage URL or a base64 data URL
 *
 * This handles the case where media_url is still "media:WHATSAPP_ID"
 * (storage upload failed during initial processing).
 */
export async function GET(request: NextRequest) {
  let authUserId: string;
  try {
    const user = await getAuthenticatedPortalUser(request);
    authUserId = user.id;
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const mediaId = request.nextUrl.searchParams.get("mediaId");
  const messageType = request.nextUrl.searchParams.get("messageType") ?? "image";

  if (!mediaId) {
    return NextResponse.json({ error: "Missing mediaId parameter" }, { status: 400 });
  }

  try {
    // Download from WhatsApp
    const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);

    // Try to upload to Supabase Storage (backfill)
    const storageType = messageType === "audio" ? "audio" as const : "image" as const;
    const storagePath = await uploadMediaToStorage(authUserId, buffer, mimeType, storageType);

    if (storagePath) {
      // Update the message to use storage URL
      const supabase = getSupabaseAdmin();
      await supabase
        .from("messages")
        .update({ media_url: `storage:${storagePath}` })
        .eq("user_id", authUserId)
        .eq("media_url", `media:${mediaId}`);
      logger.info({ mediaId, storagePath }, "Media proxy: backfilled to storage");

      // Return a signed URL from storage (preferred — uses CDN-like serving)
      const signedUrl = await getMediaSignedUrl(storagePath, 3600);
      if (signedUrl) {
        return NextResponse.json(
          { url: signedUrl },
          { headers: { "Cache-Control": "private, max-age=3000" } },
        );
      }
    }

    // Fallback: return base64 data URL (if storage upload failed)
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json(
      { url: dataUrl },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (error) {
    logger.error({ error, mediaId, authUserId }, "Media proxy: failed to download from WhatsApp");
    return NextResponse.json(
      { error: "Media unavailable — it may have expired on WhatsApp" },
      { status: 404 },
    );
  }
}
