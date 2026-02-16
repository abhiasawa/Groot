import crypto from "crypto";

/**
 * Validate the X-Hub-Signature-256 header from Meta's webhook.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function validateWebhookSignature(
  rawBody: Buffer,
  signature: string | null,
  appSecret: string,
): boolean {
  if (!signature) return false;

  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(`sha256=${expectedSig}`, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
