/**
 * Seed script: tags existing inbound messages with memoryTags + detectedMood
 * so the Topics page has data to display.
 *
 * Usage: node scripts/seed-topics.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Realistic topic/mood combos to assign
const TAG_POOL = [
  { tags: ["fitness", "health"], mood: "motivated" },
  { tags: ["work", "career"], mood: "stressed" },
  { tags: ["family"], mood: "grateful" },
  { tags: ["travel", "adventure"], mood: "excited" },
  { tags: ["food", "cooking"], mood: "happy" },
  { tags: ["relationships"], mood: "calm" },
  { tags: ["finance", "savings"], mood: "anxious" },
  { tags: ["hobbies", "music"], mood: "happy" },
  { tags: ["self-improvement"], mood: "motivated" },
  { tags: ["work", "meetings"], mood: "tired" },
  { tags: ["friends", "social"], mood: "excited" },
  { tags: ["health", "sleep"], mood: "tired" },
  { tags: ["goals", "productivity"], mood: "motivated" },
  { tags: ["entertainment", "movies"], mood: "happy" },
  { tags: ["spirituality", "mindfulness"], mood: "calm" },
  { tags: ["learning", "reading"], mood: "calm" },
  { tags: ["family", "parents"], mood: "grateful" },
  { tags: ["fitness", "running"], mood: "great" },
  { tags: ["work", "deadlines"], mood: "stressed" },
  { tags: ["relationships", "dating"], mood: "nervous" },
];

async function main() {
  // Fetch inbound messages that have no metadata or empty metadata
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, content, metadata")
    .eq("direction", "inbound")
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Failed to fetch messages:", error.message);
    process.exit(1);
  }

  if (!messages || messages.length === 0) {
    console.log("No inbound messages found to tag.");
    return;
  }

  console.log(`Found ${messages.length} inbound messages. Tagging...`);

  let updated = 0;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const combo = TAG_POOL[i % TAG_POOL.length];

    const { error: updateError } = await supabase
      .from("messages")
      .update({
        metadata: {
          memoryTags: combo.tags,
          detectedMood: combo.mood,
        },
      })
      .eq("id", msg.id);

    if (updateError) {
      console.error(`  Failed to update ${msg.id}:`, updateError.message);
    } else {
      updated++;
    }
  }

  console.log(`Done! Tagged ${updated}/${messages.length} messages.`);
  console.log("Refresh your Topics page to see the data.");
}

main();
