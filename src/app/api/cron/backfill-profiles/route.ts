import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getLLMProvider } from "@/lib/providers/llm";
import { upsertProfileFacts } from "@/lib/memory/profile-builder";
import { logger } from "@/lib/logger";
import type { ProfileFact } from "@/lib/memory/profile-builder";

const BATCH_SIZE = 10;

/**
 * High-quality extraction prompt.
 * Sends ALL messages in a batch as context so the LLM can cross-reference
 * and build a coherent profile instead of extracting from isolated messages.
 */
const EXTRACTION_PROMPT = `You are a world-class personal data extraction engine. Your job is to build a structured user profile from their WhatsApp messages.

You will receive a batch of messages from ONE user. Read ALL of them together to build a comprehensive, accurate picture.

## Extraction Rules

### Profile Facts
Extract personal facts using CANONICAL keys. Each fact must have:
- category: "static" | "dynamic" | "preference" | "goal"
- key: snake_case canonical key (see list below)
- value: clean, normalized value

CANONICAL KEYS — always use these exact keys:
- Static: name, age, birthday, gender, location, city, country, occupation, company, role, industry, education, university, degree, relationship_status, work_style, nationality, language
- Family: wife_name, husband_name, partner_name, child_count, child_1_name, child_2_name, mother_name, father_name, brother_name, sister_name
- Dynamic: weight, height, current_project, current_mood, sleep_hours
- Preference: diet, cuisine_preference, music_preference, workout_time, communication_style, favorite_sport, favorite_team
- Goal: fitness_goal, learning_goal, career_goal, health_goal
- Other static: pet_type, pet_name, vehicle, hobby_1, hobby_2, hobby_3, interest_1, interest_2

QUALITY RULES:
- Use the SAME key every time (always "weight", never "current_weight" or "weight_today")
- Values should be clean and concise ("82 kg" not "about 82 kilograms I think")
- Extract from indirect mentions too: "Sonal and I went to dinner" → wife_name or partner_name if relationship is known
- DO NOT extract vague or speculative data. Only facts clearly stated or strongly implied
- DO NOT create facts from greetings, small talk, or meta-conversation about the bot itself
- If the user is talking TO the bot about the bot's features, that's NOT a profile fact

### People
Extract real people the user personally knows. Each person must have:
- name: Their actual name (not "my friend" or "someone")
- relationship: specific (wife, husband, colleague, boss, friend, sister, brother, mother, father, etc.)
- context: ONE sentence about how they came up

QUALITY RULES:
- Only extract NAMED people (skip "my friend told me..." with no name)
- Skip public figures, celebrities, politicians unless the user knows them personally
- Skip hypothetical people or examples

### Tasks
Extract explicit action items the user states they need to do. Each task must have:
- content: Clear, actionable task description
- category: work | personal | health | finance | learning | errands | social
- dueDate: ISO 8601 date or null

QUALITY RULES:
- Only extract things the user EXPLICITLY says they need/want/plan to do
- DO NOT extract vague intentions ("I should probably exercise more" is NOT a task)
- DO NOT extract completed actions ("I finished the report" is NOT a task)
- DO NOT extract things the bot suggested to the user
- The task must be actionable and specific

## Output Format
Return ONLY valid JSON:
{
  "profileUpdates": [{"category": "static", "key": "name", "value": "John"}],
  "detectedPeople": [{"name": "Sonal", "relationship": "wife", "context": "went shopping together"}],
  "detectedTasks": [{"content": "Submit tax returns", "category": "finance", "dueDate": null}]
}

If nothing meaningful to extract: {"profileUpdates": [], "detectedPeople": [], "detectedTasks": []}

CRITICAL: Quality over quantity. Only extract what is clearly true. Empty arrays are better than garbage data.`;

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
 *
 * Query params:
 *   reset=true — Clear all existing profile data and tasks, then re-extract from scratch
 *
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

  const resetMode = request.nextUrl.searchParams.get("reset") === "true";
  const supabase = getSupabaseAdmin();

  // Reset mode: clear all extracted data and re-process everything
  if (resetMode) {
    logger.info("Backfill profiles: RESET mode — clearing all existing data");

    // Clear profile facts
    const { error: profileError } = await supabase
      .from("user_profile")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all

    if (profileError) {
      logger.error({ error: profileError }, "Failed to clear user_profile");
    }

    // Clear tasks created by backfill
    const { error: taskError } = await supabase
      .from("tasks")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all

    if (taskError) {
      logger.error({ error: taskError }, "Failed to clear tasks");
    }

    // Clear profileExtracted flags from all messages
    // We need to update metadata to remove profileExtracted
    const { data: flaggedMessages } = await supabase
      .from("messages")
      .select("id, metadata")
      .eq("direction", "inbound")
      .not("metadata", "is", null)
      .limit(500);

    if (flaggedMessages) {
      for (const msg of flaggedMessages) {
        const meta = msg.metadata as Record<string, unknown> | null;
        if (meta?.profileExtracted) {
          const { profileExtracted: _, ...cleanMeta } = meta;
          await supabase
            .from("messages")
            .update({ metadata: cleanMeta })
            .eq("id", msg.id);
        }
      }
    }

    logger.info("Backfill profiles: RESET complete — all data cleared");
    return NextResponse.json({
      message: "Reset complete. All profile data, tasks, and extraction flags cleared. Call again without ?reset=true to re-extract.",
    });
  }

  // Fetch inbound messages that haven't been profile-extracted yet
  const { data: allMessages, error: fetchError } = await supabase
    .from("messages")
    .select("id, user_id, content, media_description, metadata, created_at")
    .eq("direction", "inbound")
    .order("created_at", { ascending: true }) // oldest first for better context building
    .limit(300);

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
  });

  if (needsExtraction.length === 0) {
    return NextResponse.json({ processed: 0, message: "All messages already processed" });
  }

  // Group by user and process in batches
  const userMessages = new Map<string, typeof needsExtraction>();
  for (const msg of needsExtraction) {
    const userId = msg.user_id as string;
    if (!userMessages.has(userId)) userMessages.set(userId, []);
    userMessages.get(userId)!.push(msg);
  }

  const llm = getLLMProvider();
  let processed = 0;
  let failed = 0;
  let profileFacts = 0;
  let peopleFound = 0;
  let tasksFound = 0;

  for (const [userId, messages] of userMessages) {
    // Take a batch of messages and send them all together for context
    const batch = messages.slice(0, BATCH_SIZE);

    // Combine messages into a single context block
    const messagesText = batch.map((msg, i) => {
      const content = (msg.content as string) || (msg.media_description as string) || "";
      const date = (msg.created_at as string).split("T")[0];
      return `[Message ${i + 1}, ${date}]: ${content.substring(0, 500)}`;
    }).join("\n\n");

    try {
      const response = await llm.generateResponse(EXTRACTION_PROMPT, [
        { role: "user", content: messagesText },
      ], { maxTokens: 800, temperature: 0 });

      // Parse JSON from response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ userId, batchSize: batch.length }, "Backfill: no JSON in LLM response");
        failed += batch.length;
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        profileUpdates?: Array<{ category: string; key: string; value: string }>;
        detectedPeople?: Array<{ name: string; relationship?: string; context?: string }>;
        detectedTasks?: Array<{ content: string; category?: string; dueDate?: string | null }>;
      };

      // Upsert profile facts
      const facts: ProfileFact[] = (parsed.profileUpdates ?? [])
        .filter((u) => u.key && u.value && u.value.trim().length > 0)
        .map((u) => ({
          category: normalizeCategory(u.category),
          key: normalizeKey(u.key),
          value: u.value.trim(),
          confidence: 0.85,
          source: "backfill_v2",
        }));

      if (facts.length > 0) {
        await upsertProfileFacts(userId, facts);
        profileFacts += facts.length;
      }

      // Upsert detected people
      const people = (parsed.detectedPeople ?? [])
        .filter((p) => p.name && p.name.trim().length > 0);

      if (people.length > 0) {
        const peopleFacts: ProfileFact[] = people.map((person) => ({
          category: "people" as const,
          key: person.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
          value: JSON.stringify({
            name: person.name,
            relationship: person.relationship ?? null,
            context: person.context ?? null,
          }),
          confidence: 0.85,
          source: "backfill_v2",
        }));
        await upsertProfileFacts(userId, peopleFacts);
        peopleFound += people.length;
      }

      // Insert detected tasks (skip duplicates)
      const tasks = (parsed.detectedTasks ?? [])
        .filter((t) => t.content && t.content.trim().length > 3);

      for (const task of tasks) {
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

      // Mark all messages in the batch as profile-extracted
      for (const msg of batch) {
        const existingMetadata = (msg.metadata as Record<string, unknown>) ?? {};
        await supabase
          .from("messages")
          .update({ metadata: { ...existingMetadata, profileExtracted: true } })
          .eq("id", msg.id);
      }

      processed += batch.length;
    } catch (error) {
      logger.error({ error, userId, batchSize: batch.length }, "Backfill: failed to process batch");
      failed += batch.length;
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
    remaining: needsExtraction.length - processed - failed,
    message: `Extracted from ${processed} messages: ${profileFacts} profile facts, ${peopleFound} people, ${tasksFound} tasks.${needsExtraction.length > processed + failed ? " Call again to process more." : " All done."}`,
  });
}
