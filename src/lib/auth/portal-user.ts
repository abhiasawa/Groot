import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface PortalUser {
  id: string;
  whatsapp_number: string;
  display_name: string | null;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  created_at: string;
  timezone: string | null;
  auth_user_id: string | null;
}

export class PortalAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Server-side cache for single-user setup — avoids DB hit on every request
let cachedPortalUser: PortalUser | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Returns the portal user — no auth required.
 * Single-user setup: just returns the first (only) user from the DB.
 * Cached for 60s to avoid redundant DB queries.
 */
export async function getAuthenticatedPortalUser(): Promise<PortalUser> {
  if (cachedPortalUser && Date.now() < cacheExpiry) {
    return cachedPortalUser;
  }

  const supabase = getSupabaseAdmin();

  const { data: user, error } = await supabase
    .from("users")
    .select("id, whatsapp_number, display_name, onboarding_step, onboarding_completed_at, created_at, timezone, auth_user_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !user) {
    logger.warn({ error }, "Portal: no user found in DB");
    throw new PortalAuthError(
      "No user found. Send a message on WhatsApp first to create your account.",
      404,
    );
  }

  cachedPortalUser = user as PortalUser;
  cacheExpiry = Date.now() + CACHE_TTL_MS;
  return cachedPortalUser;
}
