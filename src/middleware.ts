import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for API routes (if Upstash is configured)
  if (pathname.startsWith("/api/")) {
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      try {
        const { Ratelimit } = await import("@upstash/ratelimit");
        const { Redis } = await import("@upstash/redis");

        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        const ratelimit = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(30, "1 m"),
          analytics: false,
        });

        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        const { success, limit, remaining } = await ratelimit.limit(ip);

        if (!success) {
          return new NextResponse("Rate limited", {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
            },
          });
        }
      } catch {
        // Rate limiting failure should not block requests
      }
    }
  }

  // Auth guard for The Garden portal
  if (pathname.startsWith("/garden")) {
    // TODO Phase 13: Check Supabase Auth session
    // For now, allow access (will be locked down in Phase 13)
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/garden/:path*"],
};
