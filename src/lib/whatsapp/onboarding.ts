import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface UserRecord {
  id: string;
  whatsapp_number: string;
  display_name: string | null;
  onboarding_step: number;
  onboarding_completed_at: string | null;
}

/**
 * Check if a user exists. If not, create them with onboarding already complete.
 * Returns the user record and whether they were just created (first message ever).
 */
export async function getOrCreateUser(
  whatsappNumber: string,
  displayName: string,
): Promise<{ user: UserRecord; isNewUser: boolean }> {
  const supabase = getSupabaseAdmin();

  // Try to fetch existing user
  const { data: existing } = await supabase
    .from("users")
    .select("id, whatsapp_number, display_name, onboarding_step, onboarding_completed_at")
    .eq("whatsapp_number", whatsappNumber)
    .single();

  if (existing) {
    logger.info({ userId: existing.id, displayName: existing.display_name }, "Existing user found");
    return { user: existing as UserRecord, isNewUser: false };
  }

  // Create new user — onboarding complete from the start
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      whatsapp_number: whatsappNumber,
      display_name: displayName || null,
      onboarding_step: 4,
      onboarding_completed_at: new Date().toISOString(),
    })
    .select("id, whatsapp_number, display_name, onboarding_step, onboarding_completed_at")
    .single();

  if (error || !newUser) {
    logger.error({ error, whatsappNumber }, "Failed to create user");
    throw new Error("Failed to create user");
  }

  logger.info({ userId: newUser.id, whatsappNumber }, "New user created");
  return { user: newUser as UserRecord, isNewUser: true };
}

/**
 * Returns true if user has completed onboarding and should go to normal flow.
 */
export function isOnboardingComplete(user: UserRecord): boolean {
  return user.onboarding_completed_at !== null || user.onboarding_step >= 4;
}
