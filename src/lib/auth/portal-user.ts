import "server-only";

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyJWT } from "./jwt";
import { logger } from "@/lib/logger";

export interface PortalUser {
  id: string;
  whatsapp_number: string | null;
  display_name: string | null;
  email: string | null;
  google_id: string | null;
  avatar_url: string | null;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  created_at: string;
  timezone: string | null;
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

const USER_SELECT_FIELDS =
  "id, whatsapp_number, display_name, email, google_id, avatar_url, onboarding_step, onboarding_completed_at, created_at, timezone" as const;
const ALLOW_SINGLE_USER_FALLBACK = process.env.ALLOW_SINGLE_USER_FALLBACK === "true";

/**
 * Returns the authenticated portal user.
 *
 * Auth resolution order:
 * 1. Bearer token in Authorization header (mobile app — custom JWT)
 * 2. groot-token cookie (web portal — custom JWT)
 * 3. Optional single-user fallback (dev-only, behind ALLOW_SINGLE_USER_FALLBACK=true)
 */
export async function getAuthenticatedPortalUser(
  request?: NextRequest,
): Promise<PortalUser> {
  // ── Path 1: Bearer token (mobile app) ──
  const authHeader = request?.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return authenticateWithJWT(token);
  }

  // ── Path 2: Cookie (web portal) ──
  const cookieToken = request?.cookies.get("groot-token")?.value;
  if (cookieToken) {
    return authenticateWithJWT(cookieToken);
  }

  if (!ALLOW_SINGLE_USER_FALLBACK) {
    throw new PortalAuthError("Authentication required", 401);
  }

  // ── Path 3: Single-user fallback (opt-in for local/dev only) ──
  logger.debug("Portal: using single-user fallback (no JWT found)");

  if (cachedPortalUser && Date.now() < cacheExpiry) {
    return cachedPortalUser;
  }

  const supabase = getSupabaseAdmin();

  const { data: user, error } = await supabase
    .from("users")
    .select(USER_SELECT_FIELDS)
    .order("last_responded_at", { ascending: false })
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
 * Validate a custom JWT and resolve the corresponding app user.
 *
 * The JWT payload contains { sub: userId } — direct DB lookup by user ID.
 * Much simpler than the old Supabase Auth flow (no email matching, no auto-linking).
 */
async function authenticateWithJWT(token: string): Promise<PortalUser> {
  let payload: { sub: string };
  try {
    payload = await verifyJWT(token);
  } catch {
    throw new PortalAuthError("Invalid or expired token", 401);
  }

  const supabase = getSupabaseAdmin();

  const { data: user, error } = await supabase
    .from("users")
    .select(USER_SELECT_FIELDS)
    .eq("id", payload.sub)
    .single();

  if (error || !user) {
    logger.warn({ userId: payload.sub }, "JWT valid but user not found in DB");
    throw new PortalAuthError("Account not found", 404);
  }

  return user as PortalUser;
}
