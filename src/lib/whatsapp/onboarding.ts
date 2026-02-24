import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { Platform } from "@/types/whatsapp";

export interface UserRecord {
  id: string;
  whatsapp_number: string | null;
  telegram_chat_id: number | null;
  display_name: string | null;
  onboarding_step: number;
  onboarding_completed_at: string | null;
}

/**
 * Check if a user exists by platform identifier. If not, create them.
 * Returns the user record and whether they were just created (first message ever).
 */
export async function getOrCreateUser(
  platform: Platform,
  platformId: string,
  displayName: string,
): Promise<{ user: UserRecord; isNewUser: boolean }> {
  const supabase = getSupabaseAdmin();

  const column = platform === "whatsapp" ? "whatsapp_number" : "telegram_chat_id";
  const value = platform === "telegram" ? Number.parseInt(platformId, 10) : platformId;

  // Try to fetch existing user
  const { data: existing } = await supabase
    .from("users")
    .select("id, whatsapp_number, telegram_chat_id, display_name, onboarding_step, onboarding_completed_at")
    .eq(column, value)
    .single();

  if (existing) {
    logger.info({ userId: existing.id, displayName: existing.display_name, platform }, "Existing user found");
    return { user: existing as UserRecord, isNewUser: false };
  }

  // NOTE: Cross-platform auto-linking was removed (multi-user safety).
  // Previously, this code would find ANY user on the other platform and merge them,
  // which would accidentally link unrelated users (e.g., wife's Telegram to husband's WhatsApp).
  // Cross-platform linking is now handled explicitly via POST /api/auth/link-platform.

  // Create new user — onboarding complete from the start
  const insertData: Record<string, unknown> = {
    display_name: displayName || null,
    onboarding_step: 4,
    onboarding_completed_at: new Date().toISOString(),
  };

  if (platform === "whatsapp") {
    insertData.whatsapp_number = platformId;
  } else {
    insertData.telegram_chat_id = Number.parseInt(platformId, 10);
  }

  const { data: newUser, error } = await supabase
    .from("users")
    .insert(insertData)
    .select("id, whatsapp_number, telegram_chat_id, display_name, onboarding_step, onboarding_completed_at")
    .single();

  if (error || !newUser) {
    logger.error({ error, platform, platformId }, "Failed to create user");
    throw new Error("Failed to create user");
  }

  logger.info({ userId: newUser.id, platform, platformId }, "New user created");

  // Seed starter habits for new users
  try {
    const { createHabit } = await import("@/lib/habits/tracker");
    await Promise.allSettled([
      createHabit(newUser.id as string, "Weight", {
        description: "Log your daily weight",
        category: "fitness",
        targetUnit: "kg",
        frequency: "daily",
      }),
    ]);
    logger.info({ userId: newUser.id }, "Starter habits seeded");
  } catch (error) {
    logger.warn({ error, userId: newUser.id }, "Failed to seed starter habits (non-critical)");
  }

  return { user: newUser as UserRecord, isNewUser: true };
}

/**
 * Returns true if user has completed onboarding and should go to normal flow.
 */
export function isOnboardingComplete(user: UserRecord): boolean {
  return user.onboarding_completed_at !== null || user.onboarding_step >= 4;
}
