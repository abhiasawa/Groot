import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/auth/otp";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/verify-otp
 *
 * Body: { phone_number: "+1234567890", code: "123456" }
 * Response: { token: "jwt..." } or { error: "..." }
 *
 * On success, also sets an HTTP-only cookie (for the web portal).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      phone_number?: string;
      code?: string;
    };

    const phoneNumber = body.phone_number?.trim();
    const code = body.code?.trim();

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: "Phone number and code are required" },
        { status: 400 },
      );
    }

    const result = await verifyOTP(phoneNumber, code);

    if (!result.success || !result.token) {
      const status = result.error?.includes("Too many") ? 429 : 401;
      return NextResponse.json({ error: result.error }, { status });
    }

    // Build response with JWT
    const response = NextResponse.json({
      token: result.token,
      userId: result.userId,
    });

    // Set HTTP-only cookie for the web portal
    response.cookies.set("groot-token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days (matches JWT expiry)
    });

    return response;
  } catch (error) {
    logger.error({ error }, "verify-otp route error");
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
