import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

export const maxDuration = 60;

import { validateWebhookSignature } from "@/lib/whatsapp/validation";
import { parseWebhookPayloads } from "@/lib/whatsapp/webhook-parser";
import { sendWhatsAppMessage, markMessageAsRead } from "@/lib/whatsapp/client";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/whatsapp/onboarding";
import { addMemory } from "@/lib/memory/supermemory-client";

import { storeOutboundMessage } from "@/lib/memory/short-term";
import { processMedia } from "@/lib/media/media-handler";
import { generateGrootResponse, getErrorResponse } from "@/lib/ai/groot-engine";
import {
  handlePendingOutboundReply,
  handleSendConfirmation,
} from "@/lib/whatsapp/outbound";
import { createReminder } from "@/lib/reminders/scheduler";
import {
  markUserResponded,
  updateProactivePreference,
} from "@/lib/proactive/scheduler";
import { logger } from "@/lib/logger";
import type { ParsedMessage, WhatsAppWebhookPayload } from "@/types/whatsapp";

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

    const acceptedMessages: ParsedMessage[] = [];
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
              await processMessage(parsed);
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

/**
 * Full message processing pipeline.
 * Everything flows through Groot AI — no regex routing.
 * The LLM naturally handles intent, memory, reminders, etc.
 */
async function processMessage(parsed: ParsedMessage): Promise<void> {
  const pStart = Date.now();
  const metrics: Record<string, number> = {};
  let userId: string | null = null;
  let outcome = "unknown";

  const logSummary = (extra: Record<string, unknown> = {}) => {
    logger.info(
      {
        messageId: parsed.messageId,
        from: parsed.from,
        type: parsed.type,
        userId,
        outcome,
        totalMs: Date.now() - pStart,
        ...metrics,
        ...extra,
      },
      "Message latency summary",
    );
  };

  markMessageAsRead(parsed.messageId).catch(() => {});

  const { user, isNewUser } = await getOrCreateUser(parsed.from, parsed.displayName);
  const pUser = Date.now();
  userId = user.id;
  metrics.userLookupMs = pUser - pStart;

  logger.info(
    { userId: user.id, isNewUser, type: parsed.type, hasMedia: !!parsed.mediaId, hasText: !!parsed.text, hasInteractive: !!parsed.interactiveReply, userLookupMs: metrics.userLookupMs },
    "Processing message",
  );

  // Store inbound message immediately so context is available for batch detection
  await storeInboundMessage(user.id, parsed);
  const pStore = Date.now();
  metrics.storeInboundMs = pStore - pUser;

  // Non-critical (fire-and-forget)
  markUserResponded(user.id).catch(() => {});

  // Media processing (audio/image)
  if (parsed.mediaId && parsed.mediaMimeType) {
    logger.info({ userId: user.id, mediaType: parsed.type, mimeType: parsed.mediaMimeType }, "Routing to media handler");
    const tMedia = Date.now();
    await handleMedia(user.id, parsed, user.display_name, isNewUser);
    metrics.mediaHandlerMs = Date.now() - tMedia;
    outcome = "handled_media";
    logSummary();
    return;
  }

  // Interactive button/list replies (send confirmations, proactive preferences)
  if (parsed.interactiveReply?.id) {
    logger.info({ userId: user.id, buttonId: parsed.interactiveReply.id }, "Routing to interactive reply handler");
    const tInteractive = Date.now();
    const handled = await handleInteractiveReply(
      user.id,
      parsed.from,
      parsed.interactiveReply.id,
    );
    metrics.interactiveHandlerMs = Date.now() - tInteractive;
    if (handled) {
      outcome = "handled_interactive";
      logSummary();
      return;
    }
  }

  const text = parsed.text;
  if (!text) {
    const tSend = Date.now();
    await sendWhatsAppMessage(
      parsed.from,
      "_I received your message but I can only handle text for now._",
    );
    metrics.sendWhatsAppMs = Date.now() - tSend;
    outcome = "non_text_fallback_sent";
    logSummary();
    return;
  }

  // Pending outbound follow-up (e.g., waiting for contact number)
  const tPending = Date.now();
  const handledPending = await handlePendingOutboundReply(user.id, parsed.from, text);
  metrics.pendingOutboundMs = Date.now() - tPending;
  if (handledPending) {
    logger.info({ userId: user.id }, "Message handled by pending outbound reply");
    outcome = "handled_pending_outbound";
    logSummary();
    return;
  }

  // ─── All text messages go through Groot AI ───
  try {
    const tGroot = Date.now();
    const grootResponse = await generateGrootResponse(
      user.id,
      text,
      user.display_name,
      isNewUser,
    );
    const pGroot = Date.now();
    metrics.grootEngineMs = pGroot - tGroot;
    metrics.grootContextMs = grootResponse.timings.contextMs;
    metrics.grootLlmMs = grootResponse.timings.llmMs;
    metrics.grootProfileUpsertMs = grootResponse.timings.profileUpsertMs;
    metrics.grootTotalMs = grootResponse.timings.totalMs;

    // Before sending: check if a newer message arrived while we were processing.
    // If so, discard this response — the newer message's handler will generate
    // a fresher response with full conversation context.
    const tLatest = Date.now();
    const isLatest = await isLatestInboundMessage(user.id, parsed.messageId);
    metrics.latestInboundCheckMs = Date.now() - tLatest;
    if (!isLatest) {
      logger.info(
        { messageId: parsed.messageId, userId: user.id },
        "Discarding response — newer inbound arrived during processing",
      );
      outcome = "discarded_newer_inbound";
      logSummary();
      return;
    }

    const tSend = Date.now();
    await sendWhatsAppMessage(parsed.from, grootResponse.text);
    const pSend = Date.now();
    metrics.sendWhatsAppMs = pSend - tSend;

    // Post-response actions driven by AI metadata
    const postOps: Promise<unknown>[] = [
      storeOutboundMessage(user.id, grootResponse.text, {
        mood: grootResponse.detectedMood,
      }),
      createRemindersFromDetectedDates(user.id, grootResponse.detectedDates),
    ];

    if (grootResponse.shouldStoreMemory) {
      postOps.push(
        storeLongTermMemoryAndMark(
          user.id,
          parsed.messageId,
          text,
          grootResponse.memoryTags.length > 0 ? grootResponse.memoryTags : ["general"],
        ),
      );
    }

    const tPostOps = Date.now();
    await Promise.allSettled(postOps);
    const pEnd = Date.now();
    metrics.postOpsMs = pEnd - tPostOps;
    outcome = "sent";

    logger.info(
      {
        userId: user.id,
        userLookupMs: pUser - pStart,
        storeInboundMs: pStore - pUser,
        grootEngineMs: pGroot - pStore,
        sendWhatsAppMs: pSend - pGroot,
        postOpsMs: pEnd - pSend,
        totalMs: pEnd - pStart,
      },
      "Message pipeline complete",
    );
    logSummary({
      shouldStoreMemory: grootResponse.shouldStoreMemory,
      detectedDates: grootResponse.detectedDates.length,
      responseLength: grootResponse.text.length,
    });
  } catch (error) {
    logger.error({ error, userId: user.id }, "Groot engine failed");
    const fallback = getErrorResponse();
    const tSend = Date.now();
    await sendWhatsAppMessage(parsed.from, fallback);
    metrics.sendWhatsAppMs = Date.now() - tSend;
    storeOutboundMessage(user.id, fallback).catch(() => {});
    outcome = "fallback_sent_after_error";
    logSummary();
  }
}

// ─── Handler functions ───

async function handleInteractiveReply(
  userId: string,
  from: string,
  buttonId: string,
): Promise<boolean> {
  if (buttonId.startsWith("proactive_")) {
    logger.info({ userId, buttonId }, "Updating proactive preference");
    const preference = await updateProactivePreference(userId, buttonId);
    const responseMap: Record<string, string> = {
      daily: "*Done.* I'll keep checking in daily. 🌱",
      weekly: "*Done.* I'll switch to weekly check-ins only.",
      paused: "*Done.* I've paused proactive check-ins for now.",
    };
    const response = responseMap[preference] ?? "Preference updated.";
    await sendWhatsAppMessage(from, response);
    await storeOutboundMessage(userId, response, {
      action: "update_proactive_preference",
      preference,
    });
    return true;
  }

  return handleSendConfirmation(userId, from, buttonId);
}

async function handleMedia(
  userId: string,
  parsed: ParsedMessage,
  displayName: string | null,
  isNewUser: boolean = false,
): Promise<void> {
  // Only show status for non-audio media (images, docs) — voice notes reply directly
  if (parsed.type !== "audio") {
    await sendWhatsAppMessage(parsed.from, "_Processing your media..._");
  }
  const result = await processMedia(parsed.mediaId!, parsed.type, parsed.mediaMimeType!);

  if (result?.text) {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("messages")
      .update({ media_description: result.text })
      .eq("user_id", userId)
      .eq("whatsapp_message_id", parsed.messageId);

    if (result.type === "transcription") {
      try {
        const grootResponse = await generateGrootResponse(userId, result.text, displayName, isNewUser);
        await sendWhatsAppMessage(parsed.from, grootResponse.text);

        const postOps: Promise<unknown>[] = [
          storeOutboundMessage(userId, grootResponse.text, {
            mood: grootResponse.detectedMood,
            source: "voice_note",
          }),
          createRemindersFromDetectedDates(userId, grootResponse.detectedDates),
        ];

        if (grootResponse.shouldStoreMemory) {
          postOps.push(
            storeLongTermMemoryAndMark(userId, parsed.messageId, result.text, grootResponse.memoryTags),
          );
        }

        await Promise.allSettled(postOps);
      } catch (error) {
        logger.error({ error, userId }, "Groot engine failed for voice note");
        const fallback = getErrorResponse();
        await sendWhatsAppMessage(parsed.from, fallback);
        await storeOutboundMessage(userId, fallback);
      }
    } else if (result.type === "vision") {
      const response = `_I see:_ ${result.description || result.text}`;
      await sendWhatsAppMessage(parsed.from, response);
      await storeOutboundMessage(userId, response);
    }
  } else {
    await sendWhatsAppMessage(
      parsed.from,
      "_I received your media but couldn't process it right now. I've saved it for later._",
    );
  }
}

// ─── Utility functions ───

async function storeInboundMessage(userId: string, parsed: ParsedMessage): Promise<void> {
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

async function claimMessageForProcessing(messageId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("processed_messages").insert({
    whatsapp_message_id: messageId,
    processed_at: new Date().toISOString(),
  });

  if (!error) return true;
  if (error.code === "23505") return false;

  logger.error({ error, messageId }, "Failed to claim message for processing");
  return false;
}

async function storeLongTermMemoryAndMark(
  userId: string,
  inboundMessageId: string,
  content: string,
  tags: string[],
): Promise<void> {
  const memoryId = await addMemory(content, userId, tags);
  if (memoryId) {
    await markInboundMessageAsSynced(userId, inboundMessageId);
  }
}

async function markInboundMessageAsSynced(
  userId: string,
  inboundMessageId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("messages")
    .update({ synced_to_supermemory: true })
    .eq("user_id", userId)
    .eq("whatsapp_message_id", inboundMessageId);
}

/**
 * Check if a message is the most recent inbound from this user.
 * Used to discard stale responses when a newer message arrived during processing.
 */
async function isLatestInboundMessage(
  userId: string,
  whatsappMessageId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("messages")
    .select("whatsapp_message_id")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return true;
  return data.whatsapp_message_id === whatsappMessageId;
}

async function createRemindersFromDetectedDates(
  userId: string,
  detectedDates: Array<{ date: string; event: string }>,
): Promise<void> {
  if (detectedDates.length === 0) return;

  const now = Date.now();
  const seenDates = new Set<string>();
  const supabase = getSupabaseAdmin();

  // Filter valid future dates and deduplicate by day
  const candidates: Array<{ item: { date: string; event: string }; remindAt: Date; dateKey: string }> = [];
  for (const item of detectedDates.slice(0, 3)) {
    const remindAt = new Date(item.date);
    if (Number.isNaN(remindAt.getTime())) continue;
    if (remindAt.getTime() <= now) continue;
    const dateKey = remindAt.toISOString().slice(0, 10);
    if (seenDates.has(dateKey)) continue;
    seenDates.add(dateKey);
    candidates.push({ item, remindAt, dateKey });
  }

  if (candidates.length === 0) return;

  // Check all duplicates in parallel
  const dupeChecks = await Promise.all(
    candidates.map(async ({ dateKey }) => {
      const dayStart = new Date(dateKey + "T00:00:00Z").toISOString();
      const dayEnd = new Date(dateKey + "T23:59:59Z").toISOString();
      const { data: existing } = await supabase
        .from("reminders")
        .select("id")
        .eq("user_id", userId)
        .eq("is_sent", false)
        .gte("remind_at", dayStart)
        .lte("remind_at", dayEnd)
        .limit(1);
      return existing && existing.length > 0;
    }),
  );

  // Create all non-duplicate reminders in parallel
  const toCreate = candidates.filter((_, i) => !dupeChecks[i]);
  if (toCreate.length > 0) {
    await Promise.allSettled(
      toCreate.map(({ item, remindAt }) =>
        createReminder(userId, item.event, remindAt, "Auto-detected from conversation").catch((error) => {
          logger.warn({ error, userId, item }, "Failed to create detected-date reminder");
        }),
      ),
    );
  }
}
