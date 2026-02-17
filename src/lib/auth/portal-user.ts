import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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

async function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new PortalAuthError(
      "Supabase auth is not configured",
      500,
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // setAll is called from Server Components where cookies can't be set.
          // This is expected — the refresh will happen in middleware or route handlers instead.
        }
      },
    },
  });
}

/**
 * Resolves the authenticated portal user to an internal Groot user.
 *
 * Linking order:
 * 1) direct link via users.auth_user_id
 * 2) one-time OWNER_* bootstrap link (OWNER_WHATSAPP_NUMBER + OWNER_EMAIL)
 */
export async function getAuthenticatedPortalUser(): Promise<PortalUser> {
  const authClient = await getSupabaseAuthClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !authUser) {
    throw new PortalAuthError("Unauthorized", 401);
  }

  const supabase = getSupabaseAdmin();
  const selectFields =
    "id, whatsapp_number, display_name, onboarding_step, onboarding_completed_at, created_at, timezone, auth_user_id";

  const { data: linkedUser, error: linkedUserError } = await supabase
    .from("users")
    .select(selectFields)
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (linkedUserError) {
    logger.error({ error: linkedUserError }, "Failed to resolve linked portal user");
    throw new PortalAuthError("Failed to resolve user", 500);
  }

  if (linkedUser) {
    return linkedUser as PortalUser;
  }

  const ownerWhatsApp = process.env.OWNER_WHATSAPP_NUMBER;
  const ownerEmail = process.env.OWNER_EMAIL;
  const authEmail = authUser.email?.toLowerCase() ?? "";

  if (!ownerWhatsApp || !ownerEmail) {
    const { data: singleUserCandidates, error: singleUserError } = await supabase
      .from("users")
      .select(selectFields)
      .order("created_at", { ascending: true })
      .limit(2);

    if (singleUserError) {
      logger.error({ error: singleUserError }, "Failed to evaluate single-user auth fallback");
      throw new PortalAuthError("Failed to resolve user", 500);
    }

    // Safe fallback for personal/single-user setups.
    if (singleUserCandidates && singleUserCandidates.length === 1) {
      const singleUser = singleUserCandidates[0] as PortalUser;
      if (!singleUser.auth_user_id || singleUser.auth_user_id === authUser.id) {
        const { data: linkedSingleUser, error: singleUserLinkError } = await supabase
          .from("users")
          .update({
            auth_user_id: authUser.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", singleUser.id)
          .select(selectFields)
          .single();

        if (singleUserLinkError || !linkedSingleUser) {
          logger.error({ error: singleUserLinkError }, "Failed to persist single-user auth link");
          throw new PortalAuthError("Failed to link account", 500);
        }

        logger.info(
          { userId: linkedSingleUser.id, authUserId: authUser.id },
          "Portal account linked via single-user fallback",
        );

        return linkedSingleUser as PortalUser;
      }
    }

    throw new PortalAuthError(
      "Your account is not linked yet. Set OWNER_WHATSAPP_NUMBER and OWNER_EMAIL for multi-user safety.",
      409,
    );
  }

  if (authEmail !== ownerEmail.toLowerCase()) {
    throw new PortalAuthError("Forbidden", 403);
  }

  const { data: ownerUser, error: ownerLookupError } = await supabase
    .from("users")
    .select(selectFields)
    .eq("whatsapp_number", ownerWhatsApp)
    .maybeSingle();

  if (ownerLookupError) {
    logger.error({ error: ownerLookupError }, "Failed to load owner WhatsApp user for linking");
    throw new PortalAuthError("Failed to link account", 500);
  }

  if (!ownerUser) {
    throw new PortalAuthError(
      "No WhatsApp user found for OWNER_WHATSAPP_NUMBER",
      404,
    );
  }

  const currentLinkedAuthUserId = ownerUser.auth_user_id as string | null;
  if (currentLinkedAuthUserId && currentLinkedAuthUserId !== authUser.id) {
    throw new PortalAuthError(
      "This WhatsApp account is already linked to another portal account",
      403,
    );
  }

  const { data: linkedOwner, error: linkError } = await supabase
    .from("users")
    .update({
      auth_user_id: authUser.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ownerUser.id)
    .select(selectFields)
    .single();

  if (linkError || !linkedOwner) {
    logger.error({ error: linkError }, "Failed to persist auth link");
    throw new PortalAuthError("Failed to link account", 500);
  }

  logger.info(
    { userId: linkedOwner.id, authUserId: authUser.id },
    "Portal account linked to WhatsApp user",
  );

  return linkedOwner as PortalUser;
}
