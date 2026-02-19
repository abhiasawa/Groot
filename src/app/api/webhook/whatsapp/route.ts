import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

export const maxDuration = 60;

import { validateWebhookSignature } from "@/lib/whatsapp/validation";
import { parseWebhookPayloads } from "@/lib/whatsapp/webhook-parser";
import { markMessageAsRead, downloadWhatsAppMedia } from "@/lib/whatsapp/client";
import { claimMessageForProcessing, processMessage } from "@/lib/messaging/pipeline";
import { logger } from "@/lib/logger";
import type { WhatsAppWebhookPayload } from "@/types/whatsapp";

/**
 * GET: Meta webhook verification.
 */
export async function GET(request: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    logger.error("WHATSAPP_VERIFY_TOKEN is missing");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken) {
    logger.info("Webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  logger.warn(
    { mode, tokenMatch: token === verifyToken },
    "Webhook verification failed",
  );
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST: Incoming WhatsApp messages.
 * Validates signature → deduplicates → returns 200 → processes in background.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      logger.error("META_APP_SECRET is missing");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const rawBody = Buffer.from(await request.arrayBuffer());
    const tReadBody = Date.now();
    const signature = request.headers.get("x-hub-signature-256");

    if (!validateWebhookSignature(rawBody, signature, appSecret)) {
      logger.warn("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    const tSignature = Date.now();

    const body = JSON.parse(rawBody.toString("utf8")) as WhatsAppWebhookPayload;
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Not a WhatsApp event" }, { status: 404 });
    }
    const tParse = Date.now();

    const parsedMessages = parseWebhookPayloads(body);
    if (parsedMessages.length === 0) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }
    const tFlatten = Date.now();

    const acceptedMessages: typeof parsedMessages = [];
    for (const parsed of parsedMessages) {
      if (await claimMessageForProcessing(parsed.messageId)) {
        acceptedMessages.push(parsed);
      }
    }
    const tClaim = Date.now();

    logger.info(
      {
        received: parsedMessages.length,
        accepted: acceptedMessages.length,
        latencyMs: Date.now() - startTime,
        readBodyMs: tReadBody - startTime,
        signatureMs: tSignature - tReadBody,
        parseJsonMs: tParse - tSignature,
        flattenPayloadMs: tFlatten - tParse,
        claimMs: tClaim - tFlatten,
      },
      "Webhook accepted",
    );

    // Process messages in the background — return 200 immediately so Meta
    // doesn't time out or mark our webhook as unhealthy.
    if (acceptedMessages.length > 0) {
      after(async () => {
        await Promise.allSettled(
          acceptedMessages.map(async (parsed) => {
            try {
              // Mark as read (WhatsApp blue checkmarks) — fire and forget
              markMessageAsRead(parsed.messageId).catch(() => {});
              await processMessage(parsed, downloadWhatsAppMedia);
              logger.info(
                {
                  messageId: parsed.messageId,
                  from: parsed.from,
                  type: parsed.type,
                },
                "Message processed",
              );
            } catch (error) {
              logger.error({ error, messageId: parsed.messageId }, "Async message processing failed");
            }
          }),
        );
      });
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Webhook processing error");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
