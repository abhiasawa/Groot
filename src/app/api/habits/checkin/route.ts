import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { recordCheckin } from "@/lib/habits/tracker";

/**
 * POST /api/habits/checkin — Record a habit check-in.
 *
 * Body: { habitId: string, value?: number, note?: string }
 */
export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const { habitId, value, note } = body as {
    habitId?: string;
    value?: number;
    note?: string;
  };

  if (!habitId || typeof habitId !== "string") {
    return NextResponse.json({ error: "habitId is required" }, { status: 400 });
  }

  try {
    const result = await recordCheckin(userId, habitId, value, note);
    return NextResponse.json({
      ok: true,
      streak: result.streak,
      isMilestone: result.isMilestone,
    });
  } catch {
    return NextResponse.json({ error: "Failed to record check-in" }, { status: 500 });
  }
}
