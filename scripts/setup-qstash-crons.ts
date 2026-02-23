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

interface QStashSchedule {
  scheduleId: string;
  destination: { url: string };
}

async function listExistingSchedules(): Promise<QStashSchedule[]> {
  const res = await fetch("https://qstash.upstash.io/v2/schedules", {
    headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
  });
  if (!res.ok) {
    console.error("Failed to list schedules:", await res.text());
    return [];
  }
  return res.json() as Promise<QStashSchedule[]>;
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

  const data = (await res.json()) as { scheduleId: string };
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
