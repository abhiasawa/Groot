import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { signJWT } from "@/lib/auth/jwt";
import { logger } from "@/lib/logger";

export const maxDuration = 15;

interface GoogleTokenPayload {
  sub: string;       // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

/**
 * POST /api/auth/google — Authenticate with Google ID token.
 *
 * 1. Verify the Google id_token
 * 2. Check if email is in allowed_users table
 * 3. Find or create user record
 * 4. Issue JWT
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_token } = body as { id_token?: string };

    if (!id_token) {
      return NextResponse.json(
        { error: "id_token is required" },
        { status: 400 },
      );
    }

    // ── Step 1: Verify Google ID token ──
    const googleUser = await verifyGoogleToken(id_token);
    if (!googleUser) {
      return NextResponse.json(
        { error: "Invalid Google token" },
        { status: 401 },
      );
    }

    if (!googleUser.email_verified) {
      return NextResponse.json(
        { error: "Email not verified with Google" },
        { status: 401 },
      );
    }

    const supabase = getSupabaseAdmin();

    // ── Step 2: Access control ──
    // Google OAuth consent screen in "Testing" mode acts as the gatekeeper.
    // Only users added as test users in Google Cloud Console can sign in.
    // No additional allowed_users check needed.
    const ownerEmail = process.env.OWNER_EMAIL;
    const isOwner = ownerEmail && googleUser.email.toLowerCase() === ownerEmail.toLowerCase();

    // ── Step 3: Find or create user ──
    type DbUser = { id: string; display_name: string | null; email: string | null };
    let resolvedUser: DbUser | null = null;

    // First try to find by google_id
    const { data: googleIdUser } = await supabase
      .from("users")
      .select("id, display_name, email")
      .eq("google_id", googleUser.sub)
      .single();

    if (googleIdUser) {
      resolvedUser = googleIdUser;
    }

    // If not found by google_id, try by email
    if (!resolvedUser) {
      const { data: emailUser } = await supabase
        .from("users")
        .select("id, display_name, email")
        .eq("email", googleUser.email.toLowerCase())
        .single();

      if (emailUser) {
        // Link Google ID to existing email-based user
        await supabase
          .from("users")
          .update({
            google_id: googleUser.sub,
            avatar_url: googleUser.picture ?? null,
            display_name: emailUser.display_name ?? googleUser.name ?? null,
          })
          .eq("id", emailUser.id);

        resolvedUser = emailUser;
      }
    }

    // If still no user, create a new one
    if (!resolvedUser) {
      // Try without whatsapp_number first (requires migration 015 DROP NOT NULL)
      let createResult = await supabase
        .from("users")
        .insert({
          email: googleUser.email.toLowerCase(),
          google_id: googleUser.sub,
          display_name: googleUser.name ?? null,
          avatar_url: googleUser.picture ?? null,
          whatsapp_number: null,
          onboarding_step: 0,
          timezone: "Asia/Kolkata",
        })
        .select("id, display_name, email")
        .single();

      // If it failed (likely NOT NULL constraint on whatsapp_number), retry with placeholder
      if (createResult.error) {
        logger.warn(
          { code: createResult.error.code, message: createResult.error.message },
          "First insert attempt failed, retrying with placeholder whatsapp_number",
        );
        createResult = await supabase
          .from("users")
          .insert({
            email: googleUser.email.toLowerCase(),
            google_id: googleUser.sub,
            display_name: googleUser.name ?? null,
            avatar_url: googleUser.picture ?? null,
            whatsapp_number: `google_${googleUser.sub}`,
            onboarding_step: 0,
            timezone: "Asia/Kolkata",
          })
          .select("id, display_name, email")
          .single();
      }

      const { data: newUser, error: createError } = createResult;

      if (createError || !newUser) {
        logger.error(
          {
            error: createError,
            code: createError?.code,
            message: createError?.message,
            details: createError?.details,
            hint: createError?.hint,
            email: googleUser.email,
          },
          "Failed to create user",
        );
        return NextResponse.json(
          { error: "Failed to create account", details: createError?.message ?? "Unknown error" },
          { status: 500 },
        );
      }

      resolvedUser = newUser;

      // Auto-add owner to allowed_users if not already there
      if (isOwner) {
        await supabase
          .from("allowed_users")
          .upsert(
            { email: googleUser.email.toLowerCase(), access_level: "owner" },
            { onConflict: "email" },
          );
      }

      logger.info(
        { userId: resolvedUser.id, email: googleUser.email },
        "New user created via Google auth",
      );
    }

    // ── Step 4: Issue JWT ──
    const token = await signJWT(resolvedUser.id);

    logger.info(
      { userId: resolvedUser.id, email: googleUser.email },
      "Google auth successful — JWT issued",
    );

    const response = NextResponse.json({
      ok: true,
      token,
      user: {
        id: resolvedUser.id,
        display_name: resolvedUser.display_name,
        email: googleUser.email,
      },
    });

    // Set cookie for web portal (same as verify-otp)
    response.cookies.set("groot-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    logger.error({ error }, "Google auth failed");
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}

/**
 * Verify a Google ID token using Google's tokeninfo endpoint.
 * Returns the decoded payload or null if invalid.
 */
async function verifyGoogleToken(
  idToken: string,
): Promise<GoogleTokenPayload | null> {
  try {
    const tokenPreview = idToken.substring(0, 20) + "...";
    logger.info({ tokenPreview, tokenLength: idToken.length }, "Verifying Google token");

    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );

    if (!res.ok) {
      const errorBody = await res.text();
      logger.warn(
        { status: res.status, errorBody },
        "Google tokeninfo endpoint rejected token",
      );
      return null;
    }

    const payload = (await res.json()) as Record<string, unknown>;
    logger.info(
      { aud: payload.aud, email: payload.email, iss: payload.iss },
      "Google token payload received",
    );

    // Verify audience matches our client ID
    // The native Android SDK signs tokens with the Web client ID (webClientId)
    const expectedClientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (expectedClientId && payload.aud !== expectedClientId) {
      logger.warn(
        { aud: payload.aud, expected: expectedClientId },
        "Google token audience mismatch",
      );
      return null;
    }

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      email_verified: payload.email_verified === "true" || payload.email_verified === true,
      name: (payload.name as string) ?? undefined,
      picture: (payload.picture as string) ?? undefined,
    };
  } catch (error) {
    logger.error({ error }, "Failed to verify Google token");
    return null;
  }
}
