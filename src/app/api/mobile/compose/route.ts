import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { generateGrootResponse, getErrorResponse } from "@/lib/ai/groot-engine";
import { processMediaFromBuffer } from "@/lib/media/media-handler";
import { uploadMediaToStorage } from "@/lib/media/storage";
import { storeOutboundMessage } from "@/lib/memory/short-term";
import { addMemory } from "@/lib/memory/supermemory-client";
import { logger } from "@/lib/logger";

// Allow up to 60s for audio transcription + AI response
export const maxDuration = 60;

/**
 * POST /api/mobile/compose — Send a message to Groot from the mobile app.
 *
 * Accepts text, audio (base64), or image (base64) messages.
 * Returns Groot's AI response directly.
 */
export async function POST(request: NextRequest) {
  let userId: string;
  let displayName: string | null;
  try {
    const user = await getAuthenticatedPortalUser(request);
    userId = user.id;
    displayName = user.display_name;
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  // Per-user rate limiting: 20 requests/min (stricter than global IP limit)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 m"),
        prefix: "compose",
        analytics: false,
      });
      const { success, limit, remaining } = await ratelimit.limit(userId);
      if (!success) {
        return NextResponse.json(
          { error: "Too many messages — please slow down" },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
            },
          },
        );
      }
    } catch {
      // Rate limit failure should not block requests
    }
  }

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { message_type, content, media_base64, mime_type, caption } = body as {
      message_type: "text" | "audio" | "image";
      content?: string;
      media_base64?: string;
      mime_type?: string;
      caption?: string;
    };

    if (!message_type) {
      return NextResponse.json({ error: "message_type is required" }, { status: 400 });
    }

    // Generate a unique message ID for this mobile message
    const messageId = `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let textForGroot: string | null = null;
    let mediaStoragePath: string | null = null;
    let mediaDescription: string | null = null;

    // ── Text message ──
    if (message_type === "text") {
      if (!content || content.trim().length === 0) {
        return NextResponse.json({ error: "content is required for text messages" }, { status: 400 });
      }
      textForGroot = content.trim();
    }

    // ── Audio message ──
    if (message_type === "audio") {
      if (!media_base64 || !mime_type) {
        return NextResponse.json({ error: "media_base64 and mime_type required for audio" }, { status: 400 });
      }
      const buffer = Buffer.from(media_base64, "base64");

      // Upload to storage
      mediaStoragePath = await uploadMediaToStorage(userId, buffer, mime_type, "audio");

      // Transcribe
      const result = await processMediaFromBuffer(buffer, "audio", mime_type);
      if (result?.text) {
        textForGroot = result.text;
        mediaDescription = result.text;
      } else {
        return NextResponse.json({
          error: "Could not transcribe audio",
          reply: "I received your voice note but couldn't transcribe it. Please try again.",
        }, { status: 200 });
      }
    }

    // ── Image message ──
    // Just store the photo — no OCR/vision analysis.
    // Voice notes provide the journal text, not image content extraction.
    if (message_type === "image") {
      if (!media_base64 || !mime_type) {
        return NextResponse.json({ error: "media_base64 and mime_type required for image" }, { status: 400 });
      }
      const buffer = Buffer.from(media_base64, "base64");

      // Upload to storage
      mediaStoragePath = await uploadMediaToStorage(userId, buffer, mime_type, "image");

      textForGroot = caption || "[Photo added to journal]";
      mediaDescription = caption || null;
    }

    if (!textForGroot) {
      return NextResponse.json({ error: "No processable content" }, { status: 400 });
    }

    // ── Store inbound message ──
    await supabase.from("messages").insert({
      user_id: userId,
      direction: "inbound",
      message_type,
      content: message_type === "text" ? textForGroot : (caption || mediaDescription),
      media_url: mediaStoragePath ? `storage:${mediaStoragePath}` : null,
      media_description: mediaDescription,
      platform_message_id: messageId,
      platform: "mobile",
      metadata: {},
    });

    // ── Generate Groot response ──
    const grootResponse = await generateGrootResponse(userId, textForGroot, displayName, false);

    // ── Store outbound message ──
    await storeOutboundMessage(userId, grootResponse.text, {
      mood: grootResponse.detectedMood,
      source: `mobile_${message_type}`,
    });

    // ── Post-processing (fire-and-forget) ──
    const postOps: PromiseLike<unknown>[] = [];

    // Enrich inbound metadata + card category
    postOps.push(
      supabase
        .from("messages")
        .update({
          card_category: grootResponse.detectedCardCategory ?? null,
          metadata: {
            memoryTags: grootResponse.memoryTags.length > 0 ? grootResponse.memoryTags : ["daily-life"],
            detectedMood: grootResponse.detectedMood ?? null,
            shouldStoreMemory: grootResponse.shouldStoreMemory,
          },
        })
        .eq("user_id", userId)
        .eq("platform_message_id", messageId)
        .then(() => {}),
    );

    // Store long-term memory
    if (grootResponse.shouldStoreMemory) {
      const tags = grootResponse.memoryTags.length > 0 ? grootResponse.memoryTags : ["daily-life"];
      postOps.push(addMemory(textForGroot, userId, tags));
    }

    // Create tasks from detected tasks
    if (grootResponse.detectedTasks.length > 0) {
      for (const task of grootResponse.detectedTasks.slice(0, 5)) {
        if (!task.content?.trim()) continue;
        let dueDate: string | null = null;
        if (task.dueDate) {
          const parsed = new Date(task.dueDate);
          if (!Number.isNaN(parsed.getTime())) dueDate = parsed.toISOString();
        }
        postOps.push(
          supabase.from("tasks").insert({
            user_id: userId,
            content: task.content.trim(),
            category: task.category ?? null,
            due_date: dueDate,
            is_completed: false,
          }).then(() => {}),
        );
      }
    }

    Promise.allSettled(postOps).catch(() => {});

    return NextResponse.json({
      ok: true,
      reply: grootResponse.text,
      mood: grootResponse.detectedMood ?? null,
      tasks: grootResponse.detectedTasks.length,
    });
  } catch (error) {
    logger.error({ error, userId }, "Mobile compose failed");
    const fallback = getErrorResponse();
    return NextResponse.json({
      ok: false,
      reply: fallback,
      error: "Processing failed",
    }, { status: 200 });
  }
}
