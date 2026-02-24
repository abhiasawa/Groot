import { NextRequest, NextResponse } from "next/server";
import { requestOTP } from "@/lib/auth/otp";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/request-otp
 *
 * Body: { phone_number: "+1234567890" }
 * Response: { success: true } or { error: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { phone_number?: string };
    const phoneNumber = body.phone_number?.trim();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    const result = await requestOTP(phoneNumber);

    if (!result.success) {
      // Use 429 for rate limiting, 404 for user not found, 500 for other errors
      const status = result.error?.includes("Too many") ? 429
        : result.error?.includes("No account") ? 404
        : 500;

      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "request-otp route error");
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
