import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

/**
 * GET /api/memories/[id]/links — Fetch bidirectionally linked memories.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    const user = await getAuthenticatedPortalUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const { id: memoryId } = await params;
  const supabase = getSupabaseAdmin();

  // Verify the memory belongs to the current user
  const { data: ownerCheck } = await supabase
    .from("messages")
    .select("id")
    .eq("id", memoryId)
    .eq("user_id", userId)
    .single();

  if (!ownerCheck) {
    return NextResponse.json({ links: [] });
  }

  // Find all links where this memory is either source or target
  const { data: links } = await supabase
    .from("memory_links")
    .select("source_id, target_id, confidence")
    .or(`source_id.eq.${memoryId},target_id.eq.${memoryId}`);

  if (!links || links.length === 0) {
    return NextResponse.json({ links: [] });
  }

  // Collect the "other" IDs
  const linkedIds = links.map((l) =>
    (l.source_id as string) === memoryId ? (l.target_id as string) : (l.source_id as string),
  );

  // Fetch linked memories' content
  const { data: memories } = await supabase
    .from("messages")
    .select("id, content, message_type, created_at")
    .eq("user_id", userId)
    .in("id", linkedIds);

  return NextResponse.json({
    links: (memories ?? []).map((m) => ({
      id: m.id,
      content: m.content,
      message_type: m.message_type,
      created_at: m.created_at,
    })),
  });
}
