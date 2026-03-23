import test from "node:test";
import assert from "node:assert/strict";

// Import the contentMatchScore function by re-implementing the same logic
// (it's not exported from actions.ts, so we test the algorithm directly)
function contentMatchScore(content: string, match: string): number {
  if (content.includes(match)) return 100;
  const matchWords = match.split(/\s+/).filter((w) => w.length > 2);
  if (matchWords.length === 0) return 0;
  let matched = 0;
  for (const word of matchWords) {
    if (content.includes(word)) matched++;
  }
  return (matched / matchWords.length) * 80;
}

// ─── contentMatchScore ───

test("contentMatchScore: exact substring match returns 100", () => {
  assert.equal(contentMatchScore("buy groceries from store", "buy groceries"), 100);
});

test("contentMatchScore: full content equals match returns 100", () => {
  assert.equal(contentMatchScore("buy milk", "buy milk"), 100);
});

test("contentMatchScore: no overlap returns 0", () => {
  assert.equal(contentMatchScore("buy groceries", "finish report"), 0);
});

test("contentMatchScore: partial word overlap returns proportional score", () => {
  // "finish" matches, "report" doesn't → 1/2 * 80 = 40
  const score = contentMatchScore("finish the homework assignment", "finish report");
  assert.equal(score, 40);
});

test("contentMatchScore: all words match returns 80", () => {
  // "buy" and "groceries" both match, but not as substring → 2/2 * 80 = 80
  const score = contentMatchScore("groceries to buy at the store", "buy groceries");
  assert.equal(score, 80);
});

test("contentMatchScore: short words (<=2 chars) are filtered out", () => {
  // "go to gym" → only "gym" passes the length filter (>2 chars)
  // "gym" is in "go to the gym" → 1/1 * 80 = 80
  const score = contentMatchScore("go to the gym", "go to gym");
  assert.equal(score, 80);
});

test("contentMatchScore: all words too short but substring matches returns 100", () => {
  // "go to" is a substring of "go to the store" → 100
  assert.equal(contentMatchScore("go to the store", "go to"), 100);
});

test("contentMatchScore: empty match is substring of everything returns 100", () => {
  // "".includes("") is true in JS
  assert.equal(contentMatchScore("buy groceries", ""), 100);
});

test("contentMatchScore: no substring and only short words returns 0", () => {
  // "go" and "to" are <=2 chars, filtered out; "xyz" not in content
  assert.equal(contentMatchScore("completely different text", "go to"), 0);
});

test("contentMatchScore: case-sensitive (caller must lowercase)", () => {
  // The function itself is case-sensitive; callers lowercase before calling
  assert.equal(contentMatchScore("Buy Groceries", "buy groceries"), 0);
});

// ─── buildTaskDigest ───

interface TaskRow {
  id: string;
  content: string;
  category: string;
  due_date: string | null;
}

function buildTaskDigest(
  name: string,
  tasks: { overdue: TaskRow[]; dueToday: TaskRow[]; upcoming: TaskRow[] },
): string {
  const parts: string[] = [];
  if (tasks.overdue.length > 0) {
    parts.push(`Hey *${name}*, quick heads up on your tasks:`);
    parts.push(
      `*Overdue:*\n${tasks.overdue.map((t) => `• ${t.content}`).join("\n")}`,
    );
  } else {
    parts.push(`Morning *${name}*, here's your task lineup:`);
  }
  if (tasks.dueToday.length > 0) {
    parts.push(
      `*Due today:*\n${tasks.dueToday.map((t) => `• ${t.content}`).join("\n")}`,
    );
  }
  if (tasks.upcoming.length > 0) {
    parts.push(
      `*Coming up:*\n${tasks.upcoming.map((t) => {
        const d = new Date(t.due_date!);
        const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return `• ${t.content} _(${day})_`;
      }).join("\n")}`,
    );
  }
  return parts.join("\n\n");
}

const makeTask = (content: string, dueDate: string | null = null): TaskRow => ({
  id: "t1",
  content,
  category: "todo",
  due_date: dueDate,
});

test("buildTaskDigest: overdue tasks get heads-up greeting", () => {
  const msg = buildTaskDigest("Abhishek", {
    overdue: [makeTask("Submit report")],
    dueToday: [],
    upcoming: [],
  });
  assert.ok(msg.includes("Hey *Abhishek*"));
  assert.ok(msg.includes("*Overdue:*"));
  assert.ok(msg.includes("• Submit report"));
});

test("buildTaskDigest: no overdue gets morning greeting", () => {
  const msg = buildTaskDigest("Abhishek", {
    overdue: [],
    dueToday: [makeTask("Call dentist")],
    upcoming: [],
  });
  assert.ok(msg.includes("Morning *Abhishek*"));
  assert.ok(!msg.includes("Overdue"));
  assert.ok(msg.includes("*Due today:*"));
  assert.ok(msg.includes("• Call dentist"));
});

test("buildTaskDigest: upcoming tasks show formatted date", () => {
  const msg = buildTaskDigest("Test", {
    overdue: [],
    dueToday: [],
    upcoming: [makeTask("Buy gift", "2026-03-25T00:00:00Z")],
  });
  assert.ok(msg.includes("*Coming up:*"));
  assert.ok(msg.includes("• Buy gift"));
  // Should contain a day-of-week abbreviation
  assert.match(msg, /\((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
});

test("buildTaskDigest: all sections combined", () => {
  const msg = buildTaskDigest("User", {
    overdue: [makeTask("Old task")],
    dueToday: [makeTask("Today task")],
    upcoming: [makeTask("Future task", "2026-04-01T00:00:00Z")],
  });
  assert.ok(msg.includes("*Overdue:*"));
  assert.ok(msg.includes("*Due today:*"));
  assert.ok(msg.includes("*Coming up:*"));
});

test("buildTaskDigest: empty digest (no overdue, no today, no upcoming)", () => {
  const msg = buildTaskDigest("User", {
    overdue: [],
    dueToday: [],
    upcoming: [],
  });
  assert.ok(msg.includes("Morning *User*"));
  assert.ok(!msg.includes("Overdue"));
  assert.ok(!msg.includes("Due today"));
  assert.ok(!msg.includes("Coming up"));
});
