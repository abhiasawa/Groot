import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedPortalUser,
  PortalAuthError,
} from "@/lib/auth/portal-user";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/link-whatsapp — Link a WhatsApp number to the authenticated user.
 *
 * Body: { whatsapp_number: string }
 *
 * Accepts a 10-digit Indian number (auto-prepends 91) or a full international number.
 * If another user already has this number, the link is rejected.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedPortalUser(request);

    const body = await request.json();
    const { whatsapp_number } = body as { whatsapp_number?: string };

    if (!whatsapp_number) {
      return NextResponse.json(
        { error: "whatsapp_number is required" },
        { status: 400 },
      );
    }

    // Normalize: strip spaces, dashes, plus sign — keep only digits
    let normalized = whatsapp_number.replace(/[\s\-+()]/g, "");

    // Auto-prepend 91 for 10-digit Indian numbers
    if (normalized.length === 10 && /^[6-9]\d{9}$/.test(normalized)) {
      normalized = `91${normalized}`;
    }

    if (!/^\d{10,15}$/.test(normalized)) {
      return NextResponse.json(
        { error: "Invalid phone number. Enter your 10-digit mobile number." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if another user already has this number
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("whatsapp_number", normalized)
      .neq("id", user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "This WhatsApp number is already linked to another account." },
        { status: 409 },
      );
    }

    // Update the user's WhatsApp number
    const { error: updateError } = await supabase
      .from("users")
      .update({ whatsapp_number: normalized })
      .eq("id", user.id);

    if (updateError) {
      logger.error({ error: updateError, userId: user.id }, "Failed to link WhatsApp number");
      return NextResponse.json(
        { error: "Failed to link WhatsApp number" },
        { status: 500 },
      );
    }

    logger.info(
      { userId: user.id, whatsapp_number: normalized },
      "WhatsApp number linked",
    );

    // Send a welcome message on WhatsApp so the user knows it's working
    try {
      const displayName = user.display_name ?? "there";
      await sendWhatsAppMessage(
        normalized,
        `Hey ${displayName}! Your WhatsApp is now linked to Groot. You can message me here anytime — I'll remember everything.`,
      );
    } catch (msgErr) {
      // Non-fatal: linking succeeded even if the welcome message fails
      logger.warn({ error: msgErr, userId: user.id }, "Failed to send WhatsApp welcome message");
    }

    return NextResponse.json({
      ok: true,
      whatsapp_number: normalized,
    });
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    logger.error({ error }, "Link WhatsApp failed");
    return NextResponse.json(
      { error: "Failed to link WhatsApp" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/auth/link-whatsapp — Unlink WhatsApp from the authenticated user.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedPortalUser(request);

    const supabase = getSupabaseAdmin();

    const { error: updateError } = await supabase
      .from("users")
      .update({ whatsapp_number: null })
      .eq("id", user.id);

    if (updateError) {
      logger.error({ error: updateError, userId: user.id }, "Failed to unlink WhatsApp");
      return NextResponse.json(
        { error: "Failed to unlink WhatsApp" },
        { status: 500 },
      );
    }

    logger.info({ userId: user.id }, "WhatsApp number unlinked");

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    logger.error({ error }, "Unlink WhatsApp failed");
    return NextResponse.json(
      { error: "Failed to unlink WhatsApp" },
      { status: 500 },
    );
  }
}
