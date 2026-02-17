import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

export const maxDuration = 60;

import { validateWebhookSignature } from "@/lib/whatsapp/validation";
import { parseWebhookPayloads } from "@/lib/whatsapp/webhook-parser";
import { sendWhatsAppMessage, markMessageAsRead } from "@/lib/whatsapp/client";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  getOrCreateUser,
  isOnboardingComplete,
  handleOnboarding,
} from "@/lib/whatsapp/onboarding";
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
    const signature = request.headers.get("x-hub-signature-256");

    if (!validateWebhookSignature(rawBody, signature, appSecret)) {
      logger.warn("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody.toString("utf8")) as WhatsAppWebhookPayload;
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Not a WhatsApp event" }, { status: 404 });
    }

    const parsedMessages = parseWebhookPayloads(body);
    if (parsedMessages.length === 0) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const acceptedMessages: ParsedMessage[] = [];
    for (const parsed of parsedMessages) {
      if (await claimMessageForProcessing(parsed.messageId)) {
        acceptedMessages.push(parsed);
      }
    }

    logger.info(
      {
        received: parsedMessages.length,
        accepted: acceptedMessages.length,
        latencyMs: Date.now() - startTime,
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
  markMessageAsRead(parsed.messageId).catch(() => {});

  const user = await getOrCreateUser(parsed.from, parsed.displayName);

  // Store inbound message immediately so context is available for batch detection
  if (user.onboarding_step > 0 || isOnboardingComplete(user)) {
    await storeInboundMessage(user.id, parsed);
  }

  // Non-critical (fire-and-forget)
  markUserResponded(user.id).catch(() => {});

  // Onboarding
  if (!isOnboardingComplete(user)) {
    const handled = await handleOnboarding(user, parsed);
    if (handled) return;
  }

  // Media processing (audio/image)
  if (parsed.mediaId && parsed.mediaMimeType) {
    await handleMedia(user.id, parsed, user.display_name);
    return;
  }

  // Interactive button/list replies (send confirmations, proactive preferences)
  if (parsed.interactiveReply?.id) {
    const handled = await handleInteractiveReply(
      user.id,
      parsed.from,
      parsed.interactiveReply.id,
    );
    if (handled) return;
  }

  const text = parsed.text;
  if (!text) {
    await sendWhatsAppMessage(
      parsed.from,
      "_I received your message but I can only handle text for now._",
    );
    return;
  }

  // Pending outbound follow-up (e.g., waiting for contact number)
  if (await handlePendingOutboundReply(user.id, parsed.from, text)) return;

  // ─── All text messages go through Groot AI ───
  try {
    const grootResponse = await generateGrootResponse(
      user.id,
      text,
      user.display_name,
    );

    // Before sending: check if a newer message arrived while we were processing.
    // If so, discard this response — the newer message's handler will generate
    // a fresher response with full conversation context.
    if (!(await isLatestInboundMessage(user.id, parsed.messageId))) {
      logger.info(
        { messageId: parsed.messageId, userId: user.id },
        "Discarding response — newer inbound arrived during processing",
      );
      return;
    }

    await sendWhatsAppMessage(parsed.from, grootResponse.text);

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

    await Promise.allSettled(postOps);
  } catch (error) {
    logger.error({ error, userId: user.id }, "Groot engine failed");
    const fallback = getErrorResponse();
    await sendWhatsAppMessage(parsed.from, fallback);
    storeOutboundMessage(user.id, fallback).catch(() => {});
  }
}

// ─── Handler functions ───

async function handleInteractiveReply(
  userId: string,
  from: string,
  buttonId: string,
): Promise<boolean> {
  if (buttonId.startsWith("proactive_")) {
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
        const grootResponse = await generateGrootResponse(userId, result.text, displayName);
        await sendWhatsAppMessage(parsed.from, grootResponse.text);
        await storeOutboundMessage(userId, grootResponse.text, {
          mood: grootResponse.detectedMood,
          source: "voice_note",
        });

        if (grootResponse.shouldStoreMemory) {
          await storeLongTermMemoryAndMark(
            userId,
            parsed.messageId,
            result.text,
            grootResponse.memoryTags,
          );
        }

        await createRemindersFromDetectedDates(userId, grootResponse.detectedDates);
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

  for (const item of detectedDates.slice(0, 3)) {
    const remindAt = new Date(item.date);
    if (Number.isNaN(remindAt.getTime())) continue;
    if (remindAt.getTime() <= now) continue;

    // Deduplicate by date (same day = same reminder)
    const dateKey = remindAt.toISOString().slice(0, 10);
    if (seenDates.has(dateKey)) continue;
    seenDates.add(dateKey);

    // Check if a reminder already exists for this user on this date
    const supabase = getSupabaseAdmin();
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

    if (existing && existing.length > 0) {
      logger.info({ userId, date: dateKey }, "Skipping duplicate reminder for this date");
      continue;
    }

    await createReminder(
      userId,
      item.event,
      remindAt,
      "Auto-detected from conversation",
    ).catch((error) => {
      logger.warn({ error, userId, item }, "Failed to create detected-date reminder");
    });
  }
}
