import { NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 *
 * Clears the groot-token cookie (web portal logout).
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set("groot-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Expire immediately
  });

  return response;
}
