import { NextResponse } from "next/server";

/**
 * Health check endpoint.
 * Returns connectivity status for all external dependencies.
 */
export async function GET() {
  const checks: Record<string, boolean | string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    supabase: false,
    whatsapp: !!process.env.WHATSAPP_ACCESS_TOKEN,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    supermemory: !!process.env.SUPERMEMORY_API_KEY,
  };

  // Check Supabase connectivity
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("users").select("id").limit(1);
    checks.supabase = !error;
  } catch {
    checks.supabase = false;
  }

  const allHealthy = Object.values(checks).every(
    (v) => v === true || typeof v === "string",
  );

  return NextResponse.json(checks, { status: allHealthy ? 200 : 503 });
}
