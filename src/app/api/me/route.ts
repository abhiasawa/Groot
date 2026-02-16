import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/me — Returns the current user.
 * For now, returns the first (owner) user since auth isn't implemented yet.
 */
export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data: user } = await supabase
    .from("users")
    .select("id, whatsapp_number, display_name, onboarding_step, onboarding_completed_at, created_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
