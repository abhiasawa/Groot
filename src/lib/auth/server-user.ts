import "server-only";

import { cookies } from "next/headers";
import { verifyJWT } from "./jwt";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Get the authenticated user from cookies in a Server Component.
 * Returns null if not authenticated (caller decides how to handle).
 */
export async function getServerUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("groot-token")?.value;
  if (!token) return null;

  try {
    const { sub: userId } = await verifyJWT(token);
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("users")
      .select("id, display_name, whatsapp_number, timezone")
      .eq("id", userId)
      .single();

    return data;
  } catch {
    return null;
  }
}
