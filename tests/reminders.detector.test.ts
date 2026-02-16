import test from "node:test";
import assert from "node:assert/strict";
import { parseReminderText } from "../src/lib/reminders/detector.ts";

test("parseReminderText parses relative reminders", () => {
  const parsed = parseReminderText("call dentist in 2 hours");
  assert.ok(parsed);
  assert.equal(parsed.content, "call dentist");
  assert.equal(parsed.rawTimeRef, "in 2 hours");
});

test("parseReminderText requires a recognizable time expression", () => {
  const parsed = parseReminderText("call dentist soon");
  assert.equal(parsed, null);
});
