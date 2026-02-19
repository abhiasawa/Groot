#!/usr/bin/env node

/**
 * Register the Telegram webhook with the Bot API.
 *
 * Usage:
 *   node scripts/setup-telegram-webhook.mjs
 *
 * Required env vars (set in .env.local or export before running):
 *   TELEGRAM_BOT_TOKEN       — from @BotFather
 *   TELEGRAM_WEBHOOK_SECRET  — any random string for validation
 *   NEXT_PUBLIC_APP_URL      — your deployed app URL (e.g., https://groot.vercel.app)
 */

import "dotenv/config";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!BOT_TOKEN || !APP_URL || !SECRET) {
  console.error("Missing required env vars: TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL, TELEGRAM_WEBHOOK_SECRET");
  process.exit(1);
}

const webhookUrl = `${APP_URL}/api/webhook/telegram`;

console.log(`Setting Telegram webhook to: ${webhookUrl}`);

const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: SECRET,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  }),
});

const result = await response.json();

if (result.ok) {
  console.log("Webhook registered successfully!");
  console.log(`  URL: ${webhookUrl}`);
  console.log(`  Description: ${result.description}`);
} else {
  console.error("Failed to register webhook:");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

// Also print bot info for verification
const meResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
const meResult = await meResponse.json();

if (meResult.ok) {
  console.log(`\nBot info:`);
  console.log(`  Username: @${meResult.result.username}`);
  console.log(`  Name: ${meResult.result.first_name}`);
  console.log(`  ID: ${meResult.result.id}`);
}
