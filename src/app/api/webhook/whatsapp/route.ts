import { NextRequest, NextResponse } from "next/server";

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
import { classifyIntent, shouldStoreInLongTerm } from "@/lib/memory/memory-router";
import { extractProfileFacts, upsertProfileFacts } from "@/lib/memory/profile-builder";
import { addMemory, searchMemories } from "@/lib/memory/supermemory-client";
import { storeOutboundMessage } from "@/lib/memory/short-term";
import { processMedia } from "@/lib/media/media-handler";
import { generateGrootResponse, getErrorResponse } from "@/lib/ai/groot-engine";
import { parseShortcut, getShortcutConfirmation } from "@/lib/capture/shortcut-parser";
import { createTask } from "@/lib/capture/task-manager";
import { extractUrls, processLink } from "@/lib/capture/link-processor";
import {
  handlePendingOutboundReply,
  handleSendConfirmation,
  handleSendRequest,
} from "@/lib/whatsapp/outbound";
import { matchBareNumber } from "@/lib/habits/bare-number-parser";
import { recordCheckin, getStreakMessage } from "@/lib/habits/tracker";
import { parseReminderText } from "@/lib/reminders/detector";
import { createReminder, formatReminderTime } from "@/lib/reminders/scheduler";
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
 * Validates signature → deduplicates → enqueues async processing.
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

    if (acceptedMessages.length > 0) {
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
    }

    logger.info(
      {
        received: parsedMessages.length,
        accepted: acceptedMessages.length,
        latencyMs: Date.now() - startTime,
      },
      "Webhook accepted",
    );

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Webhook processing error");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}

/**
 * Full message processing pipeline.
 * Order: mark read → user lookup → onboarding → media → interactive actions → shortcuts/links/habits/intents → Groot AI
 *
 * Optimized: non-critical DB writes run in parallel / fire-and-forget to reduce latency.
 */
async function processMessage(parsed: ParsedMessage): Promise<void> {
  // Fire-and-forget: mark as read doesn't block processing
  markMessageAsRead(parsed.messageId).catch(() => {});

  const user = await getOrCreateUser(parsed.from, parsed.displayName);

  // Run non-critical early writes in parallel (don't block the pipeline)
  const earlyWrites: Promise<unknown>[] = [
    markUserResponded(user.id),
  ];
  if (user.onboarding_step > 0 || isOnboardingComplete(user)) {
    earlyWrites.push(storeInboundMessage(user.id, parsed));
  }
  // Don't await — let these run while we continue processing
  const earlyWritesPromise = Promise.allSettled(earlyWrites);

  // Onboarding
  if (!isOnboardingComplete(user)) {
    const handled = await handleOnboarding(user, parsed);
    if (handled) { await earlyWritesPromise; return; }
  }

  // Media processing (audio/image)
  if (parsed.mediaId && parsed.mediaMimeType) {
    await handleMedia(user.id, parsed, user.display_name);
    await earlyWritesPromise;
    return;
  }

  // Interactive button/list replies (send confirmations, proactive preferences)
  if (parsed.interactiveReply?.id) {
    const handled = await handleInteractiveReply(
      user.id,
      parsed.from,
      parsed.interactiveReply.id,
    );
    if (handled) { await earlyWritesPromise; return; }
  }

  const text = parsed.text;
  if (!text) {
    await sendWhatsAppMessage(
      parsed.from,
      "_I received your message but I can only handle text for now._",
    );
    await earlyWritesPromise;
    return;
  }

  // Pending outbound follow-up (e.g., waiting for contact number)
  if (await handlePendingOutboundReply(user.id, parsed.from, text)) {
    await earlyWritesPromise;
    return;
  }

  // 1. Shortcuts (fastest path — skip AI)
  const shortcut = parseShortcut(text);
  if (shortcut) {
    await handleShortcut(user.id, parsed.from, shortcut, parsed.messageId);
    return;
  }

  // 2. URL detection
  const urls = extractUrls(text);
  if (urls.length > 0) {
    await handleLink(user.id, parsed.from, urls[0]!, parsed.messageId);
    return;
  }

  // 3. Bare number (habit check-in)
  const bareNumber = await matchBareNumber(user.id, text);
  if (bareNumber) {
    const { streak, isMilestone } = await recordCheckin(
      user.id,
      bareNumber.habit.id,
      bareNumber.value,
    );
    const msg = getStreakMessage(bareNumber.habit.name, streak, isMilestone);
    await sendWhatsAppMessage(parsed.from, msg);
    await storeOutboundMessage(user.id, msg);
    return;
  }

  // Ensure early writes have landed before we query DB further
  await earlyWritesPromise;

  // 4. Intent classification (regex — instant, no cost)
  const classified = classifyIntent(text);
  logger.info(
    { userId: user.id, intent: classified.intent, confidence: classified.confidence },
    "Intent classified",
  );

  // Extract profile facts in background (don't block response)
  const profileFacts = extractProfileFacts(text);
  const profilePromise = profileFacts.length > 0
    ? upsertProfileFacts(user.id, profileFacts)
    : Promise.resolve();

  // Determine if we should store in long-term memory (deferred until after response)
  const shouldStore = classified.intent !== "store_memory" && shouldStoreInLongTerm(text, classified.intent);

  // Route by intent
  switch (classified.intent) {
    case "store_memory": {
      // Store + reply in parallel
      const [, response] = await Promise.all([
        storeLongTermMemoryAndMark(user.id, parsed.messageId, text, ["explicit_memory"]),
        Promise.resolve("*Got it, I'll remember that.* 🌱"),
      ]);
      await sendWhatsAppMessage(parsed.from, response);
      storeOutboundMessage(user.id, response).catch(() => {});
      break;
    }

    case "query_memory": {
      const results = await searchMemories(text, user.id, 3);
      const response = results.length > 0
        ? `Here's what I remember:\n\n${results.map((r) => `• ${r.content}`).join("\n\n")}`
        : "_I don't have anything stored about that yet. Tell me and I'll remember it._";
      await sendWhatsAppMessage(parsed.from, response);
      storeOutboundMessage(user.id, response).catch(() => {});
      break;
    }

    case "send_message": {
      await handleSendRequest({
        contactName:
          text
            .replace(/^(send|tell|message|text)\s+/i, "")
            .split(/\s+(saying|that|a message)\s+/i)[0] ?? "",
        messageContent: text,
        userId: user.id,
        userPhone: parsed.from,
      });
      break;
    }

    case "command": {
      await handleCommand(
        user.id,
        parsed.from,
        classified.extractedData?.command ?? "help",
      );
      break;
    }

    default: {
      try {
        const grootResponse = await generateGrootResponse(
          user.id,
          text,
          user.display_name,
        );

        // Send reply immediately — don't wait for background writes
        await sendWhatsAppMessage(parsed.from, grootResponse.text);

        // All post-response operations in parallel (non-blocking)
        const postOps: Promise<unknown>[] = [
          storeOutboundMessage(user.id, grootResponse.text, {
            mood: grootResponse.detectedMood,
            intent: classified.intent,
          }),
          createRemindersFromDetectedDates(user.id, grootResponse.detectedDates),
        ];

        // Defer long-term memory storage to after response is sent
        if (shouldStore || grootResponse.shouldStoreMemory) {
          postOps.push(
            storeLongTermMemoryAndMark(
              user.id,
              parsed.messageId,
              text,
              grootResponse.memoryTags.length > 0 ? grootResponse.memoryTags : [classified.intent],
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
  }

  // Ensure profile updates finish
  await profilePromise.catch(() => {});
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
  await sendWhatsAppMessage(parsed.from, "_Processing your media..._");
  const result = await processMedia(parsed.mediaId!, parsed.type, parsed.mediaMimeType!);

  if (result?.text) {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("messages")
      .update({ media_description: result.text })
      .eq("user_id", userId)
      .eq("whatsapp_message_id", parsed.messageId);

    if (result.type === "transcription") {
      // Process transcribed voice note through Groot AI — reply with text
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

async function handleShortcut(
  userId: string,
  from: string,
  shortcut: NonNullable<ReturnType<typeof parseShortcut>>,
  inboundMessageId: string,
): Promise<void> {
  switch (shortcut.type) {
    case "todo":
      await createTask(userId, shortcut.content, "todo");
      break;
    case "idea":
      await storeLongTermMemoryAndMark(userId, inboundMessageId, shortcut.content, ["idea"]);
      break;
    case "note":
      await storeLongTermMemoryAndMark(userId, inboundMessageId, shortcut.content, ["note"]);
      break;
    case "remind": {
      const parsedReminder = parseReminderText(shortcut.content);
      if (!parsedReminder) {
        const invalidTimeResponse =
          "I can set that reminder, but I need a time. Try: *remind: call dentist tomorrow 3pm* or *remind: buy milk in 2 hours*";
        await sendWhatsAppMessage(from, invalidTimeResponse);
        await storeOutboundMessage(userId, invalidTimeResponse);
        return;
      }

      await createReminder(userId, parsedReminder.content, parsedReminder.remindAt);
      const time = formatReminderTime(parsedReminder.remindAt.toISOString());
      const response = `*Reminder set:* ${parsedReminder.content}\n_I'll remind you ${time}_`;
      await sendWhatsAppMessage(from, response);
      await storeOutboundMessage(userId, response);
      return;
    }
  }

  const response = getShortcutConfirmation(shortcut.type, shortcut.content);
  await sendWhatsAppMessage(from, response);
  await storeOutboundMessage(userId, response);
}

async function handleLink(
  userId: string,
  from: string,
  url: string,
  inboundMessageId: string,
): Promise<void> {
  await sendWhatsAppMessage(from, "_Reading that article now..._");
  const response = await processLink(url, userId);
  await sendWhatsAppMessage(from, response);
  await storeOutboundMessage(userId, response);
  await markInboundMessageAsSynced(userId, inboundMessageId);
}

async function handleCommand(
  userId: string,
  from: string,
  command: string,
): Promise<void> {
  switch (command) {
    case "help": {
      const helpText = `Here's what I can do:\n\n*Quick Capture*\n• *note:* _save a note_\n• *todo:* _add a task_\n• *idea:* _capture an idea_\n• *remind:* _set a reminder_\n\n*Memory*\n• Tell me facts — I'll remember them\n• Ask me anything you've told me\n\n*Habits*\n• Track habits with daily check-ins\n• Streak milestones and trends\n\n*More*\n• Share links for summaries\n• Send voice notes\n• Send images for analysis`;
      await sendWhatsAppMessage(from, helpText);
      await storeOutboundMessage(userId, helpText);
      break;
    }
    default: {
      await sendWhatsAppMessage(
        from,
        `_Command "${command}" not recognized. Type *help* to see what I can do._`,
      );
    }
  }
}

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

async function createRemindersFromDetectedDates(
  userId: string,
  detectedDates: Array<{ date: string; event: string }>,
): Promise<void> {
  if (detectedDates.length === 0) return;

  const now = Date.now();
  for (const item of detectedDates.slice(0, 3)) {
    const remindAt = new Date(item.date);
    if (Number.isNaN(remindAt.getTime())) continue;
    if (remindAt.getTime() <= now) continue;

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
