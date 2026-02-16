import { NextRequest, NextResponse } from "next/server";
import { validateWebhookSignature } from "@/lib/whatsapp/validation";
import { parseWebhookPayload } from "@/lib/whatsapp/webhook-parser";
import { sendWhatsAppMessage, markMessageAsRead } from "@/lib/whatsapp/client";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser, isOnboardingComplete, handleOnboarding } from "@/lib/whatsapp/onboarding";
import { logger } from "@/lib/logger";
import type { WhatsAppWebhookPayload } from "@/types/whatsapp";

/**
 * GET: Meta sends this to verify the webhook URL during setup.
 * Echo back the challenge token if our verify token matches.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info("Webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  logger.warn({ mode, tokenMatch: token === process.env.WHATSAPP_VERIFY_TOKEN }, "Webhook verification failed");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST: Meta sends incoming messages here.
 * We validate the signature, check for duplicates, then process async.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Read raw body for signature validation
    const rawBody = Buffer.from(await request.arrayBuffer());
    const signature = request.headers.get("x-hub-signature-256");

    // Validate webhook signature
    if (
      process.env.META_APP_SECRET &&
      !validateWebhookSignature(
        rawBody,
        signature,
        process.env.META_APP_SECRET,
      )
    ) {
      logger.warn("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse JSON only after validation
    const body = JSON.parse(rawBody.toString("utf8")) as WhatsAppWebhookPayload;

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Not a WhatsApp event" }, { status: 404 });
    }

    // Parse the message
    const parsed = parseWebhookPayload(body);
    if (!parsed) {
      // Status updates, read receipts, etc. — just acknowledge
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Deduplication check
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("processed_messages")
      .select("id")
      .eq("whatsapp_message_id", parsed.messageId)
      .single();

    if (existing) {
      logger.info({ messageId: parsed.messageId }, "Duplicate message, skipping");
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Mark as processed (upsert for race conditions)
    await supabase.from("processed_messages").upsert(
      {
        whatsapp_message_id: parsed.messageId,
        processed_at: new Date().toISOString(),
      },
      { onConflict: "whatsapp_message_id", ignoreDuplicates: true },
    );

    // Process the message (async in production with waitUntil, sync for now)
    await processMessage(parsed);

    const latencyMs = Date.now() - startTime;
    logger.info(
      { messageId: parsed.messageId, from: parsed.from, type: parsed.type, latencyMs },
      "Message processed",
    );

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Webhook processing error");
    // Always return 200 to prevent Meta retries
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}

/**
 * Process an incoming WhatsApp message.
 * Pipeline: mark read → get/create user → onboarding OR normal flow
 */
async function processMessage(
  parsed: NonNullable<ReturnType<typeof parseWebhookPayload>>,
): Promise<void> {
  // Mark as read (blue checkmarks)
  await markMessageAsRead(parsed.messageId).catch(() => {
    // Non-critical, don't fail the pipeline
  });

  // Get or create user
  const user = await getOrCreateUser(parsed.from, parsed.displayName);

  // Store inbound message (skip during onboarding step 0 — intro hasn't sent yet)
  if (user.onboarding_step > 0 || isOnboardingComplete(user)) {
    await storeInboundMessage(user.id, parsed);
  }

  // Onboarding flow — new users go through 5-message sequence
  if (!isOnboardingComplete(user)) {
    const handled = await handleOnboarding(user, parsed);
    if (handled) return;
  }

  // Normal flow (Phase 3+ will add memory router, Groot engine, etc.)
  const text = parsed.text;
  if (!text) {
    await sendWhatsAppMessage(
      parsed.from,
      "_I received your message but I can only handle text for now. More coming soon!_",
    );
    return;
  }

  // Phase 2: Personality teaser for post-onboarding users
  await sendWhatsAppMessage(
    parsed.from,
    `I am Groot. 🌱\n\nYou said: "${text}"\n\n_I'm still growing my brain. Full intelligence coming in Phase 5._`,
  );
}

/**
 * Store an inbound message in the messages table.
 */
async function storeInboundMessage(
  userId: string,
  parsed: NonNullable<ReturnType<typeof parseWebhookPayload>>,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("messages").insert({
    user_id: userId,
    direction: "inbound",
    message_type: parsed.type,
    content: parsed.text ?? parsed.caption,
    media_url: parsed.mediaId ? `media:${parsed.mediaId}` : null,
    whatsapp_message_id: parsed.messageId,
    metadata: parsed.interactiveReply
      ? { interactive_reply: parsed.interactiveReply }
      : {},
  });
}
