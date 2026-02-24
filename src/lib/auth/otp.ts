import "server-only";

import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import { signJWT } from "./jwt";
import { logger } from "@/lib/logger";

// ── Constants ─────────────────────────────────────────

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_REQUESTS = 3;

// ── Types ─────────────────────────────────────────────

interface OTPResult {
  success: boolean;
  error?: string;
}

interface VerifyResult {
  success: boolean;
  token?: string;
  userId?: string;
  error?: string;
}

// ── Public API ────────────────────────────────────────

/**
 * Request an OTP for a WhatsApp phone number.
 *
 * 1. Looks up user by whatsapp_number
 * 2. Checks rate limit (max 3 per 15 min)
 * 3. Generates 6-digit code
 * 4. Stores in login_otps table
 * 5. Sends via WhatsApp
 */
export async function requestOTP(phoneNumber: string): Promise<OTPResult> {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized) {
    return { success: false, error: "Invalid phone number format" };
  }

  const supabase = getSupabaseAdmin();

  // 1. Find user by WhatsApp number
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, display_name, whatsapp_number")
    .eq("whatsapp_number", normalized)
    .single();

  if (userError || !user) {
    logger.info({ phoneNumber: normalized }, "OTP requested for unknown number");
    return {
      success: false,
      error: "No account found for this number. Message Groot on WhatsApp first to create your account.",
    };
  }

  // 2. Rate limit: max N requests per phone per window
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { count: recentCount } = await supabase
    .from("login_otps")
    .select("id", { count: "exact", head: true })
    .eq("phone_number", normalized)
    .gte("created_at", windowStart);

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    logger.warn({ phoneNumber: normalized, userId: user.id }, "OTP rate limit exceeded");
    return {
      success: false,
      error: "Too many attempts. Please wait a few minutes before trying again.",
    };
  }

  // 3. Generate code
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  // 4. Store OTP
  const { error: insertError } = await supabase.from("login_otps").insert({
    user_id: user.id,
    phone_number: normalized,
    code,
    platform: "whatsapp",
    expires_at: expiresAt,
  });

  if (insertError) {
    logger.error({ error: insertError, userId: user.id }, "Failed to store OTP");
    return { success: false, error: "Something went wrong. Please try again." };
  }

  // 5. Send via WhatsApp
  try {
    const greeting = user.display_name ? `Hey ${user.display_name}! ` : "";
    await sendWhatsAppMessage(
      normalized,
      `${greeting}Your login code is: *${code}*\n\nThis code expires in ${OTP_TTL_MINUTES} minutes. Don't share it with anyone.`,
    );

    logger.info({ userId: user.id, phoneNumber: normalized }, "OTP sent via WhatsApp");
    return { success: true };
  } catch (sendError) {
    logger.error({ error: sendError, userId: user.id }, "Failed to send OTP via WhatsApp");
    return { success: false, error: "Failed to send code. Please try again." };
  }
}

/**
 * Verify an OTP and return a JWT on success.
 *
 * 1. Find the most recent unverified OTP for this phone + code
 * 2. Check expiry and attempt count
 * 3. Mark as verified
 * 4. Issue JWT
 */
export async function verifyOTP(phoneNumber: string, code: string): Promise<VerifyResult> {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized) {
    return { success: false, error: "Invalid phone number format" };
  }

  if (!code || code.length !== OTP_LENGTH || !/^\d+$/.test(code)) {
    return { success: false, error: "Invalid code format" };
  }

  const supabase = getSupabaseAdmin();

  // Find the matching OTP (most recent, unverified, not expired)
  const { data: otp, error: otpError } = await supabase
    .from("login_otps")
    .select("id, user_id, expires_at, attempts, max_attempts")
    .eq("phone_number", normalized)
    .eq("code", code)
    .is("verified_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (otpError || !otp) {
    // Increment attempts on the most recent OTP for this phone (prevent brute force)
    await incrementLatestAttempt(supabase, normalized);
    logger.info({ phoneNumber: normalized }, "OTP verification failed — no match");
    return { success: false, error: "Invalid or expired code. Please try again." };
  }

  // Check max attempts
  if (otp.attempts >= otp.max_attempts) {
    logger.warn({ otpId: otp.id, phoneNumber: normalized }, "OTP max attempts exceeded");
    return { success: false, error: "Too many failed attempts. Please request a new code." };
  }

  // Mark as verified
  const { error: updateError } = await supabase
    .from("login_otps")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", otp.id);

  if (updateError) {
    logger.error({ error: updateError, otpId: otp.id }, "Failed to mark OTP as verified");
    return { success: false, error: "Something went wrong. Please try again." };
  }

  // Issue JWT
  const token = await signJWT(otp.user_id);

  logger.info({ userId: otp.user_id, phoneNumber: normalized }, "OTP verified — JWT issued");
  return { success: true, token, userId: otp.user_id };
}

// ── Helpers ───────────────────────────────────────────

/**
 * Generate a cryptographically random N-digit OTP.
 */
function generateOTP(): string {
  const max = 10 ** OTP_LENGTH;
  const num = crypto.randomInt(0, max);
  return num.toString().padStart(OTP_LENGTH, "0");
}

/**
 * Normalize a phone number to the format WhatsApp uses: "919167900916"
 * (country code + number, no +, no spaces).
 *
 * - Strips whitespace, dashes, parens, leading +
 * - If 10 digits (Indian local number), prepends 91
 * - Result always matches WhatsApp's stored format
 */
function normalizePhone(raw: string): string | null {
  // Strip whitespace, dashes, parens, +
  const cleaned = raw.replace(/[\s\-()+ ]/g, "");

  // Must be all digits
  if (!/^\d{10,15}$/.test(cleaned)) {
    return null;
  }

  // If 10 digits, assume Indian number — prepend 91
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  // Otherwise use as-is (already has country code)
  return cleaned;
}

/**
 * Increment the attempt counter on the latest unverified OTP for this phone.
 * Used when a wrong code is entered (even if the code doesn't match any OTP).
 */
async function incrementLatestAttempt(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  phoneNumber: string,
): Promise<void> {
  const { data: latest } = await supabase
    .from("login_otps")
    .select("id, attempts")
    .eq("phone_number", phoneNumber)
    .is("verified_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latest) {
    await supabase
      .from("login_otps")
      .update({ attempts: latest.attempts + 1 })
      .eq("id", latest.id);
  }
}
