/**
 * Seed script: Insert a month's worth of realistic dummy data
 * for testing all Garden features.
 *
 * Run: npx tsx scripts/seed-dummy-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. Run with:");
  console.error("  npx dotenv-cli -e .env.local -- npx tsx scripts/seed-dummy-data.ts");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const WHATSAPP = "919167900916";

// Helpers
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function dateStr(d: Date): string {
  return d.toISOString().split("T")[0]!;
}
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function main() {
  console.log("Connecting to Supabase...");

  // 1. Get or create user
  const { data: existingUsers } = await supabase
    .from("users")
    .select("id, display_name")
    .eq("whatsapp_number", WHATSAPP);

  let userId: string;
  if (existingUsers && existingUsers.length > 0) {
    userId = existingUsers[0]!.id;
    console.log(`Found existing user: ${userId} (${existingUsers[0]!.display_name})`);
  } else {
    userId = randomUUID();
    await supabase.from("users").insert({
      id: userId,
      whatsapp_number: WHATSAPP,
      display_name: "Abhishek",
      timezone: "Asia/Kolkata",
      onboarding_step: 0,
      onboarding_completed_at: daysAgo(30).toISOString(),
    });
    console.log(`Created user: ${userId}`);
  }

  // 2. User Profile facts
  console.log("Inserting profile facts...");
  const profileFacts = [
    { category: "static", key: "name", value: "Abhishek" },
    { category: "static", key: "location", value: "Mumbai, India" },
    { category: "static", key: "occupation", value: "Software Engineer" },
    { category: "static", key: "relationship_mom", value: "Mom — lives nearby, close relationship" },
    { category: "static", key: "relationship_rohan", value: "Rohan — best friend from college, works at Google" },
    { category: "static", key: "relationship_priya", value: "Priya — girlfriend, graphic designer" },
    { category: "static", key: "relationship_amit", value: "Amit — colleague at work, engineering lead" },
    { category: "dynamic", key: "current_project", value: "Building an AI companion app called Groot" },
    { category: "dynamic", key: "reading", value: "Atomic Habits by James Clear" },
    { category: "dynamic", key: "fitness_routine", value: "Going to the gym 4x per week, focusing on strength training" },
    { category: "dynamic", key: "learning", value: "Learning Rust in spare time" },
    { category: "dynamic", key: "recent_interest", value: "Exploring second brain and PKM systems" },
    { category: "preference", key: "favorite_food", value: "Biryani" },
    { category: "preference", key: "coffee", value: "Black coffee, no sugar" },
    { category: "preference", key: "music", value: "Listens to lo-fi while coding, Bollywood otherwise" },
    { category: "preference", key: "communication_style", value: "Prefers concise messages, dislikes long paragraphs" },
    { category: "preference", key: "work_hours", value: "Most productive between 10 AM - 2 PM" },
    { category: "goal", key: "fitness_goal", value: "Run a half-marathon by June 2026" },
    { category: "goal", key: "career_goal", value: "Launch Groot publicly by March 2026" },
    { category: "goal", key: "reading_goal", value: "Read 24 books in 2026" },
    { category: "goal", key: "weight_goal", value: "Reach 75 kg (currently 82 kg)" },
  ];

  for (const fact of profileFacts) {
    await supabase.from("user_profile").upsert(
      {
        user_id: userId,
        category: fact.category,
        key: fact.key,
        value: fact.value,
        confidence: 0.8 + Math.random() * 0.2,
        source: "conversation",
        last_mentioned_at: daysAgo(Math.floor(Math.random() * 14)).toISOString(),
      },
      { onConflict: "user_id,category,key" }
    );
  }
  console.log(`  ${profileFacts.length} profile facts inserted`);

  // 3. Contacts
  console.log("Inserting contacts...");
  const contacts = [
    { name: "Rohan", whatsapp_number: "919876543210" },
    { name: "Priya", whatsapp_number: "919876543211" },
    { name: "Mom", whatsapp_number: "919876543212" },
    { name: "Amit", whatsapp_number: "919876543213" },
  ];
  for (const c of contacts) {
    await supabase.from("contacts").upsert(
      { owner_user_id: userId, name: c.name, whatsapp_number: c.whatsapp_number, is_approved: true },
      { onConflict: "owner_user_id,whatsapp_number" }
    );
  }
  console.log(`  ${contacts.length} contacts inserted`);

  // 4. Messages (30 days of conversations — inbound + outbound with moods)
  console.log("Inserting messages...");
  const moods = ["happy", "good", "calm", "motivated", "okay", "neutral", "tired", "stressed", "excited", "grateful"];
  const moodScoreMap: Record<string, number> = {
    happy: 5, excited: 5, good: 4, calm: 4, motivated: 4, grateful: 4,
    okay: 3, neutral: 3, tired: 2, stressed: 2,
  };
  const inboundMessages = [
    "Hey Groot, just woke up. Feeling pretty good today!",
    "Had a great workout at the gym. Hit a new PR on bench press — 80 kg!",
    "Feeling a bit stressed about the launch deadline.",
    "Just finished reading chapter 5 of Atomic Habits. The concept of habit stacking is really cool.",
    "Priya and I went to that new Italian restaurant. The pasta was amazing but nothing beats biryani lol",
    "Had a 1:1 with Amit today. He thinks we should refactor the auth module.",
    "Mom called, she wants me to come for dinner this Sunday. Need to remember that.",
    "Can you remind me to call the dentist tomorrow at 10 AM?",
    "Track my water intake — I want to drink 3 liters a day",
    "I ran 5 km today! Slowly building up for the half marathon.",
    "Feeling tired today, didn't sleep well. Had weird dreams.",
    "Finally fixed that bug in the webhook handler. Took me 3 hours.",
    "Rohan sent me a link to a Rust conference happening in Bangalore. Should I go?",
    "I need to buy groceries — milk, eggs, bread, bananas, and coffee beans.",
    "Just had a really productive morning. Knocked out 4 tasks before lunch.",
    "Feeling grateful today. Priya surprised me with my favorite cake.",
    "Weight check: 80.5 kg this morning. Slow progress but getting there.",
    "Had a team standup. Sprint is on track for once!",
    "Listened to a great podcast about AI agents. Made me think about Groot's architecture.",
    "Going to try meditating before bed tonight. Downloaded the Headspace app.",
    "Cooked dinner for the first time this week — made dal and rice. Turned out decent!",
    "Feeling motivated after watching a talk by Andrej Karpathy.",
    "Need to prepare slides for Friday's presentation.",
    "Just finished my 3rd book of the year — Deep Work by Cal Newport. Highly recommend.",
    "Had coffee with Rohan after ages. Good catching up.",
    "Stressed about money this month. Need to budget better.",
    "Morning run done — 4 km in 28 minutes. Getting faster!",
    "Priya's birthday is coming up next week. Need to plan something special.",
    "Late night coding session. The new mood tracking feature is working!",
    "Just had the best biryani at Cafe Noorani. Absolute 10/10.",
  ];

  const outboundResponses = [
    "Good morning! Sounds like a great start to the day. What's on your agenda?",
    "That's awesome — 80 kg PR! Your consistency at the gym is really paying off.",
    "Launch deadlines can be intense. Want to talk through what's on your plate?",
    "Habit stacking is one of the best ideas in that book. How are you thinking of applying it?",
    "Haha biryani supremacy! Glad you two had a nice time out.",
    "Sounds like a productive 1:1. Refactoring auth could pay off long-term.",
    "Got it — Sunday dinner at Mom's. I'll make a note.",
    "Done! I'll remind you tomorrow at 10 AM to call the dentist.",
    "I'll track your water intake daily. Target: 3 liters. Let me know each time you drink!",
    "5 km! You're making real progress toward that half-marathon goal.",
    "Bad sleep nights happen. Be gentle with yourself today. Maybe skip the heavy workout?",
    "3 hours well spent — debugging is a skill. The webhook handler is solid now.",
    "A Rust conference could be great for networking. When is it?",
    "Added to your tasks: groceries — milk, eggs, bread, bananas, coffee beans.",
    "4 tasks before lunch is impressive. You're in a flow state!",
    "That's so sweet of Priya. Moments like these are worth remembering.",
    "80.5 kg — down from 82! That's 1.5 kg progress. Keep going!",
    "A sprint on track — that deserves celebration. How's the team energy?",
    "AI agents are fascinating. What ideas did the podcast spark for Groot?",
    "Meditation before bed is a great call. Even 5 minutes can improve sleep quality.",
    "Cooking your own meals is a win. Dal and rice is comfort food perfection.",
    "Karpathy is inspiring. What resonated most from the talk?",
    "Friday presentation — I've added that to your tasks. Want to brainstorm talking points?",
    "3 books already! Deep Work is excellent. You're ahead of your reading goal pace.",
    "Quality time with old friends is so important. How's Rohan doing at Google?",
    "Budgeting stress is real. Want me to help you track expenses this month?",
    "28 minutes for 4 km — that's a 7 min/km pace. You'll crush the half-marathon!",
    "Priya's birthday! I'll help you brainstorm ideas. What does she love?",
    "Late night hustle! The mood tracking feature sounds great. Get some sleep though!",
    "Cafe Noorani biryani is legendary. Glad you enjoyed it!",
  ];

  const messageRows: Array<Record<string, unknown>> = [];
  for (let day = 30; day >= 0; day--) {
    const numMessages = 2 + Math.floor(Math.random() * 4); // 2-5 messages per day
    for (let j = 0; j < numMessages; j++) {
      const baseDate = daysAgo(day);
      const hour = 8 + Math.floor(Math.random() * 14); // 8 AM - 10 PM
      const minute = Math.floor(Math.random() * 60);
      baseDate.setHours(hour, minute, 0, 0);

      const msgIdx = Math.floor(Math.random() * inboundMessages.length);
      const mood = randomFrom(moods);

      // Inbound (user message)
      messageRows.push({
        id: randomUUID(),
        user_id: userId,
        direction: "inbound",
        message_type: randomFrom(["text", "text", "text", "text", "audio"]), // mostly text
        content: inboundMessages[msgIdx],
        metadata: {},
        created_at: baseDate.toISOString(),
      });

      // Outbound (Groot response with mood)
      const responseDate = new Date(baseDate.getTime() + 5000); // 5 seconds later
      messageRows.push({
        id: randomUUID(),
        user_id: userId,
        direction: "outbound",
        message_type: "text",
        content: outboundResponses[msgIdx],
        metadata: { detectedMood: mood, moodScore: moodScoreMap[mood] ?? 3 },
        created_at: responseDate.toISOString(),
      });
    }
  }

  // Batch insert messages in chunks
  const chunkSize = 50;
  for (let i = 0; i < messageRows.length; i += chunkSize) {
    const chunk = messageRows.slice(i, i + chunkSize);
    const { error } = await supabase.from("messages").insert(chunk);
    if (error) console.error("  Message insert error:", error.message);
  }
  console.log(`  ${messageRows.length} messages inserted (${Math.ceil(messageRows.length / 2)} conversations)`);

  // 5. Habits + Checkins + Streaks
  console.log("Inserting habits...");
  const habitsData = [
    { name: "Morning Run", category: "fitness", target_value: 5, target_unit: "km", frequency: "daily" },
    { name: "Read", category: "learning", target_value: 30, target_unit: "pages", frequency: "daily" },
    { name: "Drink Water", category: "health", target_value: 3, target_unit: "liters", frequency: "daily" },
    { name: "Meditate", category: "wellness", target_value: 10, target_unit: "minutes", frequency: "daily" },
    { name: "Gym", category: "fitness", target_value: null, target_unit: null, frequency: "daily" },
  ];

  for (const h of habitsData) {
    const habitId = randomUUID();
    await supabase.from("habits").insert({
      id: habitId,
      user_id: userId,
      name: h.name,
      category: h.category,
      frequency: h.frequency,
      target_value: h.target_value,
      target_unit: h.target_unit,
      is_active: true,
    });

    // Generate checkins for last 30 days (70-90% hit rate)
    const checkinDates: string[] = [];
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastCheckinDate: string | null = null;

    for (let day = 30; day >= 0; day--) {
      const hit = Math.random() < (h.name === "Drink Water" ? 0.9 : h.name === "Meditate" ? 0.6 : 0.75);
      if (hit) {
        const d = daysAgo(day);
        const ds = dateStr(d);
        checkinDates.push(ds);
        tempStreak++;
        lastCheckinDate = ds;

        await supabase.from("habit_checkins").insert({
          id: randomUUID(),
          habit_id: habitId,
          user_id: userId,
          value: h.target_value ? h.target_value * (0.7 + Math.random() * 0.5) : null,
          checked_in_at: d.toISOString(),
        });
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 0;
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    currentStreak = tempStreak; // streak from most recent consecutive days

    await supabase.from("habit_streaks").upsert(
      {
        habit_id: habitId,
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_checkin_date: lastCheckinDate,
      },
      { onConflict: "habit_id,user_id" }
    );

    console.log(`  ${h.name}: ${checkinDates.length}/31 days, streak ${currentStreak}, best ${longestStreak}`);
  }

  // 6. Tasks
  console.log("Inserting tasks...");
  const tasks = [
    { content: "Buy groceries — milk, eggs, bread, bananas, coffee beans", category: "personal", is_completed: true, due_date: daysAgo(5) },
    { content: "Prepare slides for Friday presentation", category: "work", is_completed: true, due_date: daysAgo(3) },
    { content: "Call the dentist for appointment", category: "health", is_completed: true, due_date: daysAgo(10) },
    { content: "Plan Priya's birthday surprise", category: "personal", is_completed: false, due_date: daysAgo(-5) }, // 5 days from now
    { content: "Refactor auth module with Amit", category: "work", is_completed: false, due_date: daysAgo(-3) },
    { content: "Sign up for Bangalore Rust conference", category: "learning", is_completed: false, due_date: daysAgo(-10) },
    { content: "Set up monthly budget tracker", category: "finance", is_completed: false, due_date: null },
    { content: "Write blog post about building Groot", category: "work", is_completed: false, due_date: daysAgo(-7) },
    { content: "Order new running shoes", category: "fitness", is_completed: false, due_date: null },
    { content: "Sunday dinner at Mom's", category: "personal", is_completed: true, due_date: daysAgo(2) },
    { content: "Review PR #47 — webhook refactor", category: "work", is_completed: true, due_date: daysAgo(1) },
    { content: "Research PKM tools for inspiration", category: "learning", is_completed: true, due_date: daysAgo(7) },
    { content: "Update Groot's persona rules", category: "work", is_completed: true, due_date: daysAgo(4) },
    { content: "Schedule eye checkup", category: "health", is_completed: false, due_date: daysAgo(-14) },
    { content: "Reply to Rohan about weekend plans", category: "personal", is_completed: false, due_date: daysAgo(0) }, // today — could show as overdue
  ];

  for (const t of tasks) {
    await supabase.from("tasks").insert({
      id: randomUUID(),
      user_id: userId,
      content: t.content,
      category: t.category,
      is_completed: t.is_completed,
      due_date: t.due_date?.toISOString() ?? null,
      created_at: daysAgo(Math.floor(Math.random() * 20) + 5).toISOString(),
    });
  }
  console.log(`  ${tasks.length} tasks inserted (${tasks.filter(t => t.is_completed).length} done, ${tasks.filter(t => !t.is_completed).length} pending)`);

  // 7. Reminders
  console.log("Inserting reminders...");
  const reminders = [
    { content: "Call the dentist", remind_at: daysAgo(9), is_sent: true },
    { content: "Mom's dinner — leave by 6 PM", remind_at: daysAgo(2), is_sent: true },
    { content: "Take vitamins", remind_at: daysAgo(1), is_sent: true },
    { content: "Priya's birthday — order cake", remind_at: daysAgo(-4), is_sent: false },
    { content: "Team sprint review at 3 PM", remind_at: daysAgo(-1), is_sent: false },
    { content: "Pay electricity bill", remind_at: daysAgo(-7), is_sent: false },
    { content: "Submit tax documents", remind_at: daysAgo(-20), is_sent: false },
  ];

  for (const r of reminders) {
    await supabase.from("reminders").insert({
      id: randomUUID(),
      user_id: userId,
      content: r.content,
      remind_at: r.remind_at.toISOString(),
      is_sent: r.is_sent,
      created_at: daysAgo(Math.floor(Math.random() * 15) + 5).toISOString(),
    });
  }
  console.log(`  ${reminders.length} reminders inserted`);

  // 8. Weekly Reports
  console.log("Inserting weekly reports...");
  const weeklyReports = [
    {
      week_start: dateStr(daysAgo(28)),
      week_end: dateStr(daysAgo(22)),
      summary: "A solid start to the month. You focused heavily on Groot development, particularly the webhook handler and memory system. Hit the gym 4 times and started reading Atomic Habits. Had a great dinner with Priya at the Italian place. Mood was generally positive with a dip mid-week due to a tricky debugging session.",
      key_topics: ["Groot development", "gym", "Atomic Habits", "Priya", "debugging"],
      mood_trend: "good",
      insights: { "Productivity pattern": "Most focused work happened between 10 AM - 2 PM", "Social": "Spent quality time with Priya and Mom this week" },
    },
    {
      week_start: dateStr(daysAgo(21)),
      week_end: dateStr(daysAgo(15)),
      summary: "A mixed week. Work was productive — you fixed the webhook handler and started the Garden redesign. Running improved to 5 km but you skipped gym twice. Rohan visited and you had coffee together. Some stress about the launch deadline emerged. You finished Deep Work by Cal Newport.",
      key_topics: ["Garden redesign", "running", "Rohan", "launch deadline", "Deep Work"],
      mood_trend: "mixed",
      insights: { "Fitness": "Running is improving but gym consistency dropped", "Reading": "3 books completed — ahead of 24-book annual goal", "Stress": "Launch deadline causing some anxiety" },
    },
    {
      week_start: dateStr(daysAgo(14)),
      week_end: dateStr(daysAgo(8)),
      summary: "Great week overall! The mood tracking feature is now working. You've been consistent with meditation — 5 out of 7 days. Weight dropped to 80.5 kg. Had a productive 1:1 with Amit about refactoring auth. Cooking more at home which is helping with both budget and health goals.",
      key_topics: ["mood tracking", "meditation", "weight loss", "Amit", "cooking"],
      mood_trend: "positive",
      insights: { "Health": "Weight trending down nicely — 1.5 kg lost this month", "New habit": "Meditation becoming consistent, 5/7 days", "Financial": "Cooking at home saving money" },
    },
    {
      week_start: dateStr(daysAgo(7)),
      week_end: dateStr(daysAgo(1)),
      summary: "The most recent week was a rollercoaster. High productivity at work — sprint completed on time. But some financial stress crept in. Priya's birthday planning is underway. Morning runs are getting faster (28 min for 4 km). You explored PKM systems and second brain tools for Garden inspiration. Ended the week on a high note with biryani at Cafe Noorani.",
      key_topics: ["sprint completion", "Priya birthday", "morning runs", "PKM research", "Cafe Noorani"],
      mood_trend: "good",
      insights: { "Running": "Pace improving — 7 min/km, on track for half-marathon", "Work": "Sprint delivered on time, team morale is high", "Upcoming": "Priya's birthday next week — plan something special" },
    },
  ];

  for (const r of weeklyReports) {
    await supabase.from("weekly_reports").upsert(
      {
        id: randomUUID(),
        user_id: userId,
        week_start: r.week_start,
        week_end: r.week_end,
        summary: r.summary,
        key_topics: r.key_topics,
        mood_trend: r.mood_trend,
        insights: r.insights,
        memories_count: 20 + Math.floor(Math.random() * 15),
        messages_count: 40 + Math.floor(Math.random() * 30),
      },
      { onConflict: "user_id,week_start" }
    );
  }
  console.log(`  ${weeklyReports.length} weekly reports inserted`);

  // 9. Sessions
  console.log("Inserting sessions...");
  for (let day = 30; day >= 0; day--) {
    const sessionsPerDay = 1 + Math.floor(Math.random() * 2);
    for (let s = 0; s < sessionsPerDay; s++) {
      const startDate = daysAgo(day);
      startDate.setHours(8 + s * 6 + Math.floor(Math.random() * 4));
      const lastActivity = new Date(startDate.getTime() + (10 + Math.floor(Math.random() * 30)) * 60000);

      await supabase.from("sessions").insert({
        id: randomUUID(),
        user_id: userId,
        started_at: startDate.toISOString(),
        last_activity_at: lastActivity.toISOString(),
        message_count: 3 + Math.floor(Math.random() * 8),
        is_active: day === 0 && s === sessionsPerDay - 1,
      });
    }
  }
  console.log("  ~45 sessions inserted");

  console.log("\nDummy data seeding complete!");
  console.log("Visit /garden to see the data in action.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
