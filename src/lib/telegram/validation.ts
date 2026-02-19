/**
 * Validate Telegram webhook secret token.
 * Telegram sends the secret in the X-Telegram-Bot-Api-Secret-Token header.
 * Simple string comparison (not HMAC like WhatsApp).
 */
export function validateTelegramWebhook(
  secretToken: string | null,
  expectedSecret: string,
): boolean {
  if (!secretToken || !expectedSecret) return false;
  return secretToken === expectedSecret;
}
