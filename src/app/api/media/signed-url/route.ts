import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { getMediaSignedUrl } from "@/lib/media/storage";

/**
 * GET /api/media/signed-url?path=userId/audio/uuid.ogg
 *
 * Returns a signed URL as JSON instead of a redirect.
 * This is used by the mobile app which needs the URL as a string
 * for expo-av Audio and Image components.
 */
export async function GET(request: NextRequest) {
  let userId: string;
  try {
    const user = await getAuthenticatedPortalUser(request);
    userId = user.id;
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const storagePath = request.nextUrl.searchParams.get("path");
  if (!storagePath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Security: only serve media that belongs to this user
  if (!storagePath.startsWith(`${userId}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const signedUrl = await getMediaSignedUrl(storagePath, 3600);
  if (!signedUrl) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  return NextResponse.json(
    { url: signedUrl },
    { headers: { "Cache-Control": "private, max-age=3000" } },
  );
}
