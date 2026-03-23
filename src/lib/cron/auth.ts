import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Validate CRON_SECRET Bearer token on cron endpoints.
 * Returns a NextResponse error if auth fails, or null if valid.
 */
export function validateCronAuth(request: NextRequest): NextResponse | null {
  if (!process.env.CRON_SECRET) {
    logger.error("CRON_SECRET is missing");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
