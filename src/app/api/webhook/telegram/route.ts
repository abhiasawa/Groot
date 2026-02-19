import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

export const maxDuration = 60;

import { validateTelegramWebhook } from "@/lib/telegram/validation";
import { parseTelegramUpdate, parseTelegramCallbackQuery } from "@/lib/telegram/webhook-parser";
import { answerCallbackQuery, downloadTelegramMedia } from "@/lib/telegram/client";
import { claimMessageForProcessing, processMessage } from "@/lib/messaging/pipeline";
import { logger } from "@/lib/logger";
import type { TelegramUpdate } from "@/types/telegram";

/**
 * POST: Incoming Telegram bot updates.
 * Validates secret → parses → deduplicates → returns 200 → processes in background.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("TELEGRAM_WEBHOOK_SECRET is missing");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    // Validate secret token header
    const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
    if (!validateTelegramWebhook(secretToken, webhookSecret)) {
      logger.warn("Invalid Telegram webhook secret");
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const update = (await request.json()) as TelegramUpdate;

    // Parse the update into a ParsedMessage
    let parsed;
    let callbackQueryId: string | null = null;

    if (update.callback_query) {
      callbackQueryId = update.callback_query.id;
      parsed = parseTelegramCallbackQuery(update);
    } else if (update.message) {
      parsed = parseTelegramUpdate(update);
    } else {
      // Status updates, edited messages, etc. — ignore
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (!parsed) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Deduplicate
    const claimed = await claimMessageForProcessing(parsed.messageId);
    if (!claimed) {
      logger.info({ messageId: parsed.messageId }, "Telegram message already processed (dedup)");
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    logger.info(
      {
        messageId: parsed.messageId,
        from: parsed.from,
        type: parsed.type,
        hasMedia: !!parsed.mediaId,
        hasText: !!parsed.text,
        hasInteractive: !!parsed.interactiveReply,
        latencyMs: Date.now() - startTime,
      },
      "Telegram webhook accepted",
    );

    // Acknowledge callback query immediately to remove the loading spinner
    if (callbackQueryId) {
      answerCallbackQuery(callbackQueryId).catch(() => {});
    }

    // Process in background — return 200 immediately
    after(async () => {
      try {
        await processMessage(parsed, downloadTelegramMedia);
        logger.info(
          {
            messageId: parsed.messageId,
            from: parsed.from,
            type: parsed.type,
          },
          "Telegram message processed",
        );
      } catch (error) {
        logger.error({ error, messageId: parsed.messageId }, "Telegram async processing failed");
      }
    });

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Telegram webhook error");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
