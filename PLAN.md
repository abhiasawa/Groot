# Groot - Detailed Implementation Plan

## What is Groot?

Groot is an AI Second Brain that lives on WhatsApp. You talk to it like a friend — it remembers everything, tracks your habits, sends you smart reminders, summarizes articles, and sends messages on your behalf. A web portal called "The Garden" lets you browse your memories, explore a knowledge graph, and track progress.

**No app like this exists today.** Pi has empathy but no second brain. Mem has organization but no WhatsApp. Groot combines both.

---

## Phase 1: Foundation ✅ COMPLETE

**Goal:** Next.js project + WhatsApp webhook + security baseline

**What was built:**
- Next.js 14 project with TypeScript strict mode, Tailwind CSS
- WhatsApp webhook handler (GET for Meta verification, POST for messages)
- Webhook signature validation using `crypto.timingSafeEqual`
- Message deduplication via `processed_messages` Supabase table
- WhatsApp client: send text, buttons, list messages, download media, mark as read
- Supabase clients: server-only (service role) + browser-safe (anon key)
- Pino structured logger
- Upstash Redis rate limiting middleware
- Zod environment variable validation
- Full database schema (14 tables) in version-controlled migration
- Health check endpoint

**Files:**
- `src/app/api/webhook/whatsapp/route.ts` — Webhook handler
- `src/lib/whatsapp/client.ts` — WhatsApp Cloud API client
- `src/lib/whatsapp/validation.ts` — Signature validation
- `src/lib/whatsapp/webhook-parser.ts` — Payload parser
- `src/lib/supabase/server.ts` — Server-only Supabase client
- `src/lib/supabase/client.ts` — Browser Supabase client
- `src/lib/env.ts` — Zod env validation
- `src/lib/logger.ts` — Pino logger
- `src/middleware.ts` — Rate limiting + auth guard
- `src/app/api/health/route.ts` — Health endpoint
- `src/types/whatsapp.ts` — WhatsApp types
- `supabase/migrations/001_initial_schema.sql` — Full schema

---

## Phase 2: Onboarding Flow

**Goal:** First-time user experience — 5 messages that establish personality, capture name + goal, teach a shortcut

**Steps:**
1. Create `src/lib/whatsapp/onboarding.ts` — State machine tracking onboarding progress per user
2. Create `src/lib/whatsapp/interactive.ts` — Helper for WhatsApp buttons and list messages
3. Add `onboarding_step` column to users table (already in schema)
4. Wire onboarding into webhook: new users get 5-message sequence, returning users get normal flow

**Onboarding sequence:**
1. "Hey, I'm Groot." — personality intro (4 lines)
2. "What should I call you?" — capture name
3. "What's one goal you're working on?" — capture first goal
4. Teach shortcut + prompt: "Try: *note: My current weight is 82kg*"
5. "Saved. Your first memory is planted." — confirmation

---

## Phase 3: Memory Engine

**Goal:** Dual-track memory (Supabase short-term + Supermemory long-term) + living user profile

**Steps:**
1. Create `src/lib/memory/supermemory-client.ts` — Add, search, list, delete memories via Supermemory SDK
2. Create `src/lib/memory/short-term.ts` — Store/retrieve last 20 messages from Supabase
3. Create `src/lib/memory/memory-router.ts` — Classify intent: store_memory | query_memory | habit_checkin | casual_chat | reflection | command
4. Create `src/lib/memory/profile-builder.ts` — Extract & upsert profile facts (static/dynamic/preference/goal)
5. Wire memory router into webhook pipeline

**Test:** "Remember my sister's name is Priya" → stored. "What's my sister's name?" → retrieves "Priya"

---

## Phase 4: Multi-Modal Processing

**Goal:** Handle WhatsApp voice notes (Whisper) and images (Claude Vision)

**Steps:**
1. Create `src/lib/media/media-handler.ts` — Download WhatsApp media, route to correct processor
2. Integrate with provider layer (built in Phase 5) for transcription and vision
3. Update webhook to handle `audio` and `image` message types

**Test:** Send voice note → get transcription-based reply. Send screenshot → get OCR text.

---

## Phase 5: Intelligence (Groot Persona + Provider Abstraction)

**Goal:** Full Claude-powered responses with Groot personality, swappable AI providers

**Steps:**
1. Create provider interfaces in `src/lib/providers/types.ts`:
   - `LLMProvider.generateResponse(system, messages) → {text, metadata}`
   - `VisionProvider.analyzeImage(buffer, mimeType, prompt) → {description, text, category}`
   - `TranscriptionProvider.transcribe(buffer, mimeType) → {text, language, duration}`
   - `TTSProvider.synthesize(text, voice?) → Buffer`
2. Implement Claude provider (`src/lib/providers/llm/anthropic.ts`)
3. Implement OpenAI provider (`src/lib/providers/llm/openai.ts`)
4. Create factory with fallback chain + circuit breaker (`src/lib/providers/llm/index.ts`)
5. Create Groot persona system prompt (`src/lib/ai/persona.ts`)
6. Create context builder (`src/lib/ai/context-builder.ts`) — assembles profile + memories + messages + habits
7. Create Groot engine (`src/lib/ai/groot-engine.ts`) — generates responses + extracts metadata
8. Replace echo handler in webhook with full pipeline

**Test:** Send "Hey Groot, how are you?" → warm, in-character response. "Remember I'm allergic to peanuts" → stored + profile updated.

---

## Phase 6: Habits & Proactive System

**Goal:** Habit tracking with streaks, morning check-ins (8 AM), weekly Groot Report (Sunday 10 AM)

**Steps:**
1. Create `src/lib/habits/tracker.ts` — CRUD for habits, check-ins, streaks
2. Create `src/lib/habits/bare-number-parser.ts` — Detect bare numbers in context (e.g., `80.2` → weight)
3. Create `src/lib/proactive/scheduler.ts` — De-escalation engine (pause after 3 no-replies)
4. Create `src/app/api/cron/daily-checkin/route.ts` — 8 AM IST morning message
5. Create `src/app/api/cron/weekly-report/route.ts` — Sunday 10 AM synthesis
6. Create `src/lib/reports/weekly-synthesis.ts` — Generate personalized "Groot Report"

**Streak milestones:** Celebrate at Day 3, 7, 14, 21, 30, 50, 100 only.
**De-escalation:** After 3 no-replies, offer `[Keep Daily] [Weekly Only] [Pause for Now]`.

---

## Phase 7: Send Messages on My Behalf

**Goal:** Groot sends WhatsApp messages to other people at the owner's command

**Steps:**
1. Create `src/lib/contacts/manager.ts` — CRUD for contacts list
2. Create `src/lib/whatsapp/outbound.ts` — Send to third-party numbers
3. Add `send_message` intent to memory router
4. Confirmation flow: always preview + `[Send Now] [Edit] [Cancel]` buttons
5. For unknown contacts: ask for number, store, then confirm

**Safety:** Never auto-send. Always show preview. Log as `direction = 'outbound_proxy'`.

---

## Phase 8: Quick Capture Shortcuts

**Goal:** `todo:`, `idea:`, `note:`, `remind:` prefix commands for instant capture

**Steps:**
1. Create `src/lib/capture/shortcut-parser.ts` — Detect and parse prefixes
2. Create `src/lib/capture/task-manager.ts` — CRUD for tasks
3. Wire shortcut parser BEFORE intent classifier (skip AI for faster response)

**Test:** "todo: buy milk" → "Got it, added to your tasks."

---

## Phase 9: Link Saving & Summarization

**Goal:** Share a URL → Groot fetches, summarizes, stores in second brain

**Steps:**
1. Create `src/lib/capture/link-processor.ts` — URL detection, fetch, extract with `@mozilla/readability`
2. Create `src/lib/capture/summarizer.ts` — Generate 3-5 bullet summary via LLMProvider
3. Store summary + URL in Supermemory with `type=article`

**Test:** Share a blog URL → "_Reading that article now..._" → 3-5 bullet summary.

---

## Phase 10: Smart Reminders

**Goal:** Auto-detect dates/events in messages, send contextual reminders

**Steps:**
1. Create `src/lib/reminders/detector.ts` — Extract dates from Claude metadata
2. Create `src/lib/reminders/scheduler.ts` — CRUD, query upcoming
3. Create `src/app/api/cron/reminders/route.ts` — Hourly cron to check and send
4. Reminders include relevant memories for context

**Test:** "Meeting with investors Friday at 2 PM" → Friday 1 PM: contextual reminder.

---

## Phase 11: Voice Responses (TTS)

**Goal:** Groot replies with voice notes (opt-in, default text-only)

**Steps:**
1. Create `src/lib/providers/tts/openai.ts` — OpenAI TTS implementation
2. Create `src/lib/whatsapp/voice-reply.ts` — Upload audio to WhatsApp media API
3. Toggle: "Groot, reply with voice" / "Groot, text only"

---

## Phase 12: Daily Reflection & Journaling

**Goal:** 9 PM IST context-aware reflection prompts

**Steps:**
1. Create `src/app/api/cron/evening-reflection/route.ts` — 9 PM cron
2. Create `src/lib/journal/prompt-generator.ts` — Rotating, context-aware prompts
3. Store reflections as memories with `type=journal`

---

## Phase 13: Web Portal ("The Garden")

**Goal:** Authenticated mobile-first dashboard with memories, knowledge graph, habits, reports

**Design:**
- Colors: warm off-white (#FAFAF7) background, forest green (#2D5F3B) primary, amber (#D4A843) accent
- Typography: Inter + JetBrains Mono
- Mobile-first: bottom nav, FAB for quick-log, 44px touch targets
- Dark mode from day 1 (deep greens #1A2E1F, not pure black)

**Steps:**
1. Create login page with Supabase Auth (magic link)
2. Create sidebar (desktop) + bottom nav (mobile)
3. Home dashboard: greeting, streaks, recent memories, upcoming reminders
4. Memory list: unified feed with type-specific cards, filter bar, semantic search
5. Knowledge graph: force-directed with tap-to-preview, cluster view
6. Habit dashboard: streak counters, trend chart, GitHub-style heatmap
7. Reports: scrollable weekly report cards
8. Settings: notification preferences, privacy controls, data export
9. Empty states with botanical illustrations

---

## Database Schema

**14 tables across 3 categories:**

**Core:** users, user_profile, messages, sessions
**Features:** habits, habit_checkins, habit_streaks, weekly_reports, contacts, tasks, reminders
**Operational:** processed_messages, api_usage, message_queue

Full schema: `supabase/migrations/001_initial_schema.sql`

---

## API Keys Required

1. **Meta WhatsApp Cloud API** — developers.facebook.com (free, 1000 conversations/month)
2. **Anthropic** — console.anthropic.com
3. **OpenAI** — platform.openai.com (for Whisper + TTS)
4. **Supermemory** — supermemory.ai
5. **Supabase** — supabase.com (free tier)
6. **Upstash** — upstash.com (free tier for Redis + QStash)
