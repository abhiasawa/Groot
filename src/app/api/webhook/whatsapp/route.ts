import { NextRequest, NextResponse } from "next/server";
import { validateWebhookSignature } from "@/lib/whatsapp/validation";
import { parseWebhookPayload } from "@/lib/whatsapp/webhook-parser";
import { sendWhatsAppMessage, markMessageAsRead } from "@/lib/whatsapp/client";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser, isOnboardingComplete, handleOnboarding } from "@/lib/whatsapp/onboarding";
import { classifyIntent, shouldStoreInLongTerm } from "@/lib/memory/memory-router";
import { extractProfileFacts, upsertProfileFacts } from "@/lib/memory/profile-builder";
import { addMemory, searchMemories } from "@/lib/memory/supermemory-client";
import { storeOutboundMessage } from "@/lib/memory/short-term";
import { processMedia } from "@/lib/media/media-handler";
import { generateGrootResponse, getErrorResponse } from "@/lib/ai/groot-engine";
import { parseShortcut, getShortcutConfirmation } from "@/lib/capture/shortcut-parser";
import { createTask } from "@/lib/capture/task-manager";
import { extractUrls, processLink } from "@/lib/capture/link-processor";
import { handleSendRequest } from "@/lib/whatsapp/outbound";
import { matchBareNumber } from "@/lib/habits/bare-number-parser";
import { recordCheckin, getStreakMessage } from "@/lib/habits/tracker";
import { parseReminderText } from "@/lib/reminders/detector";
import { createReminder, formatReminderTime } from "@/lib/reminders/scheduler";
import { markUserResponded } from "@/lib/proactive/scheduler";
import { logger } from "@/lib/logger";
import type { WhatsAppWebhookPayload } from "@/types/whatsapp";

/**
 * GET: Meta webhook verification.
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
 * POST: Incoming WhatsApp messages.
 * Validates signature → deduplicates → processes message.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const rawBody = Buffer.from(await request.arrayBuffer());
    const signature = request.headers.get("x-hub-signature-256");

    if (
      process.env.META_APP_SECRET &&
      !validateWebhookSignature(rawBody, signature, process.env.META_APP_SECRET)
    ) {
      logger.warn("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody.toString("utf8")) as WhatsAppWebhookPayload;

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Not a WhatsApp event" }, { status: 404 });
    }

    const parsed = parseWebhookPayload(body);
    if (!parsed) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Deduplication
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("processed_messages")
      .select("id")
      .eq("whatsapp_message_id", parsed.messageId)
      .single();

    if (existing) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    await supabase.from("processed_messages").upsert(
      { whatsapp_message_id: parsed.messageId, processed_at: new Date().toISOString() },
      { onConflict: "whatsapp_message_id", ignoreDuplicates: true },
    );

    await processMessage(parsed);

    logger.info(
      { messageId: parsed.messageId, from: parsed.from, type: parsed.type, latencyMs: Date.now() - startTime },
      "Message processed",
    );

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Webhook processing error");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}

/**
 * Full message processing pipeline.
 * Order: mark read → user lookup → onboarding → media → shortcuts → links → habits → intents → Groot AI
 */
async function processMessage(
  parsed: NonNullable<ReturnType<typeof parseWebhookPayload>>,
): Promise<void> {
  await markMessageAsRead(parsed.messageId).catch(() => {});

  const user = await getOrCreateUser(parsed.from, parsed.displayName);

  // Track user activity for de-escalation
  await markUserResponded(user.id);

  // Store inbound message
  if (user.onboarding_step > 0 || isOnboardingComplete(user)) {
    await storeInboundMessage(user.id, parsed);
  }

  // Onboarding
  if (!isOnboardingComplete(user)) {
    const handled = await handleOnboarding(user, parsed);
    if (handled) return;
  }

  // Media processing (audio/image)
  if (parsed.mediaId && parsed.mediaMimeType) {
    await handleMedia(user.id, parsed);
    return;
  }

  const text = parsed.text;
  if (!text) {
    await sendWhatsAppMessage(parsed.from, "_I received your message but I can only handle text for now._");
    return;
  }

  // 1. Shortcuts (fastest path — skip AI)
  const shortcut = parseShortcut(text);
  if (shortcut) {
    await handleShortcut(user.id, parsed.from, shortcut);
    return;
  }

  // 2. URL detection
  const urls = extractUrls(text);
  if (urls.length > 0) {
    await handleLink(user.id, parsed.from, urls[0]!);
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

  // 4. Intent classification
  const classified = classifyIntent(text);
  logger.info({ userId: user.id, intent: classified.intent, confidence: classified.confidence }, "Intent classified");

  // Extract profile facts
  const profileFacts = extractProfileFacts(text);
  if (profileFacts.length > 0) {
    await upsertProfileFacts(user.id, profileFacts);
  }

  // Store in long-term memory if substantive
  if (shouldStoreInLongTerm(text, classified.intent)) {
    await addMemory(text, user.id, [classified.intent]);
  }

  // Route by intent
  switch (classified.intent) {
    case "store_memory": {
      await addMemory(text, user.id, ["explicit_memory"]);
      const response = "*Got it, I'll remember that.* 🌱";
      await sendWhatsAppMessage(parsed.from, response);
      await storeOutboundMessage(user.id, response);
      break;
    }

    case "query_memory": {
      const results = await searchMemories(text, user.id, 3);
      if (results.length > 0) {
        const memories = results.map((r) => `• ${r.content}`).join("\n\n");
        const response = `Here's what I remember:\n\n${memories}`;
        await sendWhatsAppMessage(parsed.from, response);
        await storeOutboundMessage(user.id, response);
      } else {
        const response = "_I don't have anything stored about that yet. Tell me and I'll remember it._";
        await sendWhatsAppMessage(parsed.from, response);
        await storeOutboundMessage(user.id, response);
      }
      break;
    }

    case "send_message": {
      await handleSendRequest({
        contactName: text.replace(/^(send|tell|message|text)\s+/i, "").split(/\s+(saying|that|a message)\s+/i)[0] ?? "",
        messageContent: text,
        userId: user.id,
        userPhone: parsed.from,
      });
      break;
    }

    case "command": {
      await handleCommand(user.id, parsed.from, classified.extractedData?.command ?? "help");
      break;
    }

    default: {
      // Groot AI engine
      try {
        const grootResponse = await generateGrootResponse(user.id, text, user.display_name);
        await sendWhatsAppMessage(parsed.from, grootResponse.text);
        await storeOutboundMessage(user.id, grootResponse.text, {
          mood: grootResponse.detectedMood,
          intent: classified.intent,
        });
      } catch (error) {
        logger.error({ error, userId: user.id }, "Groot engine failed");
        const fallback = getErrorResponse();
        await sendWhatsAppMessage(parsed.from, fallback);
        await storeOutboundMessage(user.id, fallback);
      }
    }
  }
}

// ─── Handler functions ───

async function handleMedia(
  userId: string,
  parsed: NonNullable<ReturnType<typeof parseWebhookPayload>>,
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
      const response = `_Voice note transcribed:_\n\n"${result.text}"`;
      await sendWhatsAppMessage(parsed.from, response);
      await storeOutboundMessage(userId, response);
    } else if (result.type === "vision") {
      const response = `_I see:_ ${result.description || result.text}`;
      await sendWhatsAppMessage(parsed.from, response);
      await storeOutboundMessage(userId, response);
    }
  } else {
    await sendWhatsAppMessage(parsed.from, "_I received your media but couldn't process it right now. I've saved it for later._");
  }
}

async function handleShortcut(
  userId: string,
  from: string,
  shortcut: NonNullable<ReturnType<typeof parseShortcut>>,
): Promise<void> {
  switch (shortcut.type) {
    case "todo":
      await createTask(userId, shortcut.content, "todo");
      break;
    case "idea":
      await addMemory(shortcut.content, userId, ["idea"]);
      break;
    case "note":
      await addMemory(shortcut.content, userId, ["note"]);
      break;
    case "remind": {
      const parsed = parseReminderText(shortcut.content);
      if (parsed) {
        await createReminder(userId, parsed.content, parsed.remindAt);
        const time = formatReminderTime(parsed.remindAt.toISOString());
        const response = `*Reminder set:* ${parsed.content}\n_I'll remind you ${time}_`;
        await sendWhatsAppMessage(from, response);
        await storeOutboundMessage(userId, response);
        return;
      }
      break;
    }
  }

  const response = getShortcutConfirmation(shortcut.type, shortcut.content);
  await sendWhatsAppMessage(from, response);
  await storeOutboundMessage(userId, response);
}

async function handleLink(userId: string, from: string, url: string): Promise<void> {
  await sendWhatsAppMessage(from, "_Reading that article now..._");
  const response = await processLink(url, userId);
  await sendWhatsAppMessage(from, response);
  await storeOutboundMessage(userId, response);
}

async function handleCommand(userId: string, from: string, command: string): Promise<void> {
  switch (command) {
    case "help": {
      const helpText = `Here's what I can do:\n\n*Quick Capture*\n• *note:* _save a note_\n• *todo:* _add a task_\n• *idea:* _capture an idea_\n• *remind:* _set a reminder_\n\n*Memory*\n• Tell me facts — I'll remember them\n• Ask me anything you've told me\n\n*Habits*\n• Track habits with daily check-ins\n• Streak milestones and trends\n\n*More*\n• Share links for summaries\n• Send voice notes\n• Send images for analysis`;
      await sendWhatsAppMessage(from, helpText);
      await storeOutboundMessage(userId, helpText);
      break;
    }
    default: {
      await sendWhatsAppMessage(from, `_Command "${command}" not recognized. Type *help* to see what I can do._`);
    }
  }
}

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
    metadata: parsed.interactiveReply ? { interactive_reply: parsed.interactiveReply } : {},
  });
}
