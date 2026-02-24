import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getLLMProvider } from "@/lib/providers/llm";
import { upsertProfileFacts } from "@/lib/memory/profile-builder";
import { logger } from "@/lib/logger";
import type { ProfileFact } from "@/lib/memory/profile-builder";

const BATCH_SIZE = 15;

const EXTRACTION_PROMPT = `You are a profile and data extraction engine. Given a user's message from a WhatsApp conversation, extract ALL of the following:

1. **profileUpdates**: Personal facts about the user. Categories: "static" (name, age, location, occupation, family), "dynamic" (weight, mood, current project), "preference" (food, music, diet), "goal" (fitness, learning, career goals).

2. **detectedPeople**: People the user mentions by name. Include relationship and context.

3. **detectedTasks**: Any tasks, todos, or action items the user mentions they need to do.

Rules:
- Extract EVERY personal fact, even if mentioned casually
- For people: include name, relationship (wife, friend, colleague, etc.), and brief context
- For tasks: include the task content, category (work, personal, health, finance, learning, errands, social), and due date if mentioned
- Be aggressive about extraction — if in doubt, extract it
- Return ONLY valid JSON, no other text

JSON format:
{
  "profileUpdates": [{"category": "static", "key": "name", "value": "John"}],
  "detectedPeople": [{"name": "Sonal", "relationship": "wife", "context": "went shopping"}],
  "detectedTasks": [{"content": "Finish the report", "category": "work", "dueDate": null}]
}

If nothing to extract, return: {"profileUpdates": [], "detectedPeople": [], "detectedTasks": []}`;

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

function normalizeCategory(raw: string): ProfileFact["category"] {
  return CATEGORY_MAP[raw.toLowerCase()] ?? "dynamic";
}

function normalizeKey(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/**
 * POST /api/cron/backfill-profiles — Extract profile facts, people, and tasks from existing messages.
 * Protected by CRON_SECRET Bearer token.
 * Processes in batches. Call repeatedly until done.
 */
export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch inbound messages that haven't been profile-extracted yet
  // We use a metadata flag "profileExtracted" to track which messages have been processed
  const { data: allMessages, error: fetchError } = await supabase
    .from("messages")
    .select("id, user_id, content, media_description, metadata")
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(200);

  if (fetchError) {
    logger.error({ error: fetchError }, "Failed to fetch messages for profile backfill");
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }

  if (!allMessages || allMessages.length === 0) {
    return NextResponse.json({ processed: 0, message: "No messages found" });
  }

  // Filter to messages that have content and haven't been profile-extracted
  const needsExtraction = allMessages.filter((msg) => {
    const content = (msg.content as string) || (msg.media_description as string);
    if (!content || content.trim().length < 5) return false;
    const metadata = msg.metadata as Record<string, unknown> | null;
    if (metadata?.profileExtracted) return false;
    return true;
  }).slice(0, BATCH_SIZE);

  if (needsExtraction.length === 0) {
    return NextResponse.json({ processed: 0, message: "All messages already processed" });
  }

  const llm = getLLMProvider();
  let processed = 0;
  let failed = 0;
  let profileFacts = 0;
  let peopleFound = 0;
  let tasksFound = 0;

  for (const msg of needsExtraction) {
    const content = (msg.content as string) || (msg.media_description as string) || "";
    const userId = msg.user_id as string;

    try {
      const response = await llm.generateResponse(EXTRACTION_PROMPT, [
        { role: "user", content: content.substring(0, 1000) },
      ], { maxTokens: 300, temperature: 0 });

      // Parse JSON from response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ messageId: msg.id }, "Backfill profiles: no JSON in LLM response");
        failed++;
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        profileUpdates?: Array<{ category: string; key: string; value: string }>;
        detectedPeople?: Array<{ name: string; relationship?: string; context?: string }>;
        detectedTasks?: Array<{ content: string; category?: string; dueDate?: string | null }>;
      };

      // Upsert profile facts
      const facts: ProfileFact[] = (parsed.profileUpdates ?? []).map((u) => ({
        category: normalizeCategory(u.category),
        key: normalizeKey(u.key),
        value: u.value,
        confidence: 0.7,
        source: "backfill_extraction",
      }));

      if (facts.length > 0) {
        await upsertProfileFacts(userId, facts);
        profileFacts += facts.length;
      }

      // Upsert detected people
      const people = parsed.detectedPeople ?? [];
      if (people.length > 0) {
        const peopleFacts: ProfileFact[] = people.map((person) => ({
          category: "people" as const,
          key: person.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
          value: JSON.stringify({
            name: person.name,
            relationship: person.relationship ?? null,
            context: person.context ?? null,
          }),
          confidence: 0.7,
          source: "backfill_extraction",
        }));
        await upsertProfileFacts(userId, peopleFacts);
        peopleFound += people.length;
      }

      // Insert detected tasks (skip duplicates)
      const tasks = parsed.detectedTasks ?? [];
      for (const task of tasks) {
        if (!task.content || task.content.trim().length === 0) continue;

        const taskContent = task.content.trim();

        // Check for existing duplicate
        const { data: existing } = await supabase
          .from("tasks")
          .select("id")
          .eq("user_id", userId)
          .eq("content", taskContent)
          .limit(1);

        if (existing && existing.length > 0) continue;

        let dueDate: string | null = null;
        if (task.dueDate) {
          const d = new Date(task.dueDate);
          if (!Number.isNaN(d.getTime())) dueDate = d.toISOString();
        }

        await supabase.from("tasks").insert({
          user_id: userId,
          content: taskContent,
          category: task.category ?? null,
          due_date: dueDate,
          is_completed: false,
        });
        tasksFound++;
      }

      // Mark message as profile-extracted
      const existingMetadata = (msg.metadata as Record<string, unknown>) ?? {};
      await supabase
        .from("messages")
        .update({ metadata: { ...existingMetadata, profileExtracted: true } })
        .eq("id", msg.id);

      processed++;
    } catch (error) {
      logger.error({ error, messageId: msg.id }, "Backfill profiles: failed to process message");
      failed++;
    }
  }

  logger.info(
    { processed, failed, profileFacts, peopleFound, tasksFound },
    "Profile backfill batch complete",
  );

  return NextResponse.json({
    processed,
    failed,
    profileFacts,
    peopleFound,
    tasksFound,
    message: `Extracted from ${processed} messages: ${profileFacts} profile facts, ${peopleFound} people, ${tasksFound} tasks. Call again to process more.`,
  });
}
