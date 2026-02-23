import "server-only";

import { NextRequest } from "next/server";
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

const USER_SELECT_FIELDS = "id, whatsapp_number, display_name, onboarding_step, onboarding_completed_at, created_at, timezone, auth_user_id" as const;

/**
 * Returns the portal user.
 *
 * When a `request` is provided with an `Authorization: Bearer <jwt>` header,
 * validates the JWT via Supabase Auth and looks up the app user by `auth_user_id`.
 * This path is used by the mobile app.
 *
 * When no bearer token is present (or no request is provided),
 * falls back to the single-user shortcut for the web portal.
 */
export async function getAuthenticatedPortalUser(request?: NextRequest): Promise<PortalUser> {
  // --- Bearer token path (mobile app) ---
  const authHeader = request?.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return authenticateWithToken(token);
  }

  // --- Single-user fallback (web portal) ---
  if (cachedPortalUser && Date.now() < cacheExpiry) {
    return cachedPortalUser;
  }

  const supabase = getSupabaseAdmin();

  const { data: user, error } = await supabase
    .from("users")
    .select(USER_SELECT_FIELDS)
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

/**
 * Validate a Supabase JWT and resolve the corresponding app user.
 */
async function authenticateWithToken(token: string): Promise<PortalUser> {
  const supabase = getSupabaseAdmin();

  // Validate the JWT via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    logger.warn({ error: authError }, "Bearer token validation failed");
    throw new PortalAuthError("Invalid or expired token", 401);
  }

  const authUserId = authData.user.id;

  // Look up the app user by auth_user_id
  const { data: user, error: dbError } = await supabase
    .from("users")
    .select(USER_SELECT_FIELDS)
    .eq("auth_user_id", authUserId)
    .limit(1)
    .single();

  if (dbError || !user) {
    logger.warn({ authUserId, error: dbError }, "No app user linked to auth_user_id");
    throw new PortalAuthError(
      "No app user linked to this account. Send a message on WhatsApp first to create your account.",
      404,
    );
  }

  return user as PortalUser;
}
