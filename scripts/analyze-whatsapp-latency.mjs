#!/usr/bin/env node
import fs from "node:fs";

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarize(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    min: sorted[0],
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
    avg: Number((sum / values.length).toFixed(1)),
  };
}

function printSummary(label, stats) {
  if (!stats) {
    console.log(`${label}: no data`);
    return;
  }
  console.log(
    `${label}: count=${stats.count} min=${stats.min} p50=${stats.p50} p90=${stats.p90} p95=${stats.p95} max=${stats.max} avg=${stats.avg}`,
  );
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/analyze-whatsapp-latency.mjs <vercel-logs.jsonl>");
  process.exit(1);
}

const raw = fs.readFileSync(filePath, "utf8");
const lines = raw.split("\n").filter(Boolean);

const dedupe = new Set();
const webhookAcceptedMs = [];
const llmMs = [];
const contextMs = [];
const inputTokens = [];
const outputTokens = [];
const summaryTotalMs = [];
const summarySendMs = [];
const summaryOutcome = new Map();
const events = [];

for (const line of lines) {
  let outer;
  try {
    outer = JSON.parse(line);
  } catch {
    continue;
  }

  if (typeof outer?.message !== "string" || !outer.message.startsWith("{")) {
    continue;
  }

  let inner;
  try {
    inner = JSON.parse(outer.message);
  } catch {
    continue;
  }

  const msg = inner?.msg;
  const time = inner?.time;
  if (typeof msg !== "string" || typeof time !== "number") {
    continue;
  }

  const key = `${time}:${msg}`;
  if (dedupe.has(key)) continue;
  dedupe.add(key);
  events.push({ time, msg });

  if (msg === "Webhook accepted" && typeof inner.latencyMs === "number") {
    webhookAcceptedMs.push(inner.latencyMs);
  }
  if (msg === "Groot response generated") {
    if (typeof inner.llmMs === "number") llmMs.push(inner.llmMs);
    if (typeof inner.contextMs === "number") contextMs.push(inner.contextMs);
    if (typeof inner.inputTokens === "number") inputTokens.push(inner.inputTokens);
    if (typeof inner.outputTokens === "number") outputTokens.push(inner.outputTokens);
  }
  if (msg === "Message latency summary") {
    if (typeof inner.totalMs === "number") summaryTotalMs.push(inner.totalMs);
    if (typeof inner.sendWhatsAppMs === "number") summarySendMs.push(inner.sendWhatsAppMs);
    if (typeof inner.outcome === "string") {
      summaryOutcome.set(inner.outcome, (summaryOutcome.get(inner.outcome) ?? 0) + 1);
    }
  }
}

console.log(`Parsed lines: ${lines.length}`);
console.log(`Unique structured events: ${dedupe.size}`);
printSummary("Webhook accepted latency (ms)", summarize(webhookAcceptedMs));
printSummary("LLM latency (ms)", summarize(llmMs));
printSummary("Context build latency (ms)", summarize(contextMs));
printSummary("Pipeline total latency (ms)", summarize(summaryTotalMs));
printSummary("WhatsApp send call latency (ms)", summarize(summarySendMs));
printSummary("Input tokens", summarize(inputTokens));
printSummary("Output tokens", summarize(outputTokens));

if (summaryOutcome.size > 0) {
  console.log("Outcomes:");
  for (const [outcome, count] of [...summaryOutcome.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${outcome}: ${count}`);
  }
}

const acceptToLlm = [];
let lastWebhookAcceptedAt = null;
for (const event of events.sort((a, b) => a.time - b.time)) {
  if (event.msg === "Webhook accepted") {
    lastWebhookAcceptedAt = event.time;
    continue;
  }
  if (event.msg === "Groot response generated" && lastWebhookAcceptedAt !== null) {
    acceptToLlm.push(event.time - lastWebhookAcceptedAt);
  }
}
printSummary("Accepted -> LLM generated delta (ms)", summarize(acceptToLlm));
