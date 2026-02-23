import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { getMediaSignedUrl } from "@/lib/media/storage";

/**
 * GET /api/media/{storagePath} — Redirect to a signed URL for a stored media file.
 *
 * The storagePath should be the path stored in messages.media_url (without the "storage:" prefix).
 * Only serves media belonging to the authenticated user (path starts with their userId).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
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

  const { path: encodedPath } = await params;
  const storagePath = decodeURIComponent(encodedPath);

  // Security: only serve media that belongs to this user
  if (!storagePath.startsWith(`${userId}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const signedUrl = await getMediaSignedUrl(storagePath);
  if (!signedUrl) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // Redirect to the signed URL (expires in 1 hour)
  return NextResponse.redirect(signedUrl);
}
