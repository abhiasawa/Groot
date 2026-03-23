import test from "node:test";
import assert from "node:assert/strict";
import {
  USER_TIMEZONE,
  getTodayIST,
  getTodayBoundaryIST,
} from "../src/lib/utils/timezone.ts";

test("USER_TIMEZONE is Asia/Kolkata", () => {
  assert.equal(USER_TIMEZONE, "Asia/Kolkata");
});

test("getTodayIST returns a YYYY-MM-DD string", () => {
  const result = getTodayIST();
  assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});

test("getTodayBoundaryIST returns a Date at midnight IST", () => {
  const boundary = getTodayBoundaryIST();
  assert.ok(boundary instanceof Date);
  assert.ok(!isNaN(boundary.getTime()));
  // The boundary should be within 24h of now
  const diff = Math.abs(Date.now() - boundary.getTime());
  assert.ok(diff < 24 * 60 * 60 * 1000, "boundary should be within 24h of now");
});
