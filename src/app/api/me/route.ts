import { NextResponse } from "next/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

/**
 * GET /api/me — Returns the authenticated portal user's linked WhatsApp user.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedPortalUser();
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
