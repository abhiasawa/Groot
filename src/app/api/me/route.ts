import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/me — Returns the current user.
 * Picks the user with the most recent message activity (skips test/stale users).
 * Will be replaced with proper Supabase Auth when wired.
 */
export async function GET() {
  const supabase = getSupabaseAdmin();

  // Find the user who most recently sent a message (the active user)
  const { data: recentMessage } = await supabase
    .from("messages")
    .select("user_id")
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (recentMessage) {
    const { data: user } = await supabase
      .from("users")
      .select("id, whatsapp_number, display_name, onboarding_step, onboarding_completed_at, created_at")
      .eq("id", recentMessage.user_id)
      .single();

    if (user) {
      return NextResponse.json({ user });
    }
  }

  // Fallback: return most recently created user
  const { data: user } = await supabase
    .from("users")
    .select("id, whatsapp_number, display_name, onboarding_step, onboarding_completed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
