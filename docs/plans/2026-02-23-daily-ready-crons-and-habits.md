# Daily-Ready: Cron Jobs, Mid-Day Nudge & Fresh Start

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up all cron scheduling via Upstash QStash, add a mid-day nudge endpoint, update schedule times (9 AM / 2 PM / 9 PM), auto-seed starter habits on first message, and provide a database reset SQL script for a fresh start.

**Architecture:** QStash calls our existing cron HTTP endpoints on an hourly schedule. The timezone-aware `isWithinScheduleWindow()` function gates actual sends. A new mid-day nudge cron endpoint sends a light "What's on your mind?" message at 2 PM. Post-onboarding logic in `getOrCreateUser` seeds 3 starter habits (Journal, Fitness, Reading) for new users.

**Tech Stack:** Upstash QStash (free tier), Next.js API routes, Supabase SQL

---

### Task 1: Install @upstash/qstash dependency

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `npm install @upstash/qstash`

**Step 2: Verify installation**

Run: `grep qstash package.json`
Expected: `"@upstash/qstash": "^X.Y.Z"` appears in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @upstash/qstash dependency for cron scheduling"
```

---

### Task 2: Add QStash env vars to .env.example and env.ts

**Files:**
- Modify: `.env.example`
- Modify: `src/lib/env.ts`

**Step 1: Add QStash section to .env.example**

Add after the Upstash Redis section (line 28):

```
# ─── Upstash QStash (Cron Scheduling) ───
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key
```

**Step 2: Add QStash vars to env.ts Zod schema**

Add these optional fields to the `envSchema` object in `src/lib/env.ts`:

```typescript
// QStash (optional — cron scheduling disabled without it)
QSTASH_TOKEN: z.string().optional(),
QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
```

**Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add .env.example src/lib/env.ts
git commit -m "chore: add QStash env vars for cron scheduling"
```

---

### Task 3: Update schedule times (9 AM morning, 2 PM midday, 9 PM evening)

**Files:**
- Modify: `src/lib/proactive/scheduler.ts`

**Step 1: Update isWithinScheduleWindow function**

In `src/lib/proactive/scheduler.ts`, change the `isWithinScheduleWindow` function to support the new `midday_nudge` message type and update morning time:

Change the function signature and body:

```typescript
function isWithinScheduleWindow(
  timezone: string | null,
  messageType: "morning_checkin" | "midday_nudge" | "evening_reflection" | "weekly_report",
  now: Date,
): boolean {
  const tz = timezone || "UTC";

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      weekday: "short",
      hour12: false,
    }).formatToParts(now);

    const hourPart = parts.find((p) => p.type === "hour")?.value;
    const weekdayPart = parts.find((p) => p.type === "weekday")?.value;
    const hour = hourPart ? parseInt(hourPart, 10) : -1;

    if (messageType === "morning_checkin") {
      return hour === 9;
    }

    if (messageType === "midday_nudge") {
      return hour === 14;
    }

    if (messageType === "evening_reflection") {
      return hour === 21;
    }

    if (messageType === "weekly_report") {
      return weekdayPart === "Sun" && hour === 10;
    }

    return false;
  } catch (error) {
    logger.warn({ error, timezone: tz }, "Invalid timezone for user, falling back to UTC schedule");
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();

    if (messageType === "morning_checkin") return utcHour === 9;
    if (messageType === "midday_nudge") return utcHour === 14;
    if (messageType === "evening_reflection") return utcHour === 21;
    if (messageType === "weekly_report") return utcDay === 0 && utcHour === 10;
    return false;
  }
}
```

**Step 2: Update getEligibleUsers to accept midday_nudge**

Change the `messageType` parameter type in `getEligibleUsers`:

```typescript
export async function getEligibleUsers(
  messageType: "morning_checkin" | "midday_nudge" | "evening_reflection" | "weekly_report",
): Promise<UserProactiveState[]> {
```

Inside the function, add midday_nudge handling alongside morning_checkin for the de-escalation check. After line 81 (`if (messageType === "evening_reflection" && daysSinceResponse >= 2) continue;`), add:

```typescript
    // Mid-day nudge: skip if user hasn't responded in 1+ days (lighter threshold)
    if (messageType === "midday_nudge" && daysSinceResponse >= 1) {
      continue;
    }
```

**Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/proactive/scheduler.ts
git commit -m "feat: update schedule times to 9AM/2PM/9PM, add midday_nudge support"
```

---

### Task 4: Create mid-day nudge cron endpoint

**Files:**
- Create: `src/app/api/cron/midday-nudge/route.ts`

**Step 1: Create the midday nudge endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getEligibleUsers } from "@/lib/proactive/scheduler";
import { sendMessage, getUserPlatform } from "@/lib/messaging/dispatcher";
import { logger } from "@/lib/logger";

const MIDDAY_PROMPTS = [
  "What's happening today?",
  "Anything on your mind right now?",
  "How's your day going so far?",
  "What are you working on today?",
  "Quick thought dump — what's top of mind?",
  "Anything worth remembering from today so far?",
  "How's the energy today?",
  "What's one thing you've done today that matters?",
];

/**
 * Mid-day nudge cron — 2 PM user local time.
 * Light prompt to capture thoughts during the day.
 * Protected by CRON_SECRET Bearer token.
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    logger.error("CRON_SECRET is missing");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await getEligibleUsers("midday_nudge");
    let sent = 0;

    for (const user of users) {
      try {
        const { platform, platformId } = getUserPlatform(user);
        const name = user.display_name ?? "there";
        const prompt = MIDDAY_PROMPTS[Math.floor(Math.random() * MIDDAY_PROMPTS.length)]!;

        await sendMessage(
          platform,
          platformId,
          `Hey ${name} — ${prompt.toLowerCase()}`,
        );
        sent++;
      } catch (error) {
        logger.error({ error, userId: user.id }, "Failed to send midday nudge");
      }
    }

    logger.info({ sent, total: users.length }, "Midday nudge complete");
    return NextResponse.json({ sent, total: users.length });
  } catch (error) {
    logger.error({ error }, "Midday nudge cron failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/cron/midday-nudge/route.ts
git commit -m "feat: add mid-day nudge cron endpoint (2 PM local time)"
```

---

### Task 5: Create QStash cron setup script

**Files:**
- Create: `scripts/setup-qstash-crons.ts`

**Step 1: Create the setup script**

```typescript
/**
 * One-time QStash cron schedule setup.
 *
 * Usage:
 *   npx tsx scripts/setup-qstash-crons.ts
 *
 * Required env vars:
 *   QSTASH_TOKEN — from Upstash QStash dashboard
 *   NEXT_PUBLIC_APP_URL — your Vercel deployment URL
 *   CRON_SECRET — the Bearer token for cron endpoint auth
 */

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const CRON_SECRET = process.env.CRON_SECRET;

if (!QSTASH_TOKEN || !APP_URL || !CRON_SECRET) {
  console.error("Missing required env vars: QSTASH_TOKEN, NEXT_PUBLIC_APP_URL, CRON_SECRET");
  process.exit(1);
}

const SCHEDULES = [
  {
    name: "Morning Check-in",
    endpoint: "/api/cron/daily-checkin",
    cron: "0 * * * *", // Every hour — timezone logic gates the send
  },
  {
    name: "Mid-day Nudge",
    endpoint: "/api/cron/midday-nudge",
    cron: "0 * * * *",
  },
  {
    name: "Evening Reflection",
    endpoint: "/api/cron/evening-reflection",
    cron: "0 * * * *",
  },
  {
    name: "Weekly Report",
    endpoint: "/api/cron/weekly-report",
    cron: "0 * * * 0", // Every hour on Sundays
  },
  {
    name: "Hourly Reminders",
    endpoint: "/api/cron/reminders",
    cron: "0 * * * *",
  },
];

async function listExistingSchedules(): Promise<Array<{ scheduleId: string; destination: { url: string } }>> {
  const res = await fetch("https://qstash.upstash.io/v2/schedules", {
    headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
  });
  if (!res.ok) {
    console.error("Failed to list schedules:", await res.text());
    return [];
  }
  return res.json();
}

async function deleteSchedule(scheduleId: string): Promise<void> {
  const res = await fetch(`https://qstash.upstash.io/v2/schedules/${scheduleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
  });
  if (!res.ok) {
    console.error(`Failed to delete schedule ${scheduleId}:`, await res.text());
  }
}

async function createSchedule(schedule: (typeof SCHEDULES)[number]): Promise<void> {
  const url = `${APP_URL}${schedule.endpoint}`;

  const res = await fetch("https://qstash.upstash.io/v2/schedules", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      "Content-Type": "application/json",
      "Upstash-Cron": schedule.cron,
      "Upstash-Forward-Authorization": `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({ destination: url }),
  });

  if (!res.ok) {
    console.error(`Failed to create schedule "${schedule.name}":`, await res.text());
    return;
  }

  const data = await res.json();
  console.log(`  Created: ${schedule.name} → ${url} (${schedule.cron}) [ID: ${data.scheduleId}]`);
}

async function main() {
  console.log("QStash Cron Setup for Groot");
  console.log(`App URL: ${APP_URL}`);
  console.log("");

  // Delete existing Groot schedules
  console.log("Checking for existing schedules...");
  const existing = await listExistingSchedules();
  const grootSchedules = existing.filter((s) =>
    s.destination?.url?.includes("/api/cron/"),
  );

  if (grootSchedules.length > 0) {
    console.log(`Found ${grootSchedules.length} existing Groot schedules, removing...`);
    for (const s of grootSchedules) {
      await deleteSchedule(s.scheduleId);
      console.log(`  Deleted: ${s.destination.url}`);
    }
  }

  // Create new schedules
  console.log("\nCreating schedules...");
  for (const schedule of SCHEDULES) {
    await createSchedule(schedule);
  }

  console.log("\nDone! All cron schedules registered with QStash.");
  console.log("Verify at: https://console.upstash.com/qstash");
}

main().catch(console.error);
```

**Step 2: Verify it parses correctly**

Run: `npx tsx --version`
Expected: tsx version output (already available via Next.js toolchain)

**Step 3: Commit**

```bash
git add scripts/setup-qstash-crons.ts
git commit -m "feat: add QStash cron setup script for all 5 scheduled jobs"
```

---

### Task 6: Seed starter habits on first message (post-onboarding)

**Files:**
- Modify: `src/lib/whatsapp/onboarding.ts`

**Step 1: Add starter habit seeding to getOrCreateUser**

After the new user is created (line 64, after the `logger.info` for "New user created"), add habit seeding logic:

```typescript
  // Seed starter habits for new users
  try {
    const { createHabit } = await import("@/lib/habits/tracker");
    await Promise.allSettled([
      createHabit(newUser.id, "Daily Journal", {
        description: "Write or voice-note your thoughts for the day",
        category: "wellness",
        frequency: "daily",
      }),
      createHabit(newUser.id, "Fitness — Weight", {
        description: "Log your daily weight",
        category: "fitness",
        targetUnit: "kg",
        frequency: "daily",
      }),
      createHabit(newUser.id, "Reading", {
        description: "Track pages read per day",
        category: "learning",
        targetUnit: "pages",
        frequency: "daily",
      }),
    ]);
    logger.info({ userId: newUser.id }, "Starter habits seeded");
  } catch (error) {
    logger.warn({ error, userId: newUser.id }, "Failed to seed starter habits (non-critical)");
  }
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/whatsapp/onboarding.ts
git commit -m "feat: auto-seed 3 starter habits (Journal, Weight, Reading) for new users"
```

---

### Task 7: Create database reset SQL script

**Files:**
- Create: `scripts/reset-database.sql`

**Step 1: Write the reset SQL**

```sql
-- Groot Database Reset Script
-- Run this in Supabase SQL Editor to wipe ALL data for a fresh start.
-- WARNING: This deletes everything including user records.
-- After running this, your first message to Groot will re-onboard you.

-- Disable triggers temporarily for clean truncation
SET session_replication_role = 'replica';

-- Truncate all data tables (order matters due to foreign keys)
TRUNCATE TABLE memory_links CASCADE;
TRUNCATE TABLE habit_checkins CASCADE;
TRUNCATE TABLE habit_streaks CASCADE;
TRUNCATE TABLE habits CASCADE;
TRUNCATE TABLE weekly_reports CASCADE;
TRUNCATE TABLE reminders CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE contacts CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE processed_messages CASCADE;
TRUNCATE TABLE api_usage CASCADE;
TRUNCATE TABLE message_queue CASCADE;
TRUNCATE TABLE user_profile CASCADE;
TRUNCATE TABLE users CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify: should return 0 rows for each
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'habits', COUNT(*) FROM habits
UNION ALL SELECT 'reminders', COUNT(*) FROM reminders
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks;
```

**Step 2: Commit**

```bash
git add scripts/reset-database.sql
git commit -m "chore: add database reset SQL script for fresh start"
```

---

### Task 8: Add vercel.json with daily heartbeat cron (backup)

**Files:**
- Create: `vercel.json`

**Step 1: Create vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-checkin",
      "schedule": "30 3 * * *"
    }
  ]
}
```

This is a backup daily cron at 3:30 AM UTC (9 AM IST) in case QStash has issues. The main scheduling runs through QStash hourly.

**Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel.json with daily backup cron"
```

---

### Task 9: Type check and build verification

**Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Lint check**

Run: `npm run lint`
Expected: No errors (or only pre-existing warnings)

**Step 3: Run tests**

Run: `npm test`
Expected: All existing tests pass

**Step 4: Build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 10: Final commit and deployment instructions

**Step 1: Check for any unstaged changes**

Run: `git status`
Expected: Clean working tree (all committed)

**Step 2: Document deployment steps**

After deployment, the user needs to:

1. **Add env vars to Vercel:**
   - `QSTASH_TOKEN` — from Upstash QStash dashboard
   - `QSTASH_CURRENT_SIGNING_KEY` — from QStash dashboard > Signing Keys
   - `QSTASH_NEXT_SIGNING_KEY` — from QStash dashboard > Signing Keys

2. **Deploy to Vercel** (push to main or deploy)

3. **Run QStash setup:**
   ```bash
   npx tsx scripts/setup-qstash-crons.ts
   ```

4. **Run database reset** (in Supabase SQL Editor):
   - Copy contents of `scripts/reset-database.sql`
   - Paste and run in Supabase SQL Editor

5. **Clear Supermemory** (if configured):
   - Log into Supermemory dashboard and delete all memories, OR
   - The system will naturally start fresh since no user ID will match old data

6. **Send first message** to Groot on WhatsApp or Telegram:
   - This triggers re-onboarding
   - 3 starter habits are auto-created
   - Morning check-in arrives at 9 AM next day
   - Mid-day nudge at 2 PM
   - Evening reflection at 9 PM
