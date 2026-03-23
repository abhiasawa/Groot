import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { validateCronAuth } from "@/lib/cron/auth";
import { analyzeUser } from "@/lib/patterns/analyze";
import { logger } from "@/lib/logger";

/**
 * Daily pattern analysis cron — 01:30 UTC (07:00 IST).
 * Runs SQL-based behavioral analysis for all active users.
 * Zero LLM calls. Estimated runtime: <5s.
 */
export async function GET(request: NextRequest) {
  const authError = validateCronAuth(request);
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();

    // Get all onboarded users
    const { data: users } = await supabase
      .from("users")
      .select("id")
      .not("onboarding_completed_at", "is", null);

    if (!users || users.length === 0) {
      return NextResponse.json({ message: "No users to analyze", insights: 0 });
    }

    let totalInsights = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        const count = await analyzeUser(user.id as string);
        totalInsights += count;
      } catch (error) {
        const userId = user.id as string;
        logger.error({ error, userId }, "Failed to analyze user");
        errors.push(userId);
      }
    }

    logger.info(
      { users: users.length, insights: totalInsights, errors: errors.length },
      "Pattern analysis complete",
    );

    return NextResponse.json({
      message: "Pattern analysis complete",
      users: users.length,
      insights: totalInsights,
      errors: errors.length,
    });
  } catch (error) {
    logger.error({ error }, "Pattern analysis cron failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
