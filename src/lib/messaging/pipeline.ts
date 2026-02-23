import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/whatsapp/onboarding";
import { storeOutboundMessage } from "@/lib/memory/short-term";
import { addMemory } from "@/lib/memory/supermemory-client";
import { processMediaFromBuffer } from "@/lib/media/media-handler";
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
import { sendMessage, sendImage } from "./dispatcher";
import { isLastImageRequest, extractStoredMediaId } from "./last-image";
import { logger } from "@/lib/logger";
import type { ParsedMessage } from "@/types/whatsapp";

/**
 * Platform-specific media download function.
 * WhatsApp passes downloadWhatsAppMedia, Telegram passes downloadTelegramMedia.
 */
export type DownloadMediaFn = (
  mediaId: string,
) => Promise<{ buffer: Buffer; mimeType: string }>;

/**
 * Claim a message ID for processing (deduplication).
 * Returns true if this is the first claim, false if already processed.
 */
export async function claimMessageForProcessing(messageId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("processed_messages").insert({
    platform_message_id: messageId,
    processed_at: new Date().toISOString(),
  });

  if (!error) return true;
  if (error.code === "23505") return false;

  logger.error({ error, messageId }, "Failed to claim message for processing");
  return false;
}

/**
 * Full message processing pipeline — shared between WhatsApp and Telegram.
 * Everything flows through Groot AI — no regex routing.
 */
export async function processMessage(
  parsed: ParsedMessage,
  downloadMedia: DownloadMediaFn,
): Promise<void> {
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
        platform: parsed.platform,
        userId,
        outcome,
        totalMs: Date.now() - pStart,
        ...metrics,
        ...extra,
      },
      "Message latency summary",
    );
  };

  const { user, isNewUser } = await getOrCreateUser(parsed.platform, parsed.from, parsed.displayName);
  const pUser = Date.now();
  userId = user.id;
  metrics.userLookupMs = pUser - pStart;

  logger.info(
    { userId: user.id, isNewUser, type: parsed.type, platform: parsed.platform, hasMedia: !!parsed.mediaId, hasText: !!parsed.text, hasInteractive: !!parsed.interactiveReply, userLookupMs: metrics.userLookupMs },
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
    await handleMedia(user.id, parsed, user.display_name, isNewUser, downloadMedia);
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
      parsed.platform,
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
    await sendMessage(
      parsed.platform,
      parsed.from,
      "_I received your message but I can only handle text for now._",
    );
    metrics.sendMs = Date.now() - tSend;
    outcome = "non_text_fallback_sent";
    logSummary();
    return;
  }

  if (isLastImageRequest(text)) {
    const tRecall = Date.now();
    await handleLastImageRecall(user.id, parsed.platform, parsed.from);
    metrics.lastImageRecallMs = Date.now() - tRecall;
    outcome = "handled_last_image_recall";
    logSummary();
    return;
  }

  // Pending outbound follow-up — WhatsApp only
  if (parsed.platform === "whatsapp") {
    const tPending = Date.now();
    const handledPending = await handlePendingOutboundReply(user.id, parsed.from, text);
    metrics.pendingOutboundMs = Date.now() - tPending;
    if (handledPending) {
      logger.info({ userId: user.id }, "Message handled by pending outbound reply");
      outcome = "handled_pending_outbound";
      logSummary();
      return;
    }
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
    await sendMessage(parsed.platform, parsed.from, grootResponse.text);
    const pSend = Date.now();
    metrics.sendMs = pSend - tSend;

    // Post-response actions driven by AI metadata
    const postOps: Promise<unknown>[] = [
      storeOutboundMessage(user.id, grootResponse.text, {
        mood: grootResponse.detectedMood,
      }),
      createRemindersFromDetectedDates(user.id, grootResponse.detectedDates),
      enrichInboundMessageMetadata(user.id, parsed.messageId, {
        memoryTags: grootResponse.memoryTags.length > 0 ? grootResponse.memoryTags : ["daily-life"],
        detectedMood: grootResponse.detectedMood ?? null,
      }),
    ];

    if (grootResponse.shouldStoreMemory) {
      postOps.push(
        storeLongTermMemoryAndMark(
          user.id,
          parsed.messageId,
          text,
          grootResponse.memoryTags.length > 0 ? grootResponse.memoryTags : ["daily-life"],
        ),
      );
    }

    const tPostOps = Date.now();
    await Promise.allSettled(postOps);
    metrics.postOpsMs = Date.now() - tPostOps;
    outcome = "sent";

    logSummary({
      shouldStoreMemory: grootResponse.shouldStoreMemory,
      detectedDates: grootResponse.detectedDates.length,
      responseLength: grootResponse.text.length,
    });
  } catch (error) {
    logger.error({ error, userId: user.id }, "Groot engine failed");
    const fallback = getErrorResponse();
    const tSend = Date.now();
    await sendMessage(parsed.platform, parsed.from, fallback);
    metrics.sendMs = Date.now() - tSend;
    storeOutboundMessage(user.id, fallback).catch(() => {});
    outcome = "fallback_sent_after_error";
    logSummary();
  }
}

// ─── Handler functions ───

async function handleInteractiveReply(
  userId: string,
  platform: ParsedMessage["platform"],
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
    await sendMessage(platform, from, response);
    await storeOutboundMessage(userId, response, {
      action: "update_proactive_preference",
      preference,
    });
    return true;
  }

  // Send-on-behalf confirmations — WhatsApp only
  if (platform === "whatsapp") {
    return handleSendConfirmation(userId, from, buttonId);
  }

  return false;
}

interface LastImageMessageRow {
  media_url: string | null;
}

async function handleLastImageRecall(
  userId: string,
  platform: ParsedMessage["platform"],
  from: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select("media_url")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .eq("platform", platform)
    .eq("message_type", "image")
    .not("media_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<LastImageMessageRow>();

  if (error) {
    logger.error({ error, userId, platform }, "Failed to fetch last inbound image");
    const fallback = "_I hit a snag while finding your last image. Try again in a moment._";
    await sendMessage(platform, from, fallback);
    await storeOutboundMessage(userId, fallback, {
      action: "last_image_recall",
      status: "lookup_error",
    });
    return;
  }

  const mediaId = extractStoredMediaId(data?.media_url ?? null);
  if (!mediaId) {
    const notFound = "_I couldn't find a previous image from you yet._";
    await sendMessage(platform, from, notFound);
    await storeOutboundMessage(userId, notFound, {
      action: "last_image_recall",
      status: "not_found",
    });
    return;
  }

  try {
    await sendImage(platform, from, mediaId, "Here is your last image.");
    await storeOutboundMessage(userId, "Sent your last image back.", {
      action: "last_image_recall",
      status: "sent",
    });
  } catch (sendError) {
    logger.warn({ sendError, userId, platform, mediaId }, "Failed to resend last image");
    const fallback =
      "_I found your last image but couldn't resend it right now. It may have expired. Send it again and I'll try once more._";
    await sendMessage(platform, from, fallback);
    await storeOutboundMessage(userId, fallback, {
      action: "last_image_recall",
      status: "send_failed",
    });
  }
}

async function handleMedia(
  userId: string,
  parsed: ParsedMessage,
  displayName: string | null,
  isNewUser: boolean,
  downloadMedia: DownloadMediaFn,
): Promise<void> {
  // Only show status for non-audio media — voice notes reply directly
  if (parsed.type !== "audio") {
    await sendMessage(parsed.platform, parsed.from, "_Processing your media..._");
  }

  let result;
  try {
    const { buffer, mimeType: actualMimeType } = await downloadMedia(parsed.mediaId!);
    const mime = actualMimeType || parsed.mediaMimeType!;

    logger.info(
      { mediaId: parsed.mediaId, size: buffer.length, mimeType: mime },
      "Media downloaded",
    );

    result = await processMediaFromBuffer(buffer, parsed.type, mime);
  } catch (error) {
    logger.error({ error, mediaId: parsed.mediaId }, "Media download/processing failed");
    result = null;
  }

  if (result && (result.text || result.description)) {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("messages")
      .update({ media_description: result.description || result.text })
      .eq("user_id", userId)
      .eq("platform_message_id", parsed.messageId);

    if (result.type === "transcription") {
      try {
        const grootResponse = await generateGrootResponse(userId, result.text, displayName, isNewUser);
        await sendMessage(parsed.platform, parsed.from, grootResponse.text);

        const postOps: Promise<unknown>[] = [
          storeOutboundMessage(userId, grootResponse.text, {
            mood: grootResponse.detectedMood,
            source: "voice_note",
          }),
          createRemindersFromDetectedDates(userId, grootResponse.detectedDates),
          enrichInboundMessageMetadata(userId, parsed.messageId, {
            memoryTags: grootResponse.memoryTags.length > 0 ? grootResponse.memoryTags : ["daily-life"],
            detectedMood: grootResponse.detectedMood ?? null,
          }),
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
        await sendMessage(parsed.platform, parsed.from, fallback);
        await storeOutboundMessage(userId, fallback);
      }
    } else if (result.type === "vision") {
      const imageContext = [
        result.description ? `[Image: ${result.description}]` : null,
        result.text ? `[Text in image: ${result.text}]` : null,
        parsed.caption ? `[User caption: ${parsed.caption}]` : null,
      ].filter(Boolean).join("\n");

      try {
        const grootResponse = await generateGrootResponse(userId, imageContext, displayName, isNewUser);
        await sendMessage(parsed.platform, parsed.from, grootResponse.text);

        const postOps: Promise<unknown>[] = [
          storeOutboundMessage(userId, grootResponse.text, {
            mood: grootResponse.detectedMood,
            source: "image",
          }),
          enrichInboundMessageMetadata(userId, parsed.messageId, {
            memoryTags: grootResponse.memoryTags.length > 0 ? grootResponse.memoryTags : ["daily-life"],
            detectedMood: grootResponse.detectedMood ?? null,
          }),
        ];

        if (grootResponse.shouldStoreMemory) {
          postOps.push(
            storeLongTermMemoryAndMark(userId, parsed.messageId, imageContext, grootResponse.memoryTags),
          );
        }

        await Promise.allSettled(postOps);
      } catch (error) {
        logger.error({ error, userId }, "Groot engine failed for image");
        const fallback = getErrorResponse();
        await sendMessage(parsed.platform, parsed.from, fallback);
        await storeOutboundMessage(userId, fallback);
      }
    }
  } else {
    await sendMessage(
      parsed.platform,
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
    platform_message_id: parsed.messageId,
    platform: parsed.platform,
    metadata: parsed.interactiveReply
      ? { interactive_reply: parsed.interactiveReply }
      : {},
  });
}

async function enrichInboundMessageMetadata(
  userId: string,
  platformMessageId: string,
  aiMetadata: { memoryTags: string[]; detectedMood: string | null },
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("messages")
    .update({ metadata: aiMetadata })
    .eq("user_id", userId)
    .eq("platform_message_id", platformMessageId);
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
    .eq("platform_message_id", inboundMessageId);
}

async function isLatestInboundMessage(
  userId: string,
  platformMessageId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("messages")
    .select("platform_message_id")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return true;
  return data.platform_message_id === platformMessageId;
}

async function createRemindersFromDetectedDates(
  userId: string,
  detectedDates: Array<{ date: string; event: string }>,
): Promise<void> {
  if (detectedDates.length === 0) return;

  const now = Date.now();
  const seenDates = new Set<string>();
  const supabase = getSupabaseAdmin();

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
