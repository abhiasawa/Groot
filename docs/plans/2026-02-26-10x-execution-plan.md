# Groot 10x Execution Plan

**Date:** 2026-02-26
**Status:** Draft
**Scope:** Mobile App + WhatsApp + Web Portal (Telegram removed)

---

## Table of Contents

1. [Sprint 0: Cleanup & Foundation](#sprint-0)
2. [Sprint 1: The Evening Ritual (Core Loop)](#sprint-1)
3. [Sprint 2: Morning Callback & Contextual Check-ins](#sprint-2)
4. [Sprint 3: Mobile App Redesign — "Today" Screen](#sprint-3)
5. [Sprint 4: Unified Design Language — "Living Earth"](#sprint-4)
6. [Sprint 5: The Garden Visualization (Mobile)](#sprint-5)
7. [Sprint 6: "Your Week in 3 Moments" (Replace Weekly Report)](#sprint-6)
8. [Sprint 7: Mirror Screen (Self-Understanding)](#sprint-7)
9. [Sprint 8: Web Portal Alignment](#sprint-8)
10. [Sprint 9: Voice-First Features](#sprint-9)
11. [Sprint 10: Onboarding Flow](#sprint-10)

---

## <a id="sprint-0"></a>Sprint 0: Cleanup & Foundation (Days 1-3)

**Goal:** Remove Telegram, deprioritize commodity features, clean up navigation.

### Task 0.1: Remove Telegram Integration

**Why:** Focus on 3 surfaces only — WhatsApp, Mobile App, Web Portal.

**Files to delete:**
- `src/lib/telegram/client.ts` — Telegram Bot API wrapper
- `src/lib/telegram/webhook-parser.ts` — Telegram update parser
- `src/app/api/webhook/telegram/route.ts` — Telegram webhook endpoint

**Files to modify:**
- `src/lib/messaging/dispatcher.ts` — Remove Telegram routing from `sendMessage()`, `sendButtons()`, `sendImage()`. Keep only WhatsApp + mobile paths.
- `src/lib/proactive/scheduler.ts` (~273 lines) — Remove `telegram_chat_id` references from `getEligibleUsers()` and `getUserPlatform()`. Simplify platform detection to WhatsApp-only for messaging.
- `src/lib/whatsapp/onboarding.ts` (~96 lines) — Remove `telegram_chat_id` from `UserRecord` interface and `getOrCreateUser()`.
- `src/lib/reminders/scheduler.ts` — Remove Telegram dispatch path.
- `src/lib/env.ts` — Remove `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` validation.
- `src/types/whatsapp.ts` — Remove `"telegram"` from `Platform` type. Rename type to `Platform = "whatsapp"`.
- `.env.local` — No Telegram env vars exist currently, so no change needed.

**Estimated changes:** ~7 files modified, ~3 files deleted.

### Task 0.2: Hide Commodity Features from Navigation

**Why:** Tasks, People, Topics, Link Capture dilute focus. Don't delete code — just hide from UI.

**Mobile — Hide from tab bar and navigation:**
- `mobile/app/(tabs)/_layout.tsx` (~88 lines) — Remove "Tasks" tab from the `Tabs` component. Keep Journal, Pulse, Settings + FAB. Reduce to 3 visible tabs + FAB.
- `mobile/app/(tabs)/more.tsx` (~199 lines) — Remove "Topics" link from the More menu. Keep Stories, Mood, Profile only.
- `mobile/app/tasks.tsx` (~836 lines) — Keep file but remove any navigation to it from main flows.

**Web — Hide from sidebar:**
- `src/components/garden/sidebar.tsx` (~106 lines) — Remove these items from the sidebar navigation array:
  - Tasks (`/garden/tasks`)
  - People (`/garden/people`)
  - Topics (`/garden/topics`)
  Keep: Home, Journal, Habits, Stories, Mood, Insights, Profile, Settings.

**Backend — Disable link capture processing:**
- `src/lib/memory/memory-router.ts` — Change `link_share` intent to fall through to `casual_chat` (Groot still responds to links, just doesn't auto-summarize them).

**Estimated changes:** ~4 files modified.

### Task 0.3: Rename FAB Action

**Why:** Change from "Talk to Groot" to "Capture a Moment" — reinforces the product's purpose.

**Files to modify:**
- `mobile/components/ui/compose-modal.tsx` (~670 lines) — Change header text from "Talk to Groot" to "Capture a Moment".
- `mobile/components/ui/bottom-tab-bar.tsx` (~423 lines) — If there's tooltip/accessibility text, update it.

---

## <a id="sprint-1"></a>Sprint 1: The Evening Ritual — Contextual Questions (Days 3-8)

**Goal:** Make the 9 PM evening question so personal that users can't not reply. This is THE core product change.

### Task 1.1: Build Rich Context Assembler for Proactive Messages

**Why:** Currently, `generateReflectionPrompt()` only looks at today's message text. It needs mood, profile, habits, and memory context.

**New file to create:** `src/lib/journal/rich-context.ts`

```typescript
// Assembles full day context for contextual prompt generation
export interface DayContext {
  userName: string;
  todayMessages: Array<{content: string; type: string; timestamp: string}>;
  messageCount: number;
  currentMoodTrend: string | null;      // "improving", "declining", "stable", "unknown"
  lastDetectedMood: string | null;      // e.g., "stressed", "excited", "calm"
  profileHighlights: string;            // key facts formatted as text
  activeHabits: Array<{name: string; currentStreak: number; checkedInToday: boolean}>;
  recentPatterns: string[];             // e.g., "mentioned work stress 3 times this week"
}

export async function buildDayContext(userId: string, userName: string): Promise<DayContext>
```

**Implementation details:**
1. Call `getRecentMessages(userId, 20)` — filter to today's inbound messages
2. Call `getUserProfileSummary(userId)` — get formatted profile text
3. Query `daily_moods` table for last 7 days — compute trend (improving/declining/stable)
4. Call `getActiveHabits(userId)` — get habits + today's check-in status
5. Query `messages` metadata for this week — extract recurring `memoryTags` for pattern detection
6. All calls run in parallel via `Promise.all()`

**Files to modify:**
- `src/lib/memory/short-term.ts` — Add `getTodayMessages(userId)` helper that filters by IST day boundary.

### Task 1.2: Upgrade Prompt Generator to Use Rich Context

**File to modify:** `src/lib/journal/prompt-generator.ts`

**Current flow:**
```
generateReflectionPrompt(userId, userName)
  → fetch 10 recent messages
  → if >= 3 today: ask AI to generate question from message text
  → else: random default
```

**New flow:**
```
generateReflectionPrompt(userId, userName)
  → buildDayContext(userId, userName)
  → ALWAYS use AI to generate question (even with 0 messages today)
  → AI receives: today's messages + mood trend + profile + habits + patterns
  → AI generates ONE highly personal question
  → Fallback: curated Storyworthy defaults (current 14 prompts)
```

**New LLM prompt template:**
```
You are Groot, generating ONE evening reflection question for {name}.

CONTEXT ABOUT THEIR DAY:
- Messages today: {messageCount} ({summary of topics discussed})
- Current mood: {lastDetectedMood} (trend: {moodTrend} over 7 days)
- Active habits: {habitSummary}
- Key facts: {profileHighlights}
- Patterns this week: {patterns}

RULES:
- Ask about a SPECIFIC thing from their day if possible
- If they mentioned a meeting/event, ask how it went
- If mood is declining, ask about a bright spot
- If they haven't messaged today, use a Storyworthy prompt
- Keep it to 1-2 sentences max
- Sound like a close friend texting, not a therapist
- Do NOT start with "Hey" or "Hi" — just the question
- No emoji

Return ONLY the question text, nothing else.
```

**Estimated changes:** 1 new file (~80 lines), 1 file modified (~50 lines changed).

### Task 1.3: Add Question Deduplication

**Why:** Prevent asking the same type of question two nights in a row.

**Implementation:**
- Store the last 7 evening questions in a new `proactive_history` table or in `messages` with a special metadata tag.
- Before sending, check that the generated question doesn't overlap semantically with the last 3.
- If overlap detected, regenerate with "AVOID asking about: {previous topics}" added to prompt.

**New migration:** `supabase/migrations/XXX_proactive_history.sql`
```sql
CREATE TABLE IF NOT EXISTS proactive_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  message_type TEXT NOT NULL,  -- 'evening_reflection', 'morning_checkin', etc.
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_proactive_history_user ON proactive_history(user_id, message_type, sent_at DESC);
```

**Files to modify:**
- `src/lib/journal/prompt-generator.ts` — Query last 3 evening prompts before generating, pass to LLM as avoidance context.
- `src/app/api/cron/evening-reflection/route.ts` (~49 lines) — After sending, insert into `proactive_history`.

### Task 1.4: Update Evening Reflection Cron

**File to modify:** `src/app/api/cron/evening-reflection/route.ts` (~49 lines)

**Changes:**
- Pass the full `buildDayContext()` output to `generateReflectionPrompt()`.
- Log the generated question for debugging.
- Store in `proactive_history` after sending.
- Keep de-escalation logic unchanged.

---

## <a id="sprint-2"></a>Sprint 2: Morning Callback & Contextual Check-ins (Days 8-12)

**Goal:** Build continuity between days. Morning message references yesterday. Midday nudge becomes contextual.

### Task 2.1: Morning Callback — "Yesterday you said..."

**Why:** Creates anticipation and continuity. Users wake up to a personalized message that references their evening reflection.

**File to modify:** `src/app/api/cron/daily-checkin/route.ts` (~98 lines)

**New logic (for de-escalation level 0):**
1. Query `proactive_history` for last evening question sent to this user.
2. Query `messages` for any inbound reply after that evening question.
3. If reply exists:
   ```
   Morning, {name}. Yesterday you said: "{truncated reply}"

   {habit summary with streaks}

   Quick log: just send the number.
   ```
4. If no reply to evening question:
   ```
   Morning, {name}. New day, clean slate.

   {habit summary with streaks}
   ```

**Key constraint:** The "yesterday you said" quote must be short (max 50 chars, truncated with ...).

**Files to modify:**
- `src/app/api/cron/daily-checkin/route.ts` — Add query for previous evening context.
- `src/lib/memory/short-term.ts` — Add `getLastEveningReply(userId)` helper.

### Task 2.2: Make Midday Nudge Contextual

**File to modify:** `src/app/api/cron/midday-nudge/route.ts` (~67 lines)

**Current:** Random prompt from 8 static options.

**New logic:**
1. Check if user has messaged today.
2. If yes: Skip nudge entirely (they're already engaged).
3. If no: Use a lighter version of the contextual prompt — just 1 sentence based on what Groot knows about them.
   - E.g., "How's the {currentProject} going?" (from profile)
   - E.g., "Day {streak+1} of {habitName} — don't forget to log it."
   - Fallback: Random Storyworthy prompt from existing pool.

**Files to modify:**
- `src/app/api/cron/midday-nudge/route.ts` — Add profile/habit context lookup.

### Task 2.3: Track Proactive Message Engagement

**Why:** Need to know which prompts get replies to improve over time.

**Add to `proactive_history` table:**
```sql
ALTER TABLE proactive_history ADD COLUMN replied_at TIMESTAMPTZ;
ALTER TABLE proactive_history ADD COLUMN reply_message_id UUID;
```

**File to modify:**
- `src/lib/messaging/pipeline.ts` (~659 lines) — After processing an inbound message, check if it's a reply to a recent proactive message (within 2 hours). If so, update `proactive_history.replied_at`.

---

## <a id="sprint-3"></a>Sprint 3: Mobile App Redesign — "Today" Screen (Days 12-20)

**Goal:** Rebuild the mobile home screen around the daily ritual. 3 screens, not 5 tabs.

### Task 3.1: New Tab Structure

**File to modify:** `mobile/app/(tabs)/_layout.tsx` (~88 lines)

**Current tabs:** Journal, Tasks, [FAB], Pulse, Settings
**New tabs:** Today, Garden, [FAB], Mirror, Settings

| Tab | Icon | Screen |
|-----|------|--------|
| Today | Sun | Daily dashboard (new) |
| Garden | Leaf/Flower | Mood meadow + journal (replaces Journal + Mood) |
| [FAB] | Plus | Compose modal (unchanged) |
| Mirror | User/Sparkles | Self-understanding (new — replaces Profile + Insights) |
| Settings | Settings | Settings (unchanged) |

**File to modify:**
- `mobile/components/ui/bottom-tab-bar.tsx` (~423 lines) — Update tab definitions, icons, and labels.

### Task 3.2: Build the "Today" Screen

**New file:** `mobile/app/(tabs)/today.tsx` (replaces existing ~412 lines)

**Complete rewrite. New layout (top to bottom):**

```
┌─────────────────────────────┐
│  Good evening, Abhishek     │  ← Time-based greeting
│  ○ Feeling: calm            │  ← Last detected mood dot + label
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │ 🌸 Today's Moment     │  │  ← Storyworthy prompt card
│  │                       │  │
│  │ "What shifted today?" │  │  ← Evening question (or latest)
│  │                       │  │
│  │ [Tap to respond]      │  │  ← Opens compose modal
│  └───────────────────────┘  │
├─────────────────────────────┤
│  Active Streaks             │
│  ━━━━━━━━━━━━━━ Weight 23d  │  ← Visual progress bars
│  ━━━━━━━━━━━━ Steps  18d    │
│  ━━━━━ Reading  5d          │
├─────────────────────────────┤
│  Groot's Observation        │
│  "You've mentioned work     │  ← AI-generated insight
│   stress 4 times this week. │
│   That's unusual for you."  │
├─────────────────────────────┤
│  Yesterday                  │
│  ○ "Had coffee with Sonal"  │  ← Yesterday's captured moment
│  ○ Mood: good               │
└─────────────────────────────┘
```

**Data sources:**
- Greeting: time-based + `useCurrentUser()` for name
- Mood: `useMood()` query — last recorded mood
- Storyworthy prompt: New API endpoint `GET /api/mobile/today` that returns today's prompt
- Streaks: `useHabits()` query — active habits with streaks
- Groot's observation: New field in `GET /api/mobile/today` response
- Yesterday: `useMemories()` query with yesterday date filter

**New API endpoint:** `src/app/api/mobile/today/route.ts`
```typescript
// Returns: {
//   greeting: string,
//   todayPrompt: string | null,     // Tonight's evening question (pre-generated)
//   observation: string | null,     // Weekly pattern observation
//   yesterdayMoment: string | null,  // Yesterday's storyworthy entry
//   yesterdayMood: string | null
// }
```

**New components needed:**
- `mobile/components/ui/moment-card.tsx` — The Storyworthy prompt card with tap-to-respond
- `mobile/components/ui/streak-bar.tsx` — Horizontal progress bar for streaks
- `mobile/components/ui/observation-card.tsx` — Groot's weekly observation

### Task 3.3: Pre-generate Today's Prompt

**Why:** The Today screen should show tonight's evening question before 9 PM, so users can think about it during the day.

**New cron job:** `src/app/api/cron/prepare-evening/route.ts`
- Runs at 6 PM user timezone
- Generates the evening question using `buildDayContext()` + `generateReflectionPrompt()`
- Stores in `proactive_history` with `message_type = 'evening_prepared'`
- Today screen reads this pre-generated prompt
- At 9 PM, the evening reflection cron sends the same prompt (or regenerates if new messages arrived since 6 PM)

---

## <a id="sprint-4"></a>Sprint 4: Unified Design Language — "Living Earth" (Days 15-22)

**Goal:** One product, one visual identity across mobile and web.

### Task 4.1: New Color System

**Files to modify:**
- `mobile/lib/theme/tokens.ts` — Replace current forest green/burnt orange palette
- `src/styles/design-tokens.css` (~106 lines) — Replace Notion-inspired blue/orange palette
- `mobile/constants/mood.ts` (~83 lines) — Update mood color mappings

**New "Living Earth" Palette:**

```typescript
// mobile/lib/theme/tokens.ts — LIGHT THEME
export const lightTheme = {
  background: '#FAF8F3',        // Warm Linen
  foreground: '#2C2C2A',        // Deep Charcoal
  card: '#FFFFFF',
  primary: '#6B8F71',           // Sage Green
  primaryForeground: '#FFFFFF',
  accent: '#D4A054',            // Warm Amber
  accentForeground: '#FFFFFF',
  secondary: '#F0EDE6',         // Light Linen
  secondaryForeground: '#5A5A58',
  muted: '#E8E4DC',
  mutedForeground: '#8A8A86',
  destructive: '#C1484B',       // Muted Crimson
  border: 'rgba(44, 44, 42, 0.08)',

  // Mood Colors (organic tones)
  moodGreat: '#2A9D8F',         // Deep Teal
  moodGood: '#6B8F71',          // Sage
  moodOkay: '#E9C46A',          // Warm Gold
  moodLow: '#E76F51',           // Burnt Sienna
  moodBad: '#C1484B',           // Muted Crimson

  // Garden-specific
  gardenFlower: '#D4A054',      // Amber (for blooming flowers)
  gardenLeaf: '#6B8F71',        // Sage (for healthy growth)
  gardenSoil: '#8B7355',        // Earth brown
  gardenWater: '#5B9BD5',       // Water blue
  gardenSunlight: '#F4D06F',    // Warm yellow
};
```

```typescript
// DARK THEME
export const darkTheme = {
  background: '#1A1C19',        // Deep Soil
  foreground: 'rgba(255,255,255,0.87)',
  card: '#222420',
  primary: '#8BC4A0',           // Light Sage
  accent: '#E8C07A',            // Light Amber
  // ... (lighter variants of all colors)
};
```

**CSS tokens (web):**
```css
/* src/styles/design-tokens.css */
:root {
  --color-primary: #6B8F71;
  --color-accent: #D4A054;
  --color-bg: #FAF8F3;
  --color-fg: #2C2C2A;
  --color-card: #FFFFFF;
  /* ... full Living Earth palette ... */
}
[data-theme="dark"] {
  --color-primary: #8BC4A0;
  --color-accent: #E8C07A;
  --color-bg: #1A1C19;
  /* ... */
}
```

### Task 4.2: Typography Update

**Files to modify:**
- `mobile/constants/typography.ts` (~55 lines) — Keep Sora for display, keep Manrope for body (they work well)
- Web: Add `Instrument Serif` for garden headings via `next/font`

**Web change in `src/app/layout.tsx`:**
```typescript
import { Instrument_Serif, Inter } from 'next/font/google';
const instrumentSerif = Instrument_Serif({ weight: '400', subsets: ['latin'] });
const inter = Inter({ subsets: ['latin'] });
```

Use Instrument Serif for: Garden page title, "The Garden" logo text, weekly reflection headings.
Use Inter for: everything else (body, labels, data).

### Task 4.3: Update All Component Colors

**Mobile components to update (replace hardcoded hex values with theme tokens):**
- `mobile/components/ui/glass-card.tsx` (~55 lines)
- `mobile/components/ui/gradient-background.tsx` (~63 lines) — Update gradient stops
- `mobile/components/ui/bottom-tab-bar.tsx` (~423 lines) — Tab colors
- `mobile/components/ui/compose-modal.tsx` (~670 lines) — Header, buttons, accent colors
- `mobile/components/ui/steps-card.tsx` (~535 lines) — Progress ring colors
- `mobile/components/illustrations/groot-sprout.tsx` (~155 lines) — SVG fill colors
- `mobile/components/illustrations/mood-faces.tsx` (~94 lines) — Face colors

**Web components to update:**
- `src/components/garden/sidebar.tsx` (~106 lines) — Nav colors, active states
- `src/components/garden/bottom-nav.tsx` (~45 lines) — Mobile nav colors
- `src/app/garden/page.tsx` (~336 lines) — Dashboard accent colors

### Task 4.4: Organic Motion Language

**Files to modify:**
- `mobile/components/ui/press-scale.tsx` (~75 lines) — Slow the spring physics:
  ```typescript
  // Current: damping: 26, stiffness: 320 (snappy)
  // New: damping: 20, stiffness: 180 (organic, gentle)
  ```
- `mobile/components/ui/glass-card.tsx` — Add subtle "breathing" animation on idle (very slow scale pulse 1.0 → 1.002)
- All page transitions: slower fade (300ms → 500ms) for a calmer feel

### Task 4.5: Loading States — Seed Germination

**New component:** `mobile/components/ui/seed-loader.tsx`
- Replace `ActivityIndicator` with a small animated seed that sprouts
- Simple: 3-frame animation (seed → sprout → small leaf) using Lottie or SVG animation
- Used in: compose modal "Groot is thinking...", page loads, data fetches

---

## <a id="sprint-5"></a>Sprint 5: The Garden Visualization — Mood Meadow (Days 22-35)

**Goal:** Replace the Year-in-Pixels grid with a living garden visualization.

### Task 5.1: Design the Garden Data Model

Each day maps to a "flower" in the garden:
- **Has mood entry:** Flower blooms. Color = mood. Size = how much the user wrote.
- **No mood entry:** Empty plot (small gray dot or bare soil patch).
- **Streak active:** Vine connects consecutive days.

**Data source:** Same `GET /api/mood` endpoint, same data — different visualization.

### Task 5.2: Build the Mood Meadow Component

**New file:** `mobile/components/garden/mood-meadow.tsx`

**Visual concept:**
- Scrollable horizontal garden (think: a path through a meadow)
- Each week = a row of 7 flower positions
- Flowers are SVG/Canvas elements with organic shapes (not perfect circles)
- Color maps to mood score (using new Living Earth mood palette)
- Flower size: small (short entry), medium (normal), large (long/deep reflection)
- Empty days: small gray seed/dot
- Today: pulsing glow ring around the flower position

**Interaction:**
- Tap any flower → Modal shows that day's captured moment + mood
- Pinch to zoom: week view → month view → year view
- Scroll horizontally through time (right = recent, left = older)

**Implementation approach:**
- Use `react-native-svg` for flower rendering (already in dependencies)
- `react-native-gesture-handler` for pinch-zoom
- `FlatList` with horizontal scroll for performance
- Pre-render flower SVG paths (5 mood variants × 3 sizes = 15 flower assets)

**Flower SVG design:**
- Great mood: Full bloom, 5-6 petals, vibrant teal
- Good mood: Open flower, 4-5 petals, sage green
- Okay mood: Half-open bud, gold
- Low mood: Drooping flower, burnt sienna
- Bad mood: Wilted/closed bud, crimson

### Task 5.3: Build Flower SVG Assets

**New file:** `mobile/components/illustrations/flowers.tsx`

Create 5 SVG flower components, one per mood level. Each has:
- A `size` prop (small/medium/large) that scales the SVG
- Organic, hand-drawn feel (slight irregularity in petal shapes)
- Subtle animation: gentle sway on render (rotation ±2 degrees)

### Task 5.4: Build Streak Vines

**New component:** `mobile/components/garden/streak-vine.tsx`

- When a habit has consecutive check-in days, draw a vine connecting those days
- Vine is a curved SVG path with small leaves at check-in points
- Longer streaks = thicker vine
- Broken streak = wilted section (gray, thin)

### Task 5.5: Replace Year-in-Pixels in Mood Tab

**File to modify:** `mobile/app/(tabs)/mood.tsx` (~789 lines)

**Replace the Year-in-Pixels grid section** with the `MoodMeadow` component.

Keep:
- Mood tab header
- Habits section (below the meadow)
- Manual mood check-in button

Remove:
- The 14-column grid of colored dots
- The mood legend (flowers ARE the legend now)

### Task 5.6: Build the "Garden" Tab Screen

**New file:** `mobile/app/(tabs)/garden.tsx`

This is the main Garden tab (replacing Journal in the tab bar). It combines:

```
┌─────────────────────────────┐
│  Your Garden                │
│  {month}, {year}     < >    │  ← Month navigation
├─────────────────────────────┤
│                             │
│  [Mood Meadow Visualization]│  ← Scrollable flower grid
│  🌸 🌸 🌺 🌸 🌻 ⚫ 🌸      │
│  🌸 ⚫ 🌸 🌺 🌸 🌸 🌸      │
│  🌸 🌸 ...                  │
│                             │
├─────────────────────────────┤
│  Today's Entry              │
│  "Had a great conversation  │  ← Latest journal entry
│   with Priya about..."      │
├─────────────────────────────┤
│  This Week                  │
│  ○ Mon — "Started the..."   │  ← Condensed week timeline
│  ○ Tue — "Feeling better..."│
│  ○ Wed — (no entry)         │
│  ○ Thu — "The meeting..."   │
├─────────────────────────────┤
│  Search memories...         │  ← Search bar at bottom
└─────────────────────────────┘
```

**Data sources:**
- `useMood(year)` for meadow data
- `useMemories({ month })` for week timeline
- Search: existing `useMemories({ q: searchTerm })` query

---

## <a id="sprint-6"></a>Sprint 6: "Your Week in 3 Moments" (Days 30-38)

**Goal:** Replace the wall-of-text weekly report with a crisp, beautiful, shareable format.

### Task 6.1: New Weekly Report Format

**File to modify:** `src/app/api/cron/weekly-report/route.ts` (~57 lines)

**Current:** Generates a long synthesis text and sends as WhatsApp message.

**New format — structured data:**
```typescript
interface WeeklyReflection {
  weekRange: string;               // "Feb 17 — Feb 23, 2026"
  highlight: {
    moment: string;                // The one standout moment
    date: string;                  // When it happened
    mood: string;                  // Mood that day
  };
  pattern: {
    observation: string;           // What Groot noticed
    evidence: string[];            // Supporting data points
  };
  question: string;                // Forward-looking question
  stats: {
    momentsCaptures: number;
    avgMood: number;
    longestStreak: { name: string; days: number };
    wordsWritten: number;
  };
}
```

**WhatsApp message format (max 15 lines):**
```
*Your Week* — Feb 17-23

*The Highlight*
Tuesday — "Realized the product pitch actually resonated with the team"

*Groot Noticed*
You mentioned feeling _energized_ after morning walks 3 times. That's a pattern worth keeping.

*For Next Week*
What would make this coming week feel like a win?

_4 moments · mood avg: good · 23-day weight streak · 1,240 words_
```

### Task 6.2: New Weekly Report Generator

**New/modified file:** `src/lib/journal/weekly-synthesis.ts`

**Input:** All messages for the week, mood data, habit data, profile
**Output:** `WeeklyReflection` structured object

**LLM prompt:**
```
Analyze this user's week and extract:
1. THE HIGHLIGHT: The single most meaningful moment (quote it if possible, max 20 words)
2. THE PATTERN: Something you noticed across multiple days (be specific with evidence)
3. THE QUESTION: One forward-looking question for next week

Context:
- Messages: {weekMessages}
- Mood scores: {moodData}
- Habits: {habitData}
- Profile: {profileSummary}

Return as JSON: { highlight: {moment, date, mood}, pattern: {observation, evidence}, question }
```

### Task 6.3: Store Weekly Reflection as Structured Data

**Modify migration or add new one:**
```sql
ALTER TABLE weekly_reports ADD COLUMN highlight_moment TEXT;
ALTER TABLE weekly_reports ADD COLUMN highlight_date DATE;
ALTER TABLE weekly_reports ADD COLUMN pattern_observation TEXT;
ALTER TABLE weekly_reports ADD COLUMN pattern_evidence JSONB;
ALTER TABLE weekly_reports ADD COLUMN forward_question TEXT;
ALTER TABLE weekly_reports ADD COLUMN stats JSONB;
```

### Task 6.4: Weekly Reflection Card in Mobile

**New component:** `mobile/components/garden/weekly-card.tsx`

Beautiful card shown in:
- Today screen (on Sunday/Monday)
- Mirror screen (archive of all weekly reflections)

Design: Card with the 3 sections + stats footer. Mood-colored top border.

---

## <a id="sprint-7"></a>Sprint 7: Mirror Screen — Self-Understanding (Days 35-42)

**Goal:** Replace Profile + Insights with a narrative "Mirror" that shows who you are through Groot's eyes.

### Task 7.1: Build the Mirror Screen

**New file:** `mobile/app/(tabs)/mirror.tsx`

**Layout:**
```
┌─────────────────────────────┐
│  Mirror                     │
│  How Groot sees you         │
├─────────────────────────────┤
│  "Abhishek is a product     │  ← AI-generated narrative bio
│   thinker who..."           │     (updated weekly)
├─────────────────────────────┤
│  Your Patterns              │
│  ┌──────────────────┐       │
│  │ 🟢 Energy peaks  │       │  ← Visual pattern cards
│  │ after morning    │       │
│  │ walks            │       │
│  └──────────────────┘       │
│  ┌──────────────────┐       │
│  │ 🟡 Work stress   │       │
│  │ rises midweek    │       │
│  └──────────────────┘       │
├─────────────────────────────┤
│  Milestones                 │
│  🏆 100 moments captured    │
│  🔥 30-day weight streak    │
│  📝 10,000 words written    │
├─────────────────────────────┤
│  Weekly Reflections         │
│  ► Feb 17-23: "..."        │  ← Archive of weekly cards
│  ► Feb 10-16: "..."        │
├─────────────────────────────┤
│  What Groot Knows           │
│  [Expandable profile facts] │  ← From user_profile table
└─────────────────────────────┘
```

### Task 7.2: AI-Generated Narrative Bio

**New API endpoint:** `GET /api/mobile/mirror`

Returns:
```typescript
{
  narrativeBio: string;          // 2-3 sentence AI-written bio
  patterns: Array<{
    label: string;
    description: string;
    moodColor: string;
    trend: "positive" | "neutral" | "negative";
  }>;
  milestones: Array<{
    icon: string;
    label: string;
    value: number;
    unit: string;
  }>;
  weeklyReflections: Array<{
    weekRange: string;
    highlightMoment: string;
    highlightMood: string;
  }>;
  profileFacts: Array<{
    category: string;                // "relationships", "work", "preferences", "goals"
    facts: string[];
  }>;
}
```

**LLM prompt for narrative bio (regenerated weekly via cron):**
```
You are Groot. Write a 2-3 sentence narrative bio of {name} based on everything you know about them.

Profile facts: {profileFacts}
Recent mood trend: {moodTrend}
Key patterns: {patterns}
Conversation history themes: {themes}

Write it as: "Abhishek is..." — warm, specific, insightful.
Not a resume. Not generic. Show that you KNOW them.
Max 60 words.
```

**Files to modify:**
- `src/app/api/mobile/mirror/route.ts` (new) — Builds mirror data from profile, mood, habits, weekly reports
- `src/app/api/cron/weekly-report/route.ts` — After generating weekly report, also regenerate narrative bio and pattern analysis

### Task 7.3: Milestones Engine

**New file:** `src/lib/milestones/engine.ts`

Milestones are calculated, not stored. On each Mirror screen load:
```typescript
export function calculateMilestones(stats: UserStats): Milestone[] {
  const milestones: Milestone[] = [];

  // Moment milestones: 10, 25, 50, 100, 250, 500, 1000
  const momentThresholds = [10, 25, 50, 100, 250, 500, 1000];
  const reached = momentThresholds.filter(t => stats.totalMoments >= t);
  if (reached.length > 0) {
    milestones.push({
      icon: "leaf",
      label: `${reached[reached.length - 1]} moments captured`,
      value: reached[reached.length - 1],
      unit: "moments",
    });
  }

  // Streak milestones per habit
  for (const habit of stats.habits) {
    if (habit.longestStreak >= 7) {
      milestones.push({
        icon: "flame",
        label: `${habit.longestStreak}-day ${habit.name} streak`,
        value: habit.longestStreak,
        unit: "days",
      });
    }
  }

  // Words written milestones: 1000, 5000, 10000, 25000, 50000
  const wordThresholds = [1000, 5000, 10000, 25000, 50000];
  const wordReached = wordThresholds.filter(t => stats.totalWords >= t);
  if (wordReached.length > 0) {
    milestones.push({
      icon: "pencil",
      label: `${(wordReached[wordReached.length - 1] / 1000).toFixed(0)}k words written`,
      value: wordReached[wordReached.length - 1],
      unit: "words",
    });
  }

  return milestones.sort((a, b) => b.value - a.value);
}
```

### Task 7.4: Pattern Detection

**New file:** `src/lib/patterns/detector.ts`

Patterns are extracted from weekly reports + mood data:
```typescript
export async function detectPatterns(userId: string): Promise<Pattern[]> {
  // 1. Get last 4 weeks of mood data with day-of-week
  // 2. Get message metadata (memoryTags) frequency
  // 3. Get habit completion rates by day-of-week
  // 4. Ask LLM to synthesize 3-5 patterns from the data
  //    - "Energy peaks after morning walks" (positive)
  //    - "Work stress rises midweek" (neutral)
  //    - "Sleep quality declining" (negative)
}
```

**LLM prompt for pattern detection:**
```
Analyze this user's data from the past 4 weeks and identify 3-5 behavioral patterns.

Mood by day: {moodByDay}
Topics mentioned frequently: {topicFrequency}
Habits: {habitCompletionByDay}
Key events: {eventSummary}

For each pattern, provide:
- label: Short name (3-5 words)
- description: One sentence explanation with evidence
- trend: "positive", "neutral", or "negative"

Return as JSON array. Be specific — not "you're sometimes stressed" but "work stress peaks on Wednesdays and Thursdays."
```

### Task 7.5: "What Groot Knows" Expandable Section

**Reuse existing data from:** `src/lib/memory/profile.ts` → `getUserProfile(userId)`

The profile facts are already extracted by Groot from conversations (stored in `user_profile` table as JSON). Display them grouped by category:

- **Relationships:** Sonal (wife), Priya (friend), team members...
- **Work:** Product manager, building Groot, interested in AI...
- **Preferences:** Morning person, drinks black coffee, prefers direct feedback...
- **Goals:** Launch Groot publicly, improve fitness, read more...

**New component:** `mobile/components/mirror/profile-facts.tsx`
- Expandable sections by category
- Each fact is editable (tap to correct) → calls `PATCH /api/mobile/profile`
- "Is this right?" footer — users can tap to correct facts Groot got wrong

---

## <a id="sprint-8"></a>Sprint 8: Web Portal Alignment (Days 42-52)

**Goal:** Bring the web portal in sync with the new mobile design language and information architecture. The web isn't a separate product — it's the same Garden, just on a bigger screen.

### Task 8.1: Update Web Design Tokens

**File to modify:** `src/styles/design-tokens.css` (~106 lines)

**Complete replacement** with Living Earth palette (matching mobile tokens from Sprint 4):

```css
:root {
  /* Living Earth — Light */
  --color-primary: #6B8F71;
  --color-primary-light: #8BB094;
  --color-primary-dark: #4A6B50;
  --color-accent: #D4A054;
  --color-accent-light: #E8C07A;
  --color-accent-dark: #B8863A;
  --color-bg: #FAF8F3;
  --color-bg-secondary: #F0EDE6;
  --color-fg: #2C2C2A;
  --color-fg-muted: #8A8A86;
  --color-fg-secondary: #5A5A58;
  --color-card: #FFFFFF;
  --color-border: rgba(44, 44, 42, 0.08);
  --color-border-strong: rgba(44, 44, 42, 0.16);
  --color-destructive: #C1484B;

  /* Mood colors */
  --color-mood-great: #2A9D8F;
  --color-mood-good: #6B8F71;
  --color-mood-okay: #E9C46A;
  --color-mood-low: #E76F51;
  --color-mood-bad: #C1484B;

  /* Garden-specific */
  --color-garden-flower: #D4A054;
  --color-garden-leaf: #6B8F71;
  --color-garden-soil: #8B7355;
  --color-garden-water: #5B9BD5;
  --color-garden-sun: #F4D06F;

  /* Typography */
  --font-display: 'Instrument Serif', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing (stays the same) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(44, 44, 42, 0.04);
  --shadow-md: 0 4px 12px rgba(44, 44, 42, 0.06);
  --shadow-lg: 0 8px 24px rgba(44, 44, 42, 0.08);
}

[data-theme="dark"] {
  --color-primary: #8BC4A0;
  --color-primary-light: #A8D8B8;
  --color-primary-dark: #6B9F7C;
  --color-accent: #E8C07A;
  --color-bg: #1A1C19;
  --color-bg-secondary: #222420;
  --color-fg: rgba(255, 255, 255, 0.87);
  --color-fg-muted: rgba(255, 255, 255, 0.45);
  --color-fg-secondary: rgba(255, 255, 255, 0.65);
  --color-card: #222420;
  --color-border: rgba(255, 255, 255, 0.06);
  --color-border-strong: rgba(255, 255, 255, 0.12);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4);
}
```

### Task 8.2: Restructure Sidebar Navigation

**File to modify:** `src/components/garden/sidebar.tsx` (~106 lines)

**Current sidebar items:** Home, Journal, Habits, Stories, Mood, Insights, People, Topics, Tasks, Profile, Settings

**New sidebar (matching mobile IA):**
```
The Garden    ← Logo / home link

── Today      ← Dashboard (the daily ritual)
── Garden     ← Journal + mood meadow view
── Mirror     ← Self-understanding (replaces Profile + Insights)

── Settings

── Streaks    ← Collapsed section at bottom
```

Remove from sidebar: Tasks, People, Topics, Stories (keep routes alive but unlinked).
Merge: Profile + Insights → Mirror.
Merge: Journal + Mood + Habits → Garden.

**Sidebar visual update:**
- Active state: sage green left border + light green background tint
- Hover: subtle warm linen background
- Logo: "The Garden" in Instrument Serif with a small leaf icon
- Bottom: User avatar + name + mood dot (current mood color)

### Task 8.3: Rebuild Web Dashboard (Today Page)

**File to modify:** `src/app/garden/page.tsx` (~336 lines)

**Current:** Grid of stat cards (total memories, habits, mood overview, quick capture).

**New layout — mirrors mobile Today screen, but takes advantage of wider screen:**

```
┌──────────────────────────────────────────────────────────┐
│  Good evening, Abhishek                    ○ calm        │
├──────────────────────────────┬───────────────────────────┤
│                              │                           │
│  Today's Moment              │  Active Streaks           │
│  ┌────────────────────────┐  │  ━━━━━━━━ Weight   23d   │
│  │                        │  │  ━━━━━━ Steps     18d    │
│  │  "What surprised you   │  │  ━━━━ Reading    5d      │
│  │   about today?"        │  │                           │
│  │                        │  │  Groot's Observation      │
│  │  [Click to respond]    │  │  "You've been mentioning  │
│  └────────────────────────┘  │   morning walks more..."  │
│                              │                           │
├──────────────────────────────┴───────────────────────────┤
│  Yesterday                                               │
│  ○ "Had coffee with Sonal and talked about the trip"     │
│  ○ Mood: good · 2 habits logged · 340 words              │
└──────────────────────────────────────────────────────────┘
```

Uses the same `GET /api/mobile/today` endpoint (rename to `GET /api/garden/today` for clarity, keep mobile alias).

### Task 8.4: Build Web Garden Page (Mood Meadow)

**New page:** `src/app/garden/garden/page.tsx` (or rename existing journal page)

This page shows:
1. **Mood Meadow visualization** (SVG-based, same concept as mobile but rendered in the browser using `<svg>`)
2. **Month navigation** with left/right arrows
3. **Week timeline** below the meadow
4. **Search bar** at the top

**SVG Meadow for web:**
- Use CSS/SVG directly (no react-native-svg dependency)
- Same flower shapes, same mood colors
- Hover over flower → tooltip showing day's entry and mood
- Click flower → expand panel on the right with full entry

### Task 8.5: Build Web Mirror Page

**New page:** `src/app/garden/mirror/page.tsx` (or repurpose existing profile page)

Same data as mobile Mirror, wider layout:

```
┌───────────────────────────────────────────────────────────┐
│  Mirror — How Groot Sees You                              │
├──────────────────────────────┬────────────────────────────┤
│                              │                            │
│  "Abhishek is a product      │  Your Patterns             │
│   thinker who..."            │  ┌──────────────────────┐  │
│                              │  │ Energy peaks after   │  │
│  Milestones                  │  │ morning walks        │  │
│  🏆 100 moments              │  └──────────────────────┘  │
│  🔥 30-day streak            │  ┌──────────────────────┐  │
│  📝 10k words                │  │ Work stress rises    │  │
│                              │  │ midweek              │  │
│                              │  └──────────────────────┘  │
├──────────────────────────────┴────────────────────────────┤
│  Weekly Reflections                                       │
│  ► Feb 17-23: "Realized the product pitch resonated..."   │
│  ► Feb 10-16: "Finally found a reading rhythm..."         │
├───────────────────────────────────────────────────────────┤
│  What Groot Knows                                         │
│  Relationships: Sonal (wife), Priya (friend)...           │
│  Work: Product manager, building Groot...                 │
│  Goals: Launch publicly, improve fitness...               │
└───────────────────────────────────────────────────────────┘
```

Uses the same `GET /api/mobile/mirror` endpoint (rename to `GET /api/garden/mirror`).

### Task 8.6: Update All Web Components to Use CSS Tokens

**Files to check and update** (any hardcoded hex colors → CSS variables):
- `src/app/garden/journal/page.tsx`
- `src/app/garden/habits/page.tsx`
- `src/app/garden/stories/page.tsx`
- `src/app/garden/mood/page.tsx`
- `src/app/garden/insights/page.tsx`
- `src/app/garden/settings/page.tsx`
- `src/components/garden/sidebar.tsx`
- `src/components/garden/bottom-nav.tsx`
- Any other components that use hardcoded colors

**Pattern:** Replace `#2383E2` (old blue) → `var(--color-primary)`, `#FF6B35` (old orange) → `var(--color-accent)`, etc.

---

## <a id="sprint-9"></a>Sprint 9: Voice-First Features (Days 50-58)

**Goal:** Make voice a first-class input method. Groot should feel like talking to a friend, not typing to a bot.

### Task 9.1: Voice Journaling Emphasis

**Why:** Typing a reflection at 9 PM feels like homework. Speaking a 30-second voice note feels natural and intimate.

**Current state:** Voice input exists via Whisper transcription in the compose modal. It works — but it's buried and not encouraged.

**Changes to mobile compose modal:**
- `mobile/components/ui/compose-modal.tsx` (~670 lines)
  - Make the microphone button PRIMARY (larger, centered)
  - Make the text input SECONDARY (smaller, below)
  - When voice recording starts, show a gentle waveform animation instead of a timer
  - After recording, show the transcribed text with option to edit before sending
  - Add a "Just speak, Groot is listening" label below the mic button

**Layout change:**
```
Current:                          New:
┌────────────────────────┐       ┌────────────────────────┐
│ Capture a Moment       │       │ Capture a Moment       │
│                        │       │                        │
│ [Text input area     ] │       │      [  🎤  ]          │ ← Large mic button
│                        │       │  Just speak, Groot     │
│ [📷] [🎤] [Send]      │       │  is listening          │
└────────────────────────┘       │                        │
                                 │ [Or type instead...]   │ ← Expandable text
                                 │                        │
                                 │ [📷]          [Send]   │
                                 └────────────────────────┘
```

### Task 9.2: Voice Morning Check-in (WhatsApp)

**Why:** Instead of reading a text message, users could listen to Groot's morning message as a 15-second audio clip — warmer, more personal.

**File to modify:** `src/app/api/cron/daily-checkin/route.ts`

**New option (behind feature flag `ENABLE_VOICE_CHECKINS`):**
1. Generate the morning check-in text (existing logic)
2. Convert to speech via `TTSProvider.textToSpeech(text)`
3. Send as WhatsApp audio message via `WhatsAppClient.sendAudio()`
4. Also send the text version as a caption/follow-up

**Files to modify:**
- `src/lib/providers/tts/openai-tts.ts` — Ensure it works for short messages (< 30 seconds)
- `src/lib/whatsapp/client.ts` — Add `sendAudio(to, audioBuffer, caption?)` method if not already present
- `src/app/api/cron/daily-checkin/route.ts` — Add voice generation + send logic

**Voice choice:** Use OpenAI TTS with `voice: "onyx"` (warm male voice) or allow user to pick in Settings.

### Task 9.3: Voice Weekly Reflection

**File to modify:** `src/app/api/cron/weekly-report/route.ts`

**New option (behind same `ENABLE_VOICE_CHECKINS` flag):**
1. Generate the "Your Week in 3 Moments" text
2. Convert to a 30-60 second audio summary
3. Send as WhatsApp audio + text summary

**Script format for voice reflection:**
```
Hey {name}. Here's your week.

Your highlight was on {day}: {moment}.
I noticed something — {pattern observation}.
And for next week, here's what I'm thinking: {question}.

{count} moments, {streak} streak. Good week.
```

This feels like a friend leaving you a voicemail recap.

### Task 9.4: Voice Preference in Settings

**File to modify:** `mobile/app/settings.tsx` (~727 lines)

Add a new settings section:
```
Voice & Sound
  ○ Morning check-in voice   [On/Off toggle]
  ○ Weekly reflection voice   [On/Off toggle]
  ○ Groot's voice             [Dropdown: Onyx / Nova / Alloy]
```

**Backend:** Store in `user_preferences` table (add column if needed):
```sql
ALTER TABLE user_preferences ADD COLUMN voice_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN voice_name TEXT DEFAULT 'onyx';
```

**Files to modify:**
- `mobile/app/settings.tsx` — Add voice settings UI
- `mobile/lib/api.ts` — Add `updateVoicePreference()` call
- `src/app/api/mobile/settings/route.ts` — Handle voice preference update
- All voice crons check `voice_enabled` before generating audio

---

## <a id="sprint-10"></a>Sprint 10: Onboarding Flow (Days 55-65)

**Goal:** First-time users should feel magic in 60 seconds. The onboarding should teach the ONE core behavior: responding to the evening question.

### Task 10.1: First Launch Experience (Mobile)

**New file:** `mobile/app/onboarding.tsx`

**Flow (5 screens, swipeable):**

**Screen 1 — "Meet Groot"**
```
┌─────────────────────────────┐
│                              │
│       [Groot sprout SVG]     │  ← Animated: seed → sprout → small plant
│                              │
│  Hey. I'm Groot.             │
│  Your quiet thinking         │
│  partner.                    │
│                              │
│  I won't track your         │
│  calories or optimize        │
│  your morning.               │
│                              │
│  I just want to help you     │
│  notice your own life.       │
│                              │
│         [Next →]             │
└─────────────────────────────┘
```

**Screen 2 — "How It Works"**
```
┌─────────────────────────────┐
│                              │
│  Every evening, I'll ask     │
│  you ONE question.           │
│                              │
│  ┌────────────────────────┐  │
│  │ "What was the best     │  │  ← Example prompt card
│  │  part of today?"       │  │
│  └────────────────────────┘  │
│                              │
│  Just reply.                 │
│  Voice or text.              │
│  30 seconds is enough.       │
│                              │
│  Over time, you'll build     │
│  a garden of moments.        │
│                              │
│         [Next →]             │
└─────────────────────────────┘
```

**Screen 3 — "Your Name"**
```
┌─────────────────────────────┐
│                              │
│  What should I call you?     │
│                              │
│  [_________________________] │  ← Name input
│                              │
│  I'll remember.              │
│                              │
│         [Next →]             │
└─────────────────────────────┘
```

**Screen 4 — "Set Your Time"**
```
┌─────────────────────────────┐
│                              │
│  When do you usually         │
│  wind down?                  │
│                              │
│  [  8:00 PM  ]               │  ← Time picker
│  [  9:00 PM  ] ← selected   │
│  [ 10:00 PM  ]               │
│  [ 11:00 PM  ]               │
│                              │
│  I'll send your evening      │
│  question then.              │
│                              │
│         [Next →]             │
└─────────────────────────────┘
```

**Screen 5 — "Your First Question"**
```
┌─────────────────────────────┐
│                              │
│  Here's your first one:      │
│                              │
│  ┌────────────────────────┐  │
│  │ "What's something      │  │  ← First evening question
│  │  you noticed about     │  │
│  │  yourself recently?"   │  │
│  └────────────────────────┘  │
│                              │
│  [🎤 Speak it]   [Type it]  │  ← Two CTA buttons
│                              │
│  ┌────────────────────────┐  │
│  │ (Recording / typing    │  │  ← Inline response area
│  │  area appears)         │  │
│  └────────────────────────┘  │
│                              │
│     [Plant your first seed]  │  ← Submit button
└─────────────────────────────┘
```

After completing: Navigate to Today screen. Show a small toast: "Your garden has started growing."

### Task 10.2: Backend Onboarding Endpoint

**New API endpoint:** `POST /api/mobile/onboard`

```typescript
// Request body:
{
  name: string;
  eveningTime: string;          // "21:00" — user's preferred evening question time
  firstResponse: string;        // Their answer to the first question
  inputMethod: "voice" | "text";
}

// What it does:
// 1. Create/update user profile with name
// 2. Store evening time preference
// 3. Save first response as a journal entry + memory
// 4. Generate first mood from the response (via LLM)
// 5. Plant the "first seed" in their garden data
// 6. Schedule their first real evening question for tonight/tomorrow
```

### Task 10.3: WhatsApp Onboarding (First Message)

**File to modify:** `src/lib/whatsapp/onboarding.ts` (~96 lines)

**Current:** Sends a welcome message with feature overview.

**New first message (simpler, focused):**
```
Hey. I'm Groot.

Every evening, I'll ask you one question about your day.
Just reply. That's it.

Here's your first one:
*What's something you noticed about yourself recently?*
```

No feature lists. No "I can help you with X, Y, Z." Just the core loop.

### Task 10.4: Onboarding State Tracking

**New column in `users` table:**
```sql
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN onboarding_step INTEGER DEFAULT 0;
```

**File to modify:**
- `mobile/app/_layout.tsx` — Check `onboarding_completed` on app launch. If false, redirect to onboarding screen.
- `mobile/lib/api.ts` — Add `getOnboardingStatus()` and `completeOnboarding()` calls.

### Task 10.5: "Magic Moment" — First Garden View

After the first 3 days of journal entries, show a special notification/card on the Today screen:

```
Your garden is growing!
3 moments planted this week.
[See your garden →]
```

Tapping opens the Garden tab where they see their first 3 flowers.

**Implementation:**
- `mobile/app/(tabs)/today.tsx` — Add conditional rendering for new users (< 7 days)
- Check moment count. At 3, show the nudge card. At 7, show "Your first week!"

---

## Summary Timeline

| Sprint | Name | Days | Core Deliverable |
|--------|------|------|------------------|
| **0** | Cleanup & Foundation | 1-3 | Remove Telegram, hide commodity features |
| **1** | Evening Ritual | 3-8 | Contextual AI-generated evening questions |
| **2** | Morning Callback | 8-12 | "Yesterday you said..." + contextual midday |
| **3** | Today Screen | 12-20 | New mobile home built around daily ritual |
| **4** | Living Earth Design | 15-22 | Unified color system + typography + motion |
| **5** | Garden Visualization | 22-35 | Mood Meadow with flowers, vines, seasons |
| **6** | Week in 3 Moments | 30-38 | Structured weekly report replacing wall of text |
| **7** | Mirror Screen | 35-42 | Self-understanding page with AI bio + patterns |
| **8** | Web Portal Alignment | 42-52 | Web matches mobile design + IA |
| **9** | Voice-First | 50-58 | Voice morning check-ins + weekly recaps |
| **10** | Onboarding | 55-65 | First-launch magic with 5-screen flow |

**Total estimated timeline:** ~65 working days (13 weeks / ~3 months)

**Note:** Sprints overlap intentionally. Design work (Sprint 4) can run in parallel with backend (Sprints 1-2). Web alignment (Sprint 8) can start once mobile design is settled.

---

## Critical Path

The non-negotiable execution order:

```
Sprint 0 (Cleanup)
    ↓
Sprint 1 (Evening Ritual)  ← THE core change. Everything else builds on this.
    ↓
Sprint 2 (Morning Callback)
    ↓
Sprint 3 (Today Screen)  ←→  Sprint 4 (Design Language)  [parallel]
    ↓
Sprint 5 (Garden Viz)
    ↓
Sprint 6 (Weekly Report)  ←→  Sprint 7 (Mirror)  [parallel]
    ↓
Sprint 8 (Web)  ←→  Sprint 9 (Voice)  [parallel]
    ↓
Sprint 10 (Onboarding)  ← Last, because it showcases everything built above.
```

---

## New Files Summary

| File | Sprint | Purpose |
|------|--------|---------|
| `src/lib/journal/rich-context.ts` | 1 | Day context assembler for proactive messages |
| `supabase/migrations/XXX_proactive_history.sql` | 1 | Question deduplication + engagement tracking |
| `src/app/api/mobile/today/route.ts` | 3 | Today screen API |
| `mobile/components/ui/moment-card.tsx` | 3 | Storyworthy prompt card |
| `mobile/components/ui/streak-bar.tsx` | 3 | Habit streak progress bar |
| `mobile/components/ui/observation-card.tsx` | 3 | Groot's observation card |
| `src/app/api/cron/prepare-evening/route.ts` | 3 | Pre-generate evening question at 6 PM |
| `mobile/components/ui/seed-loader.tsx` | 4 | Seed germination loading animation |
| `mobile/components/garden/mood-meadow.tsx` | 5 | Mood meadow flower visualization |
| `mobile/components/illustrations/flowers.tsx` | 5 | SVG flower assets (5 mood variants) |
| `mobile/components/garden/streak-vine.tsx` | 5 | Streak vine connecting days |
| `mobile/app/(tabs)/garden.tsx` | 5 | Garden tab screen |
| `src/lib/journal/weekly-synthesis.ts` | 6 | Structured weekly report generator |
| `mobile/components/garden/weekly-card.tsx` | 6 | Weekly reflection card |
| `mobile/app/(tabs)/mirror.tsx` | 7 | Mirror screen |
| `src/app/api/mobile/mirror/route.ts` | 7 | Mirror data API |
| `src/lib/milestones/engine.ts` | 7 | Milestone calculation |
| `src/lib/patterns/detector.ts` | 7 | Behavioral pattern detection |
| `mobile/components/mirror/profile-facts.tsx` | 7 | Expandable profile facts |
| `src/app/garden/garden/page.tsx` | 8 | Web garden page with SVG meadow |
| `src/app/garden/mirror/page.tsx` | 8 | Web mirror page |
| `mobile/app/onboarding.tsx` | 10 | Mobile onboarding flow |
| `src/app/api/mobile/onboard/route.ts` | 10 | Onboarding API endpoint |

## Modified Files Summary

| File | Sprints | What Changes |
|------|---------|-------------|
| `src/lib/messaging/dispatcher.ts` | 0 | Remove Telegram |
| `src/lib/proactive/scheduler.ts` | 0 | Remove Telegram refs |
| `src/lib/whatsapp/onboarding.ts` | 0, 10 | Remove Telegram, new first message |
| `src/lib/reminders/scheduler.ts` | 0 | Remove Telegram dispatch |
| `src/lib/env.ts` | 0 | Remove Telegram env vars |
| `src/types/whatsapp.ts` | 0 | Remove Telegram from Platform type |
| `src/lib/memory/memory-router.ts` | 0 | Disable link capture |
| `mobile/components/ui/compose-modal.tsx` | 0, 9 | Rename header, voice-first layout |
| `mobile/components/ui/bottom-tab-bar.tsx` | 0, 3 | Update tabs |
| `src/components/garden/sidebar.tsx` | 0, 8 | Remove items, redesign |
| `src/lib/journal/prompt-generator.ts` | 1 | Rich context integration |
| `src/app/api/cron/evening-reflection/route.ts` | 1 | Use day context, log history |
| `src/lib/memory/short-term.ts` | 1, 2 | Add helper methods |
| `src/app/api/cron/daily-checkin/route.ts` | 2, 9 | Morning callback, voice option |
| `src/app/api/cron/midday-nudge/route.ts` | 2 | Contextual nudge |
| `src/lib/messaging/pipeline.ts` | 2 | Track proactive replies |
| `mobile/app/(tabs)/_layout.tsx` | 3 | New tab structure |
| `mobile/app/(tabs)/today.tsx` | 3, 10 | Complete rewrite |
| `mobile/lib/theme/tokens.ts` | 4 | Living Earth palette |
| `src/styles/design-tokens.css` | 4, 8 | Living Earth CSS tokens |
| `mobile/constants/mood.ts` | 4 | Updated mood colors |
| `mobile/components/ui/press-scale.tsx` | 4 | Slower spring physics |
| `mobile/components/ui/glass-card.tsx` | 4 | Updated colors + breathing anim |
| `mobile/components/ui/gradient-background.tsx` | 4 | Updated gradient stops |
| `mobile/components/ui/steps-card.tsx` | 4 | Updated progress colors |
| `mobile/app/(tabs)/mood.tsx` | 5 | Replace year-in-pixels |
| `src/app/api/cron/weekly-report/route.ts` | 6, 7, 9 | Structured format, bio regen, voice |
| `src/app/garden/page.tsx` | 8 | Redesigned dashboard |
| `src/components/garden/bottom-nav.tsx` | 8 | Updated colors |
| `src/app/layout.tsx` | 8 | Add Instrument Serif font |
| `mobile/app/settings.tsx` | 9 | Voice preference settings |
| `mobile/app/_layout.tsx` | 10 | Onboarding redirect |

## Deleted Files

| File | Sprint | Reason |
|------|--------|--------|
| `src/lib/telegram/client.ts` | 0 | Telegram removed |
| `src/lib/telegram/webhook-parser.ts` | 0 | Telegram removed |
| `src/app/api/webhook/telegram/route.ts` | 0 | Telegram removed |

---

## Final Note

This plan is deliberately sequenced so that **Sprint 1 alone makes Groot 10x better.** If you only ship Sprint 1 — contextual, personal evening questions — the product transforms from "another AI chatbot" to "the friend who asks the right question at the right time."

Everything after Sprint 1 is amplification: making the ritual more visible (Today screen), more beautiful (Living Earth), more rewarding (Garden Meadow), and more insightful (Mirror). But the magic starts at 9 PM with one perfect question.