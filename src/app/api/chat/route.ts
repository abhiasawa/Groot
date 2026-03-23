import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { buildContext } from "@/lib/ai/context-builder";
import { getGrootSystemPrompt } from "@/lib/ai/persona";
import { extractMetadataBlock } from "@/lib/ai/metadata-parser";
import { storeOutboundMessage } from "@/lib/memory/short-term";
import { addMemory } from "@/lib/memory/supermemory-client";
import { upsertProfileFacts } from "@/lib/memory/profile-builder";
import { executeTaskActions } from "@/lib/tasks/actions";
import { logger } from "@/lib/logger";
import type { ProfileFact } from "@/lib/memory/profile-builder";

export const maxDuration = 60;

const CATEGORY_MAP: Record<string, ProfileFact["category"]> = {
  static: "static",
  dynamic: "dynamic",
  preference: "preference",
  goal: "goal",
  health: "dynamic",
  habit: "dynamic",
  activity: "dynamic",
  fitness: "dynamic",
  work: "static",
  career: "static",
  education: "static",
  relationships: "static",
  relationship: "static",
  personal: "static",
  hobby: "static",
  food: "preference",
  lifestyle: "preference",
};

function normalizeProfileCategory(raw: string): ProfileFact["category"] {
  return CATEGORY_MAP[raw.toLowerCase()] ?? "dynamic";
}

function normalizeProfileKey(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export async function POST(request: NextRequest) {
  // 1. Auth
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

  // 2. Read the user message
  const body = await request.json();
  const userMessage: string = body.message?.trim();
  if (!userMessage) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const messageId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 3. Store inbound message (so buildContext picks it up)
  await supabase.from("messages").insert({
    user_id: userId,
    direction: "inbound",
    message_type: "text",
    content: userMessage,
    platform_message_id: messageId,
    platform: "web",
    metadata: {},
  });

  // 4. Build context + system prompt
  const context = await buildContext(userId, userMessage, displayName);
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const systemPrompt = getGrootSystemPrompt(
    context.userName,
    context.profileSummary,
    currentDate,
    false,
  );

  // Merge system messages from context into a single system prompt
  const contextSystemMessages = context.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .filter(Boolean);

  const fullSystemPrompt = contextSystemMessages.length > 0
    ? [systemPrompt, ...contextSystemMessages].join("\n\n")
    : systemPrompt;

  // Convert context messages to AI SDK format (exclude system messages)
  const chatMessages = context.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const model = process.env.ANTHROPIC_CHAT_MODEL ?? "claude-sonnet-4-5-20250514";

  // 5. Stream with AI SDK
  const result = streamText({
    model: anthropic(model),
    system: fullSystemPrompt,
    messages: chatMessages,
    maxOutputTokens: 1024,
    temperature: 0.7,
    onFinish: async ({ text }) => {
      // 6. Post-processing: extract metadata, store response, update profile
      try {
        const parsed = extractMetadataBlock(text);
        const cleanText = parsed?.cleanText ?? text;
        const metadata = parsed?.metadata;

        // Store outbound message
        await storeOutboundMessage(userId, cleanText, {
          mood: metadata?.detectedMood,
          source: "web_chat",
        });

        // Enrich inbound message with metadata
        if (metadata) {
          await supabase
            .from("messages")
            .update({
              card_category: metadata.cardCategory ?? null,
              metadata: {
                memoryTags: metadata.memoryTags?.length ? metadata.memoryTags : ["daily-life"],
                detectedMood: metadata.detectedMood ?? null,
                shouldStoreMemory: metadata.shouldStoreMemory,
              },
            })
            .eq("user_id", userId)
            .eq("platform_message_id", messageId);
        }

        // Profile updates
        const profileUpdates: ProfileFact[] = (metadata?.profileUpdates ?? []).map((u) => ({
          category: normalizeProfileCategory(u.category),
          key: normalizeProfileKey(u.key),
          value: u.value,
          confidence: 0.8,
          source: "ai_extraction",
        }));
        if (profileUpdates.length > 0) {
          await upsertProfileFacts(userId, profileUpdates).catch((err) => {
            logger.warn({ error: err, userId }, "Chat profile upsert failed");
          });
        }

        // People extraction
        const detectedPeople = metadata?.detectedPeople ?? [];
        if (detectedPeople.length > 0) {
          const peopleFacts: ProfileFact[] = detectedPeople.map((person) => ({
            category: "people" as const,
            key: person.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
            value: JSON.stringify({
              name: person.name,
              relationship: person.relationship ?? null,
              context: person.context ?? null,
            }),
            confidence: 0.8,
            source: "ai_extraction",
          }));
          await upsertProfileFacts(userId, peopleFacts).catch((err) => {
            logger.warn({ error: err, userId }, "Chat people upsert failed");
          });
        }

        // Long-term memory
        if (metadata?.shouldStoreMemory) {
          const tags = metadata.memoryTags?.length ? metadata.memoryTags : ["daily-life"];
          await addMemory(userMessage, userId, tags).catch((err) => {
            logger.warn({ error: err, userId }, "Chat memory store failed");
          });
        }

        // Tasks
        if (metadata?.detectedTasks?.length) {
          for (const task of metadata.detectedTasks.slice(0, 5)) {
            if (!task.content?.trim()) continue;
            let dueDate: string | null = null;
            if (task.dueDate) {
              const d = new Date(task.dueDate);
              if (!Number.isNaN(d.getTime())) dueDate = d.toISOString();
            }
            await supabase.from("tasks").insert({
              user_id: userId,
              content: task.content.trim(),
              category: task.category ?? null,
              due_date: dueDate,
              is_completed: false,
            });
          }
        }

        // Task actions (complete/delete via chat)
        const taskActions = metadata?.taskActions ?? [];
        if (taskActions.length > 0) {
          await executeTaskActions(userId, taskActions).catch((err) => {
            logger.warn({ error: err, userId }, "Chat task actions failed");
          });
        }

        logger.info(
          {
            userId,
            mood: metadata?.detectedMood,
            profileUpdates: profileUpdates.length,
            tasks: metadata?.detectedTasks?.length ?? 0,
            taskActions: taskActions.length,
            storyworthy: metadata?.shouldStoreMemory ?? false,
          },
          "Chat post-processing complete",
        );
      } catch (error) {
        logger.error({ error, userId }, "Chat post-processing failed");
      }
    },
  });

  return result.toTextStreamResponse();
}
