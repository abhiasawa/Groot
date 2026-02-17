/**
 * Seed script: Insert a month's worth of RICH, realistic dummy data
 * for testing all Garden features. ~1000 messages, many habits, tasks, people.
 *
 * Run: npx dotenv-cli -e .env.local -- npx tsx scripts/seed-dummy-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars. Run with:");
  console.error("  npx dotenv-cli -e .env.local -- npx tsx scripts/seed-dummy-data.ts");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const WHATSAPP = "919167900916";

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
function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ─── Mood data ───
const MOODS_BY_VALENCE = {
  high: ["happy", "excited", "energetic", "grateful", "inspired"],
  good: ["good", "calm", "motivated", "positive", "content", "focused"],
  mid: ["okay", "neutral", "fine", "busy", "thoughtful"],
  low: ["tired", "anxious", "stressed", "overwhelmed", "restless"],
  bad: ["sad", "frustrated", "upset", "angry", "low"],
};
const MOOD_SCORE: Record<string, number> = {};
for (const m of MOODS_BY_VALENCE.high) MOOD_SCORE[m] = 5;
for (const m of MOODS_BY_VALENCE.good) MOOD_SCORE[m] = 4;
for (const m of MOODS_BY_VALENCE.mid) MOOD_SCORE[m] = 3;
for (const m of MOODS_BY_VALENCE.low) MOOD_SCORE[m] = 2;
for (const m of MOODS_BY_VALENCE.bad) MOOD_SCORE[m] = 1;
const ALL_MOODS = Object.values(MOODS_BY_VALENCE).flat();

// ─── Day patterns (mood arc across the month) ───
// Simulates realistic emotional variation: good start, stressful mid, recovery, great end
function moodForDay(day: number): string {
  // day 30 = oldest, day 0 = today
  if (day >= 27) return randomFrom([...MOODS_BY_VALENCE.good, ...MOODS_BY_VALENCE.mid]); // Week 1: settling in
  if (day >= 20) return randomFrom([...MOODS_BY_VALENCE.good, ...MOODS_BY_VALENCE.high, ...MOODS_BY_VALENCE.mid]); // Week 2: positive
  if (day >= 14) return randomFrom([...MOODS_BY_VALENCE.mid, ...MOODS_BY_VALENCE.low, ...MOODS_BY_VALENCE.good]); // Week 3: stressed
  if (day >= 7) return randomFrom([...MOODS_BY_VALENCE.good, ...MOODS_BY_VALENCE.high]); // Week 4: recovery
  return randomFrom([...MOODS_BY_VALENCE.high, ...MOODS_BY_VALENCE.good, ...MOODS_BY_VALENCE.good]); // Recent: mostly good
}

// ─── Large message corpus ───
const INBOUND_MESSAGES = [
  // Morning routines
  "Good morning Groot! Woke up early today, feeling fresh. Going for a run before work.",
  "Ugh, snoozed the alarm 3 times. Running late. Not the best start to the day.",
  "Morning! Had the weirdest dream last night — I was coding in a castle. What does that mean?",
  "Just had my morning coffee. Black, no sugar, as usual. Ready to tackle the day.",
  "Woke up at 5:30 without an alarm. Body is finally adjusting to the routine.",
  "Skipped morning run today. Legs are sore from yesterday's gym session.",

  // Work
  "Big day at work today. We have the sprint demo at 3 PM.",
  "Finally fixed that bug in the webhook handler. Took me 3 hours but it works now.",
  "Had a 1:1 with Amit today. He thinks we should refactor the auth module.",
  "The team standup went long today. Too many blockers this sprint.",
  "Got a great code review from Amit. He said my API design is really clean.",
  "Deployed the new feature to staging. Fingers crossed it doesn't break.",
  "Had a brainstorming session about the notification system. Lots of good ideas.",
  "Working on the Garden redesign tonight. The diary concept is really coming together.",
  "Paired programming with the new intern. Teaching really reinforces your own knowledge.",
  "Our CI/CD pipeline broke again. Spent 2 hours fixing GitHub Actions.",
  "Just shipped the profile page. Users can now see what Groot knows about them.",
  "Sprint planning meeting was actually useful for once. We have a clear roadmap now.",
  "Late night coding session. The new mood tracking feature is working!",
  "Need to prepare slides for Friday's presentation about our AI architecture.",
  "Review PR #47 — webhook refactor. Amit's code is always so clean.",
  "Server went down during lunch. Quick hotfix, but it was stressful.",
  "Finally merged the big refactor branch. 47 files changed, 0 bugs so far.",

  // Fitness
  "Had a great workout at the gym. Hit a new PR on bench press — 80 kg!",
  "I ran 5 km today! Slowly building up for the half marathon.",
  "Morning run done — 4 km in 28 minutes. Getting faster!",
  "Legs day at the gym. Can barely walk but it feels good.",
  "Tried yoga for the first time at the gym. Way harder than I expected.",
  "Weight check: 80.5 kg this morning. Slow progress but getting there.",
  "Did a 7 km run today! Longest distance yet. Half-marathon feels achievable.",
  "Skipped gym today. Feeling guilty but my shoulder needs rest.",
  "Swimming laps today instead of running. Good cross-training.",
  "Morning run in the rain. Actually felt amazing. Nature's shower.",
  "Hit 100 kg deadlift today! Rohan would be proud.",
  "Tracked my run on Strava — 4.2 km, 27:30. PB!",

  // People — Priya
  "Priya and I went to that new Italian restaurant. The pasta was amazing but nothing beats biryani lol",
  "Priya surprised me with my favorite cake. Feeling grateful today.",
  "Had a small argument with Priya about vacation plans. Nothing serious but need to sort it out.",
  "Priya's birthday is coming up next week. Need to plan something special.",
  "Watching a movie with Priya tonight. She picked some rom-com. I'll survive.",
  "Priya showed me her new design portfolio. Her work is getting so good.",
  "Ordered dinner in with Priya. Pizza and a movie night. Perfect evening.",
  "Priya wants us to adopt a cat. I'm not sure we have the time right now.",

  // People — Rohan
  "Rohan sent me a link to a Rust conference happening in Bangalore. Should I go?",
  "Had coffee with Rohan after ages. Good catching up.",
  "Rohan got promoted at Google! So happy for him. We're celebrating this weekend.",
  "Video call with Rohan last night. He's working on some cool ML stuff.",
  "Rohan challenged me to a 10K race next month. Game on.",

  // People — Mom
  "Mom called, she wants me to come for dinner this Sunday. Need to remember that.",
  "Had dinner at Mom's place. She made dal makhani. Nobody makes it like her.",
  "Mom sent me a WhatsApp forward again. Classic. But it actually had a good recipe.",
  "Took Mom to the doctor today. Just a routine checkup. She's doing well.",
  "Called Mom during lunch. She misses me, wants me to visit more often.",

  // People — Amit
  "Coffee chat with Amit about career growth. He has really good advice.",
  "Amit suggested I try pair programming more. He's right — it catches bugs early.",
  "Lunch with Amit and the team at that new Korean place. The kimchi was fire.",

  // People — Others
  "Met Sneha at the coffee shop. She's working on a startup in ed-tech. Interesting stuff.",
  "Talked to Dad on the phone. He's planning to visit next month.",
  "Had a call with Vikram about freelance work. Might take a side project.",
  "Bumped into college friend Neha at the mall. Small world!",
  "My landlord called about the lease renewal. Need to negotiate the rent increase.",

  // Books & Learning
  "Just finished reading chapter 5 of Atomic Habits. The concept of habit stacking is really cool.",
  "Started reading Deep Work by Cal Newport. Already hooked.",
  "Just finished my 3rd book of the year — Deep Work. Highly recommend.",
  "Listening to the Huberman Lab podcast while running. Learning about sleep optimization.",
  "Found a great YouTube channel about system design. Binging all the videos.",
  "Started a Rust tutorial. The borrow checker is brutal but I'm getting it.",
  "Finished Atomic Habits! My favorite idea: you don't rise to the level of your goals, you fall to the level of your systems.",
  "Reading Show Your Work by Austin Kleon. Makes me want to blog more.",
  "Listened to a great podcast about AI agents. Made me think about Groot's architecture.",
  "Watched Andrej Karpathy's latest talk. So inspiring.",

  // Food
  "Just had the best biryani at Cafe Noorani. Absolute 10/10.",
  "Cooked dinner for the first time this week — made dal and rice. Turned out decent!",
  "I need to buy groceries — milk, eggs, bread, bananas, and coffee beans.",
  "Trying intermittent fasting this week. 16:8 window. So far so good.",
  "Made smoothie bowls for breakfast. Mango, banana, granola. Actually delicious.",
  "Tried cooking paneer tikka at home. Came out pretty good!",
  "Late night maggi with extra veggies. Some things never change.",
  "Found a great salad place near office. Trying to eat healthier.",

  // Mood / Feelings
  "Feeling a bit stressed about the launch deadline.",
  "Feeling tired today, didn't sleep well. Had weird dreams.",
  "Just had a really productive morning. Knocked out 4 tasks before lunch.",
  "Stressed about money this month. Need to budget better.",
  "Feeling motivated after watching that Karpathy talk. Going to build something cool.",
  "Anxious about tomorrow's presentation. Practiced 3 times but still nervous.",
  "Today was a good day. No drama, just progress.",
  "Feeling lonely tonight. Priya is traveling for work.",
  "Grateful for the small things today — good coffee, sunny weather, clean code.",
  "Had an energy crash around 3 PM. Need to fix my lunch routine.",
  "Feeling really inspired after the tech meetup. So many smart people.",
  "Kind of overwhelmed with everything on my plate right now.",
  "Best day in a while! Everything just clicked today.",
  "Rainy day, cozy vibes. Working from the cafe with my hoodie on.",

  // Habits / Self-improvement
  "Going to try meditating before bed tonight. Downloaded the Headspace app.",
  "Track my water intake — I want to drink 3 liters a day",
  "Day 5 of no sugar. The cravings are real but I'm pushing through.",
  "Journaled for 10 minutes before bed. It really helps clear my mind.",
  "Meditated for 15 minutes this morning. Felt so peaceful afterwards.",
  "Trying to wake up at 6 AM consistently this week. Day 3 successful!",
  "Drank 3.5 liters of water today. Feeling hydrated and energized.",
  "No screen time after 10 PM tonight. Reading instead.",

  // Tasks / Reminders
  "Can you remind me to call the dentist tomorrow at 10 AM?",
  "Need to pay the electricity bill by Friday.",
  "Remind me to buy flowers for Priya before her birthday.",
  "I should book train tickets for Dad's visit next month.",
  "Need to renew my gym membership by end of this week.",
  "Remind me to submit the expense report before Monday.",
  "Should schedule the eye checkup I've been putting off.",
  "Need to call the internet provider about the slow connection.",

  // Random / Life
  "Mumbai traffic is insane today. Been stuck for 40 minutes.",
  "It's raining so hard! Love the smell of wet earth.",
  "The electricity went out during my Zoom call. So embarrassing.",
  "Found ₹500 in my old jacket pocket. Free money!",
  "My neighbor's dog keeps barking at 2 AM. Sleep is non-negotiable.",
  "Cleaned and organized my desk today. Marie Kondo would be proud.",
  "Binge-watched 4 episodes of that new sci-fi series. So good.",
  "Thinking about whether to get an iPad for reading and drawing.",
  "The sunset from my balcony was incredible today. Took 5 photos.",
  "Weekend plans: gym in the morning, brunch with Priya, coding in the evening.",
  "Can't believe it's already February. Time flies when you're building stuff.",
  "Planning a trip to Goa with Rohan and the gang next month.",
];

const OUTBOUND_RESPONSES = [
  "Good morning! Sounds like a great start. What's the plan for today?",
  "Don't be too hard on yourself — mornings like that happen. You'll get back on track.",
  "Ha! Coding in a castle sounds like a developer's dream. Maybe it's a sign to build something grand.",
  "A good coffee ritual sets the tone. Your consistency with black coffee is impressive.",
  "That's discipline! Your body clock is resetting. Keep it up.",
  "Rest days are important too. Your muscles grow during recovery, not during the workout.",
  "Good luck with the sprint demo! You've got this. What are you presenting?",
  "3 hours well spent — debugging is its own skill. The webhook handler is solid now.",
  "Sounds like a productive 1:1. Refactoring auth could pay off long-term.",
  "Long standups are draining. Maybe suggest timeboxing each person to 2 minutes?",
  "That's a great compliment from a senior engineer. Your API skills are growing fast.",
  "Fingers crossed indeed! Do you have monitoring set up in case something goes wrong?",
  "Nice! The notification system will be a game-changer for user engagement.",
  "The diary concept is coming along beautifully. The warm aesthetic really works.",
  "Teaching is the best way to solidify knowledge. The intern is lucky to work with you.",
  "CI/CD issues are always annoying. At least it's fixed now. Maybe add a health check?",
  "The profile page looks great! Users will love seeing their data visualized.",
  "A clear roadmap makes everything less stressful. What's the top priority this sprint?",
  "Late night hustle! The mood tracking feature sounds awesome. Get some rest though.",
  "Presentation prep is key. Want to brainstorm the key talking points?",
  "Amit's code is always clean — good coding partner to have. What did you learn from the PR?",
  "Stressful moments build resilience. Quick recovery is a sign of a strong team.",
  "47 files with 0 bugs — that's impressive. Clean refactors like that pay dividends.",
  "80 kg PR! Your consistency at the gym is really paying off.",
  "5 km! You're making real progress toward that half-marathon goal.",
  "28 minutes for 4 km — that's a 7 min/km pace. You'll crush the half-marathon!",
  "Legs day soreness is the best kind of pain. Walk it off tomorrow!",
  "Yoga is deceptively hard! Great for flexibility and preventing running injuries.",
  "80.5 kg — down from 82! That's 1.5 kg progress. The trend is your friend.",
  "7 km! You're ahead of schedule. The half-marathon goal is looking very achievable.",
  "Rest when you need to. A healthy shoulder matters more than one gym session.",
  "Swimming is excellent cross-training. Good for recovery and different muscle groups.",
  "Running in the rain is underrated! Some of the best runs happen in bad weather.",
  "100 kg deadlift — that's a milestone! Rohan would definitely be impressed.",
  "New PB! 4.2 km in 27:30 is solid progress. You're getting faster every week.",
  "Biryani supremacy! Glad you two had a nice time out.",
  "That's so sweet of Priya. Moments like these are worth remembering.",
  "Small disagreements are normal. Communication is key. Talk it through when you're both calm.",
  "Priya's birthday! I'll help you brainstorm ideas. What does she love?",
  "Surviving rom-coms is part of the boyfriend job description. Enjoy the quality time!",
  "Design is such a creative field. You two complement each other well — builder and designer.",
  "Pizza and movie night sounds perfect. Sometimes simple evenings are the best.",
  "A cat could be a wonderful addition! Maybe start by fostering to see how it goes?",
  "A Rust conference in Bangalore could be great for networking and learning. When is it?",
  "Quality time with old friends is so important. How's Rohan doing at Google?",
  "Congratulations to Rohan! A promotion at Google is huge. What will you do to celebrate?",
  "ML stuff at Google must be fascinating. Did he share any interesting projects?",
  "A 10K race challenge with Rohan — that's the perfect motivation to keep running!",
  "Sunday dinner at Mom's — noted! I'll remind you Saturday evening.",
  "Nothing beats home-cooked dal makhani. Mom's cooking is irreplaceable.",
  "WhatsApp forwards from moms are a universal experience. The recipe one sounds useful though!",
  "Glad the checkup went well. It's good to stay on top of health appointments.",
  "Call Mom more often — she clearly values your time. Even a 5-minute call makes a difference.",
  "Career advice from experienced colleagues is gold. What was Amit's key recommendation?",
  "Pair programming catches bugs early and spreads knowledge. It's worth the time investment.",
  "Korean food is the best! Kimchi is proof that fermented foods are superior.",
  "Ed-tech is a growing space. Sneha might have some interesting insights for you.",
  "Family visits are important. Start planning activities for when Dad comes.",
  "Freelance can be a great way to diversify income. Just be careful not to overcommit.",
  "Small world indeed! College connections always bring back good memories.",
  "Lease renewals are a good time to negotiate. Research comparable rents in your area first.",
  "Habit stacking is one of the best ideas in Atomic Habits. How will you apply it?",
  "Deep Work is a game-changer. The concept of 'deep work hours' is worth scheduling.",
  "3 books already! You're ahead of your 24-book annual goal pace. Keep it going!",
  "Huberman Lab is excellent for science-backed health advice. The sleep episode is life-changing.",
  "System design knowledge compounds over time. These videos will pay off in interviews too.",
  "The Rust borrow checker is tough initially but becomes intuitive. It prevents real bugs.",
  "That's my favorite line from Atomic Habits too! Systems > goals every time.",
  "Show Your Work is great. You should definitely blog about building Groot.",
  "AI agents are fascinating. What ideas did the podcast spark for Groot's architecture?",
  "Karpathy is inspiring. What resonated most from the talk?",
  "Cafe Noorani biryani is legendary. Glad you enjoyed it!",
  "Cooking your own meals is a win. Dal and rice is comfort food perfection.",
  "Added to your tasks: groceries list. I'll remind you before your next shopping trip.",
  "How's the fasting going? The first few days are the hardest. Drink lots of water.",
  "Smoothie bowls are a great breakfast option. Mango is perfect for energy.",
  "Homemade paneer tikka — impressive! You're becoming quite the chef.",
  "Late night Maggi is a sacred tradition. Some things are just perfect as they are.",
  "Good choice! Salads don't have to be boring. What toppings did they have?",
  "Launch deadlines can be intense. Want to talk through what's on your plate?",
  "Bad sleep affects everything. Try a no-screen rule 30 minutes before bed tonight.",
  "4 tasks before lunch is impressive. You're in a flow state!",
  "Budgeting stress is real. Want me to help you track expenses this month?",
  "That motivation energy is powerful — channel it into something concrete today.",
  "Nervousness before presenting is normal and actually helps you perform better.",
  "Boring days with steady progress are actually the most valuable. Embrace the calm.",
  "Long-distance is tough. Plan a call or send her something sweet to brighten her day.",
  "Gratitude practice is so underrated. Those three things you mentioned are genuinely beautiful.",
  "The 3 PM crash is usually a nutrition issue. Try a protein-rich lunch with fewer carbs.",
  "Tech meetups are energizing! Did you make any connections worth following up on?",
  "When you're overwhelmed, pick the ONE thing that would make everything else easier. Start there.",
  "Best days happen when preparation meets opportunity. You earned it!",
  "Rainy cafe days are peak productivity vibes. Enjoy the cozy coding session.",
  "Meditation before bed is a great call. Even 5 minutes can improve sleep quality.",
  "I'll track your water intake daily. Target: 3 liters. Let me know each time!",
  "Day 5 of no sugar — the cravings peak around day 3-5 and then drop. You're almost through!",
  "Journaling before bed is proven to improve sleep quality. Keep it up!",
  "15 minutes of meditation is impressive consistency. How do you feel compared to a week ago?",
  "6 AM wake-ups — 3 days in a row means the habit is forming! One more week and it'll stick.",
  "3.5 liters! You exceeded your target. Proper hydration makes everything better.",
  "No screens after 10 PM is a great boundary. What are you reading instead?",
  "Done! I'll remind you tomorrow at 10 AM to call the dentist.",
  "Electricity bill noted. I'll remind you Thursday evening so you have time.",
  "Flowers for Priya — great idea. I'll remind you the day before her birthday.",
  "Train tickets for Dad's visit — I'll remind you next week. What dates work?",
  "Gym membership renewal — I'll remind you Wednesday. Do you want to renegotiate the rate?",
  "Expense report reminder set for Sunday evening so you can submit Monday morning.",
  "Eye checkup is important! I'll remind you to call this week. When do you prefer — morning or afternoon?",
  "Internet issues are the worst. I'll remind you to call them today.",
  "Mumbai traffic is a test of patience. Use the time for a podcast or audiobook!",
  "Monsoon vibes! Petrichor (that rain smell) is scientifically proven to reduce stress.",
  "Zoom call power outage — classic WFH moment! Hopefully your team understands.",
  "Free ₹500! The universe rewards those who keep their old jackets.",
  "Sleep is non-negotiable for health and productivity. Consider earplugs or a white noise machine.",
  "An organized desk, an organized mind. How does it feel?",
  "Binge-watching is fine in moderation! What's the show? Should I add it to your list?",
  "An iPad could be great for reading and note-taking. What's your budget?",
  "Beautiful sunsets are free therapy. Did you share the photos with anyone?",
  "Great weekend plan! Balance of fitness, relationship, and personal projects. Well done.",
  "February already! You've accomplished a lot in January. Let's make this month even better.",
  "Goa trip sounds amazing! Start planning early — flights and hotels fill up fast.",
];

async function main() {
  console.log("🌱 Starting comprehensive seed...\n");

  // 1. Get user
  const { data: existingUsers } = await supabase
    .from("users")
    .select("id, display_name")
    .eq("whatsapp_number", WHATSAPP);

  let userId: string;
  if (existingUsers && existingUsers.length > 0) {
    userId = existingUsers[0]!.id;
    console.log(`Found user: ${userId} (${existingUsers[0]!.display_name})`);
  } else {
    userId = randomUUID();
    await supabase.from("users").insert({
      id: userId,
      whatsapp_number: WHATSAPP,
      display_name: "Abhishek",
      timezone: "Asia/Kolkata",
      onboarding_step: 0,
      onboarding_completed_at: daysAgo(35).toISOString(),
    });
    console.log(`Created user: ${userId}`);
  }

  // 2. Clear existing seed data (keep user)
  console.log("Clearing old data...");
  await supabase.from("messages").delete().eq("user_id", userId);
  await supabase.from("habit_checkins").delete().eq("user_id", userId);
  await supabase.from("habit_streaks").delete().eq("user_id", userId);
  await supabase.from("habits").delete().eq("user_id", userId);
  await supabase.from("tasks").delete().eq("user_id", userId);
  await supabase.from("reminders").delete().eq("user_id", userId);
  await supabase.from("weekly_reports").delete().eq("user_id", userId);
  await supabase.from("sessions").delete().eq("user_id", userId);
  await supabase.from("user_profile").delete().eq("user_id", userId);
  await supabase.from("contacts").delete().eq("owner_user_id", userId);
  console.log("  Done.\n");

  // 3. Profile facts (30+)
  console.log("📋 Inserting profile facts...");
  const profileFacts = [
    // Static
    { category: "static", key: "name", value: "Abhishek Asawa" },
    { category: "static", key: "location", value: "Mumbai, India" },
    { category: "static", key: "hometown", value: "Jaipur, Rajasthan" },
    { category: "static", key: "occupation", value: "Software Engineer" },
    { category: "static", key: "company", value: "Building Groot (AI startup)" },
    { category: "static", key: "education", value: "B.Tech Computer Science" },
    { category: "static", key: "age", value: "25" },
    { category: "static", key: "relationship_mom", value: "Mom — lives in Mumbai, close relationship, great cook" },
    { category: "static", key: "relationship_dad", value: "Dad — lives in Jaipur, visiting next month" },
    { category: "static", key: "relationship_rohan", value: "Rohan — best friend from college, works at Google Bangalore" },
    { category: "static", key: "relationship_priya", value: "Priya — girlfriend, graphic designer, lives in Mumbai" },
    { category: "static", key: "relationship_amit", value: "Amit — colleague and mentor, engineering lead" },
    { category: "static", key: "relationship_sneha", value: "Sneha — friend, running an ed-tech startup" },
    { category: "static", key: "relationship_vikram", value: "Vikram — freelance contact for side projects" },
    { category: "static", key: "relationship_neha", value: "Neha — college friend, bumped into recently" },
    // Dynamic
    { category: "dynamic", key: "current_project", value: "Building Groot — AI second brain on WhatsApp" },
    { category: "dynamic", key: "reading", value: "Show Your Work by Austin Kleon (just finished Deep Work and Atomic Habits)" },
    { category: "dynamic", key: "fitness_routine", value: "Gym 4x/week (strength), morning runs 3x/week, building to half-marathon" },
    { category: "dynamic", key: "learning", value: "Learning Rust, exploring system design, studying AI architectures" },
    { category: "dynamic", key: "recent_interest", value: "Second brain / PKM systems, journaling, meditation" },
    { category: "dynamic", key: "weight", value: "80.5 kg (down from 82 kg last month)" },
    { category: "dynamic", key: "current_streak", value: "6 AM wake-ups for 3 days straight" },
    { category: "dynamic", key: "fasting", value: "Trying 16:8 intermittent fasting this week" },
    // Preferences
    { category: "preference", key: "favorite_food", value: "Biryani (Cafe Noorani is the best)" },
    { category: "preference", key: "coffee", value: "Black coffee, no sugar, first thing in the morning" },
    { category: "preference", key: "music", value: "Lo-fi while coding, Bollywood otherwise, some English pop" },
    { category: "preference", key: "communication_style", value: "Concise messages, dislikes long paragraphs, likes bullet points" },
    { category: "preference", key: "work_hours", value: "Most productive 10 AM – 2 PM, creative work in evening" },
    { category: "preference", key: "movie_genre", value: "Sci-fi and thriller, will watch rom-coms with Priya" },
    { category: "preference", key: "cooking", value: "Enjoys simple Indian cooking — dal, rice, paneer" },
    { category: "preference", key: "tech_setup", value: "MacBook Pro, VS Code, dark theme" },
    // Goals
    { category: "goal", key: "fitness_goal", value: "Run a half-marathon by June 2026" },
    { category: "goal", key: "career_goal", value: "Launch Groot publicly by March 2026" },
    { category: "goal", key: "reading_goal", value: "Read 24 books in 2026 (3 done so far)" },
    { category: "goal", key: "weight_goal", value: "Reach 75 kg by August 2026" },
    { category: "goal", key: "financial_goal", value: "Build 6-month emergency fund by year end" },
    { category: "goal", key: "travel_goal", value: "Trip to Goa with friends, visit Dad in Jaipur" },
    { category: "goal", key: "habit_goal", value: "Meditate daily, journal before bed, no screens after 10 PM" },
  ];

  for (const fact of profileFacts) {
    await supabase.from("user_profile").upsert(
      {
        user_id: userId,
        category: fact.category,
        key: fact.key,
        value: fact.value,
        confidence: 0.75 + Math.random() * 0.25,
        source: "conversation",
        last_mentioned_at: daysAgo(Math.floor(Math.random() * 20)).toISOString(),
      },
      { onConflict: "user_id,category,key" }
    );
  }
  console.log(`  ${profileFacts.length} facts inserted`);

  // 4. Contacts (8 people)
  console.log("\n👥 Inserting contacts...");
  const contacts = [
    { name: "Rohan", whatsapp_number: "919876543210" },
    { name: "Priya", whatsapp_number: "919876543211" },
    { name: "Mom", whatsapp_number: "919876543212" },
    { name: "Dad", whatsapp_number: "919876543214" },
    { name: "Amit", whatsapp_number: "919876543213" },
    { name: "Sneha", whatsapp_number: "919876543215" },
    { name: "Vikram", whatsapp_number: "919876543216" },
    { name: "Neha", whatsapp_number: "919876543217" },
  ];
  for (const c of contacts) {
    await supabase.from("contacts").upsert(
      { owner_user_id: userId, name: c.name, whatsapp_number: c.whatsapp_number, is_approved: true },
      { onConflict: "owner_user_id,whatsapp_number" }
    );
  }
  console.log(`  ${contacts.length} contacts inserted`);

  // 5. Messages (~1000+, 35 days of conversations)
  console.log("\n💬 Generating messages...");
  const messageRows: Array<Record<string, unknown>> = [];

  for (let day = 35; day >= 0; day--) {
    // Vary volume per day: weekends are chattier
    const dayOfWeek = daysAgo(day).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const numConversations = isWeekend
      ? randomInt(8, 14)
      : randomInt(5, 10);

    for (let j = 0; j < numConversations; j++) {
      const baseDate = daysAgo(day);
      const hour = 6 + Math.floor(Math.random() * 17); // 6 AM - 11 PM
      const minute = Math.floor(Math.random() * 60);
      baseDate.setHours(hour, minute, Math.floor(Math.random() * 60), 0);

      const inIdx = Math.floor(Math.random() * INBOUND_MESSAGES.length);
      const outIdx = Math.floor(Math.random() * OUTBOUND_RESPONSES.length);
      const mood = moodForDay(day);
      const msgType = Math.random() < 0.1 ? "audio" : Math.random() < 0.05 ? "image" : "text";

      // Inbound
      messageRows.push({
        id: randomUUID(),
        user_id: userId,
        direction: "inbound",
        message_type: msgType,
        content: INBOUND_MESSAGES[inIdx],
        media_description: msgType === "audio" ? "Voice message transcription" : msgType === "image" ? "Photo shared by user" : null,
        metadata: {},
        created_at: baseDate.toISOString(),
      });

      // Outbound with mood
      const responseDate = new Date(baseDate.getTime() + randomInt(3000, 15000));
      messageRows.push({
        id: randomUUID(),
        user_id: userId,
        direction: "outbound",
        message_type: "text",
        content: OUTBOUND_RESPONSES[outIdx],
        metadata: { detectedMood: mood, moodScore: MOOD_SCORE[mood] ?? 3 },
        created_at: responseDate.toISOString(),
      });

      // Sometimes add a follow-up exchange (makes conversations feel multi-turn)
      if (Math.random() < 0.35) {
        const followupDate = new Date(responseDate.getTime() + randomInt(30000, 300000));
        const followIdx = Math.floor(Math.random() * INBOUND_MESSAGES.length);
        messageRows.push({
          id: randomUUID(),
          user_id: userId,
          direction: "inbound",
          message_type: "text",
          content: INBOUND_MESSAGES[followIdx],
          metadata: {},
          created_at: followupDate.toISOString(),
        });
        const followReply = new Date(followupDate.getTime() + randomInt(3000, 10000));
        messageRows.push({
          id: randomUUID(),
          user_id: userId,
          direction: "outbound",
          message_type: "text",
          content: OUTBOUND_RESPONSES[Math.floor(Math.random() * OUTBOUND_RESPONSES.length)],
          metadata: { detectedMood: mood, moodScore: MOOD_SCORE[mood] ?? 3 },
          created_at: followReply.toISOString(),
        });
      }
    }
  }

  // Batch insert
  const chunkSize = 100;
  for (let i = 0; i < messageRows.length; i += chunkSize) {
    const chunk = messageRows.slice(i, i + chunkSize);
    const { error } = await supabase.from("messages").insert(chunk);
    if (error) console.error("  Chunk error:", error.message);
  }
  console.log(`  ${messageRows.length} messages inserted (${Math.ceil(messageRows.length / 2)} exchanges over 35 days)`);

  // 6. Habits (8 habits) + Checkins + Streaks
  console.log("\n📊 Inserting habits...");
  const habitsData = [
    { name: "Morning Run", category: "fitness", target_value: 5, target_unit: "km", hitRate: 0.7 },
    { name: "Read", category: "learning", target_value: 30, target_unit: "pages", hitRate: 0.8 },
    { name: "Drink Water", category: "health", target_value: 3, target_unit: "liters", hitRate: 0.9 },
    { name: "Meditate", category: "wellness", target_value: 10, target_unit: "minutes", hitRate: 0.55 },
    { name: "Gym", category: "fitness", target_value: null, target_unit: null, hitRate: 0.58 },
    { name: "No Sugar", category: "health", target_value: null, target_unit: null, hitRate: 0.65 },
    { name: "Journal", category: "wellness", target_value: null, target_unit: null, hitRate: 0.7 },
    { name: "Wake Up 6 AM", category: "productivity", target_value: null, target_unit: null, hitRate: 0.5 },
  ];

  for (const h of habitsData) {
    const habitId = randomUUID();
    await supabase.from("habits").insert({
      id: habitId,
      user_id: userId,
      name: h.name,
      category: h.category,
      frequency: "daily",
      target_value: h.target_value,
      target_unit: h.target_unit,
      is_active: true,
    });

    const checkinRows: Array<Record<string, unknown>> = [];
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastCheckinDate: string | null = null;

    for (let day = 35; day >= 0; day--) {
      if (Math.random() < h.hitRate) {
        const d = daysAgo(day);
        const ds = dateStr(d);
        d.setHours(randomInt(6, 22), randomInt(0, 59));
        tempStreak++;
        lastCheckinDate = ds;
        checkinRows.push({
          id: randomUUID(),
          habit_id: habitId,
          user_id: userId,
          value: h.target_value ? +(h.target_value * (0.6 + Math.random() * 0.6)).toFixed(1) : null,
          checked_in_at: d.toISOString(),
        });
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 0;
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    currentStreak = tempStreak;

    // Batch insert checkins
    for (let i = 0; i < checkinRows.length; i += 50) {
      await supabase.from("habit_checkins").insert(checkinRows.slice(i, i + 50));
    }

    await supabase.from("habit_streaks").upsert(
      { habit_id: habitId, user_id: userId, current_streak: currentStreak, longest_streak: longestStreak, last_checkin_date: lastCheckinDate },
      { onConflict: "habit_id,user_id" }
    );

    console.log(`  ${h.name}: ${checkinRows.length}/36 days, streak ${currentStreak}, best ${longestStreak}`);
  }

  // 7. Tasks (40+)
  console.log("\n✅ Inserting tasks...");
  const tasks = [
    // Completed tasks (spread across the month)
    { content: "Buy groceries — milk, eggs, bread, bananas, coffee beans", category: "personal", is_completed: true, due_offset: 25, created_offset: 27 },
    { content: "Call the dentist for appointment", category: "health", is_completed: true, due_offset: 22, created_offset: 25 },
    { content: "Prepare slides for sprint demo", category: "work", is_completed: true, due_offset: 20, created_offset: 22 },
    { content: "Fix webhook handler bug", category: "work", is_completed: true, due_offset: 18, created_offset: 20 },
    { content: "Buy birthday gift for Mom", category: "personal", is_completed: true, due_offset: 17, created_offset: 19 },
    { content: "Renew gym membership", category: "fitness", is_completed: true, due_offset: 15, created_offset: 18 },
    { content: "Research PKM tools for Garden inspiration", category: "learning", is_completed: true, due_offset: 14, created_offset: 16 },
    { content: "Set up CI/CD monitoring alerts", category: "work", is_completed: true, due_offset: 12, created_offset: 14 },
    { content: "Read 3 chapters of Deep Work", category: "learning", is_completed: true, due_offset: 11, created_offset: 13 },
    { content: "Cook paneer tikka recipe from YouTube", category: "personal", is_completed: true, due_offset: 10, created_offset: 12 },
    { content: "Submit expense report", category: "work", is_completed: true, due_offset: 8, created_offset: 10 },
    { content: "Sunday dinner at Mom's", category: "personal", is_completed: true, due_offset: 9, created_offset: 11 },
    { content: "Update Groot's persona rules", category: "work", is_completed: true, due_offset: 7, created_offset: 9 },
    { content: "Buy protein powder", category: "fitness", is_completed: true, due_offset: 6, created_offset: 8 },
    { content: "Review PR #47 — webhook refactor", category: "work", is_completed: true, due_offset: 5, created_offset: 7 },
    { content: "Prepare slides for Friday presentation", category: "work", is_completed: true, due_offset: 3, created_offset: 5 },
    { content: "Clean and organize desk", category: "personal", is_completed: true, due_offset: 2, created_offset: 4 },
    { content: "Buy new running socks", category: "fitness", is_completed: true, due_offset: 1, created_offset: 3 },
    { content: "Ship profile page feature", category: "work", is_completed: true, due_offset: 1, created_offset: 4 },

    // Pending tasks (due in the future or no date)
    { content: "Plan Priya's birthday surprise", category: "personal", is_completed: false, due_offset: -5, created_offset: 8 },
    { content: "Refactor auth module with Amit", category: "work", is_completed: false, due_offset: -3, created_offset: 6 },
    { content: "Sign up for Bangalore Rust conference", category: "learning", is_completed: false, due_offset: -10, created_offset: 5 },
    { content: "Set up monthly budget tracker", category: "finance", is_completed: false, due_offset: null, created_offset: 12 },
    { content: "Write blog post about building Groot", category: "work", is_completed: false, due_offset: -7, created_offset: 10 },
    { content: "Order new running shoes (Nike Pegasus 41)", category: "fitness", is_completed: false, due_offset: null, created_offset: 8 },
    { content: "Schedule eye checkup", category: "health", is_completed: false, due_offset: -14, created_offset: 3 },
    { content: "Reply to Rohan about Goa trip dates", category: "personal", is_completed: false, due_offset: 0, created_offset: 2 },
    { content: "Book train tickets for Dad's visit", category: "personal", is_completed: false, due_offset: -12, created_offset: 4 },
    { content: "Call internet provider about slow speed", category: "personal", is_completed: false, due_offset: -1, created_offset: 1 },
    { content: "Research iPad options for reading", category: "personal", is_completed: false, due_offset: null, created_offset: 6 },
    { content: "Set up automated tests for mood API", category: "work", is_completed: false, due_offset: -5, created_offset: 3 },
    { content: "Plan team offsite activities", category: "work", is_completed: false, due_offset: -8, created_offset: 5 },
    { content: "Buy flowers for Priya's birthday", category: "personal", is_completed: false, due_offset: -4, created_offset: 2 },
    { content: "Negotiate rent with landlord", category: "finance", is_completed: false, due_offset: -20, created_offset: 7 },
    { content: "Apply for Goa trip leave at work", category: "personal", is_completed: false, due_offset: -15, created_offset: 3 },
    { content: "Back up laptop before macOS update", category: "work", is_completed: false, due_offset: null, created_offset: 1 },
    { content: "Find a good meditation app (replace Headspace trial)", category: "wellness", is_completed: false, due_offset: null, created_offset: 5 },
    { content: "Buy groceries — eggs, milk, bread, avocados", category: "personal", is_completed: false, due_offset: -1, created_offset: 0 },
    { content: "Prepare for Rohan's 10K challenge — training plan", category: "fitness", is_completed: false, due_offset: -21, created_offset: 4 },
  ];

  for (const t of tasks) {
    await supabase.from("tasks").insert({
      id: randomUUID(),
      user_id: userId,
      content: t.content,
      category: t.category,
      is_completed: t.is_completed,
      due_date: t.due_offset !== null ? daysAgo(t.due_offset).toISOString() : null,
      created_at: daysAgo(t.created_offset).toISOString(),
    });
  }
  const done = tasks.filter(t => t.is_completed).length;
  console.log(`  ${tasks.length} tasks inserted (${done} done, ${tasks.length - done} pending)`);

  // 8. Reminders (15+)
  console.log("\n🔔 Inserting reminders...");
  const reminders = [
    { content: "Call the dentist", remind_at: 22, is_sent: true, created: 25 },
    { content: "Mom's birthday — order cake", remind_at: 17, is_sent: true, created: 20 },
    { content: "Gym membership renewal deadline", remind_at: 15, is_sent: true, created: 18 },
    { content: "Submit expense report before EOD", remind_at: 8, is_sent: true, created: 10 },
    { content: "Take vitamins after lunch", remind_at: 5, is_sent: true, created: 7 },
    { content: "Sunday dinner at Mom's — leave by 6 PM", remind_at: 2, is_sent: true, created: 5 },
    { content: "Pay electricity bill", remind_at: 1, is_sent: true, created: 4 },
    { content: "Morning standup — prepare status update", remind_at: 0, is_sent: true, created: 1 },
    // Upcoming
    { content: "Priya's birthday — order cake from Baker's Dozen", remind_at: -4, is_sent: false, created: 2 },
    { content: "Team sprint review at 3 PM", remind_at: -1, is_sent: false, created: 0 },
    { content: "Buy flowers for Priya", remind_at: -4, is_sent: false, created: 1 },
    { content: "Book Goa flight tickets (prices going up)", remind_at: -7, is_sent: false, created: 3 },
    { content: "Dad's visit — clean guest room", remind_at: -10, is_sent: false, created: 5 },
    { content: "Submit tax documents", remind_at: -20, is_sent: false, created: 8 },
    { content: "Rust conference early bird registration deadline", remind_at: -14, is_sent: false, created: 4 },
    { content: "Eye checkup appointment", remind_at: -12, is_sent: false, created: 3 },
  ];

  for (const r of reminders) {
    await supabase.from("reminders").insert({
      id: randomUUID(),
      user_id: userId,
      content: r.content,
      remind_at: daysAgo(r.remind_at).toISOString(),
      is_sent: r.is_sent,
      created_at: daysAgo(r.created).toISOString(),
    });
  }
  console.log(`  ${reminders.length} reminders inserted`);

  // 9. Weekly Reports (5 weeks)
  console.log("\n📈 Inserting weekly reports...");
  const weeklyReports = [
    {
      week_start: dateStr(daysAgo(35)),
      week_end: dateStr(daysAgo(29)),
      summary: "Your first full week with Groot! You set up habits, started sharing your daily life, and established a rhythm. Started Atomic Habits and went to the gym 3 times. Had Mom's birthday dinner — a lovely family evening. Mood was a mix of excitement about the new tool and normal work stress.",
      key_topics: ["onboarding", "Atomic Habits", "gym", "Mom's birthday", "routine building"],
      mood_trend: "good",
      insights: { "Getting started": "You've been open and consistent in sharing — this helps Groot learn faster", "Fitness": "3 gym sessions in the first week is a strong start", "Reading": "Atomic Habits is a great choice to pair with habit tracking" },
    },
    {
      week_start: dateStr(daysAgo(28)),
      week_end: dateStr(daysAgo(22)),
      summary: "A solid week of building momentum. You focused on Groot development (webhook handler, memory system). Hit the gym 4 times and started running seriously — 3 km becoming comfortable. Had a great dinner with Priya at the new Italian place. Mood was generally positive with a dip mid-week during a 3-hour debugging session.",
      key_topics: ["Groot development", "gym", "running", "Priya", "debugging"],
      mood_trend: "good",
      insights: { "Productivity": "Most focused work between 10 AM - 2 PM", "Social": "Quality time with Priya and Mom this week", "Running": "3 km is a great base — slowly build to 5 km" },
    },
    {
      week_start: dateStr(daysAgo(21)),
      week_end: dateStr(daysAgo(15)),
      summary: "A mixed but productive week. Fixed the webhook handler and started the Garden redesign. Running improved to 5 km! But skipped gym twice. Had coffee with Rohan — great catching up. Launch deadline stress emerged. Finished Deep Work by Cal Newport — 3 books done for the year.",
      key_topics: ["Garden redesign", "5 km run", "Rohan", "launch deadline", "Deep Work"],
      mood_trend: "mixed",
      insights: { "Fitness": "Running up to 5 km, but gym consistency dropped — prioritize both", "Reading": "3 books in 6 weeks — you're ahead of the 24-book goal", "Stress": "Launch deadline causing anxiety — break it into smaller milestones" },
    },
    {
      week_start: dateStr(daysAgo(14)),
      week_end: dateStr(daysAgo(8)),
      summary: "Great week! The mood tracking feature is working. Consistent meditation (5/7 days — a personal best). Weight dropped to 80.5 kg. Productive 1:1 with Amit about auth refactor. Cooking more at home — dal, rice, even attempted paneer tikka. Financial awareness improving.",
      key_topics: ["mood tracking", "meditation", "weight loss", "Amit", "cooking", "paneer tikka"],
      mood_trend: "positive",
      insights: { "Health": "Weight at 80.5 kg — 1.5 kg down. Diet + exercise combo is working", "New habit": "Meditation 5/7 days — becoming consistent. This is a breakthrough", "Financial": "Home cooking saving ₹3000-4000/month. Budget goal is achievable" },
    },
    {
      week_start: dateStr(daysAgo(7)),
      week_end: dateStr(daysAgo(1)),
      summary: "A rollercoaster week ending on a high. Sprint completed on time — team morale is high. Some financial stress but you're addressing it. Priya's birthday planning is underway. Morning runs getting faster (4 km in 28 min). Explored PKM systems for Garden inspiration. Rohan's promotion celebration was fun. Ended with legendary biryani at Cafe Noorani.",
      key_topics: ["sprint completion", "Priya birthday planning", "morning runs", "PKM research", "Cafe Noorani", "Rohan promotion"],
      mood_trend: "good",
      insights: { "Running": "7 min/km pace — on track for half-marathon by June", "Work": "Sprint delivered on time, team confidence growing", "Upcoming": "Priya's birthday in 5 days — cake, flowers, and plan dinner", "Social": "Active social life this week — Rohan, Sneha, team dinner" },
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
        memories_count: randomInt(25, 45),
        messages_count: randomInt(50, 90),
      },
      { onConflict: "user_id,week_start" }
    );
  }
  console.log(`  ${weeklyReports.length} weekly reports inserted`);

  // 10. Sessions (~80+)
  console.log("\n🕐 Inserting sessions...");
  let sessionCount = 0;
  for (let day = 35; day >= 0; day--) {
    const dayOfWeek = daysAgo(day).getDay();
    const sessionsToday = (dayOfWeek === 0 || dayOfWeek === 6) ? randomInt(2, 4) : randomInt(1, 3);
    for (let s = 0; s < sessionsToday; s++) {
      const startDate = daysAgo(day);
      startDate.setHours(6 + s * 5 + randomInt(0, 3), randomInt(0, 59));
      const durationMin = randomInt(5, 45);
      const lastActivity = new Date(startDate.getTime() + durationMin * 60000);

      await supabase.from("sessions").insert({
        id: randomUUID(),
        user_id: userId,
        started_at: startDate.toISOString(),
        last_activity_at: lastActivity.toISOString(),
        message_count: randomInt(2, 12),
        is_active: day === 0 && s === sessionsToday - 1,
      });
      sessionCount++;
    }
  }
  console.log(`  ${sessionCount} sessions inserted`);

  // Summary
  console.log("\n✨ Seed complete!");
  console.log(`   Messages:  ${messageRows.length}`);
  console.log(`   Profiles:  ${profileFacts.length} facts`);
  console.log(`   Contacts:  ${contacts.length}`);
  console.log(`   Habits:    ${habitsData.length} (with checkins + streaks)`);
  console.log(`   Tasks:     ${tasks.length}`);
  console.log(`   Reminders: ${reminders.length}`);
  console.log(`   Reports:   ${weeklyReports.length}`);
  console.log(`   Sessions:  ${sessionCount}`);
  console.log("\nVisit /garden to see everything in action.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
