# The Garden — "Story Feed" Redesign

**Date:** 2025-02-24
**Status:** Approved
**Approach:** A — "The Story Feed" (3-tab, swipe-based, card-driven)

---

## 1. Design Philosophy

The Garden is not a dashboard. It's a **personal feed** — a living document of your life, told through your own words. Every design decision follows from this principle:

- **Content first, chrome second.** Cards contain your words, not UI labels.
- **Mood is color, not a section.** Emotional state is expressed through tints and accents woven throughout, not isolated in a "Mood" tab.
- **Less navigation, more immersion.** Three tabs, swipe gestures, bottom sheets — no menus, no grids, no "More" screens.
- **Instagram meets Apple Journal.** Rich, visual, card-based, story-driven.

---

## 2. Navigation Architecture

### 3-Tab Bottom Bar

```
┌─────────────────────────────────────────┐
│                                         │
│           Screen Content                │
│                                         │
├─────────────────────────────────────────┤
│    ☀ Today      📖 Timeline     👤 You  │
└─────────────────────────────────────────┘
```

| Tab | Icon | Purpose |
|-----|------|---------|
| **Today** | `Sun` | Your day at a glance — greeting, mood, stats, flashback, active tasks |
| **Timeline** | `BookOpen` | Your entire life feed — all memories, stories, mood entries |
| **You** | `User` | Your identity — profile, people, habits, tasks, settings |

### Tab Bar Design
- Height: 56px (reduced from 65)
- Background: `card` color (opaque, no glassmorphism)
- Border: 1px top, `border` color
- Active: `primary` color, filled icon variant
- Inactive: `mutedForeground`, outline icon variant
- Labels: Inter 500, 10px, sentence case
- Safe area: respect bottom inset

### Timeline Sub-Views (Swipeable)

Within the Timeline tab, a horizontal swipe indicator at top:

```
┌─────────────────────────────────────┐
│  All  ·  Stories  ·  Mood           │  ← underline indicator
├─────────────────────────────────────┤
│                                     │
│  ← swipe left/right between views → │
│                                     │
└─────────────────────────────────────┘
```

Implementation: `react-native-pager-view` for native-feeling horizontal swipe between three FlatList views.

### Screens Killed

| Old Screen | Disposition |
|---|---|
| Home (index.tsx) | → Rewritten as **Today** tab |
| Journal (journal.tsx) | → Rewritten as **Timeline > All** view |
| Stories (stories.tsx) | → Rewritten as **Timeline > Stories** view |
| Mood (mood.tsx) | → Rewritten as **Timeline > Mood** view |
| More (more.tsx) | → **Deleted** |
| Profile (profile.tsx) | → Folded into **You** tab |
| People (people.tsx) | → Folded into **You** tab |
| Habits (habits.tsx) | → Folded into **You** tab |
| Tasks (tasks.tsx) | → Folded into **You** tab |
| Insights (insights.tsx) | → Smart card on **Today** tab when available |
| Topics (topics.tsx) | → **Deleted** (accessible via search) |
| Settings (settings.tsx) | → Gear icon in **You** tab header |

### Stack Screens Remaining
```
_layout.tsx (root)
├── (auth)/login.tsx
├── (tabs)/
│   ├── _layout.tsx (3-tab Tabs navigator)
│   ├── index.tsx → Today
│   ├── timeline.tsx → Timeline (with swipeable sub-views)
│   └── you.tsx → You
└── settings.tsx (pushed as stack from You tab gear icon)
```

---

## 3. Visual Language

### Kill List (things we remove)
- ❌ `GradientBackground` — replaced with flat `background` color
- ❌ `GlassCard` with BlurView — replaced with `Sheet` (opaque surface)
- ❌ ALL CAPS section headers — replaced with sentence case
- ❌ Staggered `FadeInDown` entry animations — replaced with instant render
- ❌ `AnimatedStat` counting animations — show static numbers
- ❌ `PillBadge` with full-round corners — replaced with `Tag` (8px radius)
- ❌ Accent left-border on cards — replaced with mood-colored top stripe (2px)
- ❌ Gradient shadows — replaced with subtle `border` lines

### New Components

#### `Sheet` (replaces GlassCard)
```
Background: colors.card (opaque)
Border: 1px colors.border
Radius: 16px
Padding: 16px
Shadow: none (use border for elevation)
No blur. No transparency. Works identically on iOS and Android.
```

#### `SectionLabel` (replaces SectionHeader)
```
Font: Inter 600, 13px
Case: Sentence case ("Your stats", not "YOUR STATS")
Color: mutedForeground
Letter-spacing: 0 (not 1.5)
No action link. Just a label.
```

#### `Tag` (replaces PillBadge)
```
Radius: 8px (not 100px)
Padding: 4px 10px
Font: Inter 500, 11px
Background: colors.muted
Color: colors.mutedForeground
```

#### `BottomSheet` (replaces centered Modal)
```
Slides up from bottom, 60% screen height default
Drag handle at top (4px × 32px rounded bar)
Background: colors.card
Radius: 20px top corners
Backdrop: black 40% opacity
Dismiss: drag down or tap backdrop
```

### Color System Update

Keep existing tokens but add:
```typescript
// New semantic tokens
surface: card,           // primary card/sheet background
surfaceElevated: card,   // same, for bottom sheets
subtle: border,          // subtle dividers and borders
tint: primary + '08',    // very light primary wash for backgrounds
```

Remove glassmorphic tokens (glassSurface, glassBorder, glassHighlight).
Remove gradient tokens (gradientStart, gradientMid, gradientEnd).

### Typography Updates

Add semantic aliases (keep existing scale):
```typescript
displayLarge: hero,      // 32px — greeting, mood word
displaySmall: title,     // 24px — section titles
headline: xl,            // 20px — card titles
body: base,              // 16px — content text
bodySmall: sm,           // 14px — secondary text
caption: xs,             // 12px — metadata, timestamps
micro: caption,          // 11px — badges, labels
```

### Interaction Model
- **Tap card** → bottom sheet with full detail
- **Pull to refresh** → all tabs
- **Swipe horizontal** → Timeline sub-views only
- **Long press** → future: quick actions (not in v1)
- **No stagger animations** → content appears instantly
- **Spring press** → keep PressScale for buttons (scale 0.97, not 0.985)

---

## 4. Screen Designs

### 4.1 TODAY Tab

A single scrollable page. No sections. Just a flowing narrative of your day.

```
┌─────────────────────────────────────┐
│                                     │
│  Good evening,                      │  ← displayLarge, foreground
│  Abhishek.                          │  ← displayLarge, primary, bold
│                                     │
│  You're feeling calm today.         │  ← body, mutedForeground
│  ● ─────────────────────            │  ← mood dot + subtle mood bar
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  42 memories · 3 tasks · 5d 🔥  │ │  ← compact stat row (Sheet)
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  ✨ From your memory            │ │  ← flashback card (Sheet)
│ │                                 │ │
│ │  "I finally understood why I    │ │
│ │   keep coming back to writing"  │ │
│ │                                 │ │
│ │  3 weeks ago                    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  📋 Open tasks                  │ │  ← active tasks card (Sheet)
│ │                                 │ │
│ │  ○ Submit tax returns           │ │
│ │  ○ Call dentist                 │ │
│ │  ○ Review PR for Maya           │ │
│ │                                 │ │
│ │  View all →                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  🔥 Habits today               │ │  ← habits summary (Sheet)
│ │                                 │ │
│ │  Reading  ████████░░  80%       │ │
│ │  Workout  ██████░░░░  60%       │ │
│ │  Meditate ░░░░░░░░░░  —        │ │
│ └─────────────────────────────────┘ │
│                                     │
│  48px bottom padding                │
└─────────────────────────────────────┘
```

**Data source:** `useHome()` + `useTasks()` + `useHabits()`

**Key decisions:**
- Greeting takes the entire top — it's the first thing you see
- Mood is woven into the greeting text, not a separate card
- Stats are one compact row (not a 2×2 grid)
- Flashback is the emotional centerpiece
- Tasks and habits are live, actionable cards (tap checkbox to complete)
- No "Open Journal" card — that's what the Timeline tab is for

### 4.2 TIMELINE Tab

Three swipeable sub-views sharing the same visual structure.

#### Common Header
```
┌─────────────────────────────────────┐
│  Timeline                🔍         │  ← title + search icon
│                                     │
│  All  ·  Stories  ·  Mood           │  ← swipe indicator tabs
│  ───                                │  ← underline on active
└─────────────────────────────────────┘
```

Search icon → taps to expand inline search bar + filter chips.

#### Sub-View: ALL (default)

Unified chronological feed of every memory.

```
│  Today                              │  ← date header, bodySmall
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ●  2:34 PM                      │ │  ← mood dot + time
│ │                                 │ │
│ │ Had a great call with the team  │ │  ← content (body)
│ │ about the Q2 roadmap. Finally   │ │
│ │ feels like we're aligned.       │ │
│ │                                 │ │
│ │ work · productivity             │ │  ← tags (caption, muted)
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📷  12:15 PM                    │ │  ← photo icon + time
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │     [inline image]          │ │ │  ← MediaPlayer
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ Lunch at the new place near    │ │  ← caption/description
│ │ the office                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│  Yesterday                          │  ← date header
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🎙  9:12 PM                     │ │  ← audio icon + time
│ │                                 │ │
│ │ [▶ ──────────── 1:23]          │ │  ← AudioPlayer
│ │                                 │ │
│ │ Talked about the trip plans     │ │  ← transcription
│ │ for next month...               │ │
│ └─────────────────────────────────┘ │
```

**Card design:**
- Sheet component, 16px padding
- Mood dot (left of timestamp) with mood color
- Media type icon (📷 🎙 or ● mood dot) for visual scanning
- Content truncated to 4 lines
- Tags below content in muted caption style
- Tap → bottom sheet with full content + media

**Pagination:** Infinite scroll, 20 items per page (existing logic).

#### Sub-View: STORIES

Only storyworthy moments. Bigger cards, more content visible.

```
│  This Week                          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ┌───────────────────────────┐   │ │  ← 2px top stripe in mood color
│ │                                 │ │
│ │  Wednesday                      │ │  ← day name
│ │                                 │ │
│ │  "I finally understood why I    │ │  ← full story content
│ │   keep coming back to this      │ │     (up to 8 lines)
│ │   project. It's not the money   │ │
│ │   — it's the craft."            │ │
│ │                                 │ │
│ │  self-reflection · work         │ │  ← tags
│ └─────────────────────────────────┘ │
```

**Key difference from All:** Stories get full-width cards with more content visible (8 lines vs 4). The mood color appears as a 2px top border stripe.

#### Sub-View: MOOD

Your emotional timeline. Visual-first, data-driven.

```
│                                     │
│  Feeling calm                       │  ← displaySmall + mood color
│  ● ● ● ● ● ● ●                    │  ← last 7 days as dots
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  Year in Pixels                 │ │  ← compact pixel grid
│ │  ●●●●●●●●●●●●●●●●●●●●         │ │
│ │  ●●●●●●●●●●●●●●●●●●●●         │ │
│ │  ●●●●●●●●●●●●●●●●●●●●         │ │
│ │  ●●●●●●●●●●●●○○○○○○○○         │ │
│ │                                 │ │
│ │  ■ Great  ■ Good  ■ Okay       │ │  ← legend
│ │  ■ Low    ■ Bad                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  Distribution                   │ │
│ │                                 │ │
│ │  Great   ████████████░  62%     │ │
│ │  Good    ██████░░░░░░░  24%     │ │
│ │  Okay    ██░░░░░░░░░░░   8%    │ │
│ │  Low     █░░░░░░░░░░░░   4%    │ │
│ │  Bad     ░░░░░░░░░░░░░   2%    │ │
│ └─────────────────────────────────┘ │
```

**Key difference:** This is a data-visualization view, not a feed. Shows the mood hero, year-in-pixels grid (keep existing), and distribution bars. Simpler than current — removes weekly trend section (distribution bars tell the same story).

### 4.3 YOU Tab

Everything about you, on one scrollable page.

```
┌─────────────────────────────────────┐
│                              ⚙️     │  ← gear icon → pushes Settings
│                                     │
│  ┌───┐                              │
│  │ A │  Abhishek                    │  ← avatar circle + name
│  └───┘  Joined Feb 2025            │  ← join date
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  About you                      │ │  ← profile facts (Sheet)
│ │                                 │ │
│ │  📍 Mumbai                      │ │
│ │  💼 Product Manager at Google   │ │
│ │  🐕 Dog parent (Max)            │ │
│ │  🏃 Loves running               │ │
│ │                                 │ │
│ │  See all →                      │ │  ← expands to show all facts
│ └─────────────────────────────────┘ │
│                                     │
│  People                             │  ← section label
│                                     │
│  ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐     │  ← horizontal scroll of avatars
│  │So│  │Ma│  │Ra│  │Vi│  │+3│     │
│  └──┘  └──┘  └──┘  └──┘  └──┘     │
│  Sonal  Maya  Rahul Vikram         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  Habits                         │ │  ← habits summary (Sheet)
│ │                                 │ │
│ │  Reading      5d streak  🔥     │ │
│ │  Workout      3d streak         │ │
│ │  Meditation   —                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  Tasks                          │ │  ← tasks list (Sheet)
│ │                                 │ │
│ │  ○ Submit tax returns           │ │  ← tap to toggle complete
│ │  ○ Call dentist                 │ │
│ │  ✓ Review PR for Maya           │ │  ← completed, strikethrough
│ └─────────────────────────────────┘ │
│                                     │
│  48px bottom padding                │
└─────────────────────────────────────┘
```

**Key decisions:**
- Profile facts shown as a clean list with emoji prefixes (not categorized into Static/Dynamic/Preference/Goal — users don't think in those terms)
- People as a horizontal scroll of avatar circles (initial-based, like WhatsApp's quick contacts)
- Habits show streak info inline, no heatmap in this view (keep it compact)
- Tasks are live — checkbox toggles completion immediately
- Settings pushed as a stack screen from the gear icon
- No separate "Profile", "People", "Habits", "Tasks" screens — everything is here

### 4.4 SETTINGS (Stack Screen)

Pushed from gear icon on You tab. Minimal.

```
┌─────────────────────────────────────┐
│  ←  Settings                        │
│                                     │
│  Appearance                         │  ← section label
│ ┌─────────────────────────────────┐ │
│ │  Light  ·  Dark  ·  System      │ │  ← segmented control
│ └─────────────────────────────────┘ │
│                                     │
│  Notifications                      │
│ ┌─────────────────────────────────┐ │
│ │  Evening journal        [═══]   │ │
│ │  Daily check-in         [═══]   │ │
│ │  Weekly report          [═══]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│  Account                            │
│ ┌─────────────────────────────────┐ │
│ │  Sign out                       │ │  ← destructive color
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 4.5 LOGIN (unchanged architecture, visual refresh)

Keep the 2-step OTP flow. Visual updates:
- Remove GradientBackground → flat `background` color
- Replace GlassCard → Sheet component
- Keep animations (FadeInDown on branding is fine for login)
- Sprout icon stays

---

## 5. Bottom Sheet Detail Views

When tapping any card in Timeline, it opens as a bottom sheet:

```
┌─────────────────────────────────────┐
│         ──── (drag handle)          │
│                                     │
│  Wednesday, Feb 19 · 2:34 PM       │  ← date + time
│  ● Feeling calm                     │  ← mood dot + label
│                                     │
│  Had a great call with the team     │  ← full content (scrollable)
│  about the Q2 roadmap. Finally      │
│  feels like we're aligned on the    │
│  direction. Maya's presentation     │
│  was particularly strong.           │
│                                     │
│  [media player if applicable]       │
│                                     │
│  work · productivity · career       │  ← tags
│                                     │
│  ─────────────────────────────────  │  ← divider
│                                     │
│  Groot asked:                       │  ← context message
│  "How was the team meeting?"        │
│                                     │
└─────────────────────────────────────┘
```

---

## 6. Empty States

Every section needs an empty state. Keep them warm and specific:

| Section | Empty State |
|---|---|
| Today (no data) | "Welcome to The Garden. Start talking to Groot on WhatsApp and your life data will appear here." |
| Timeline (no memories) | "Nothing here yet. Your memories from WhatsApp will show up as a timeline." |
| Stories (no stories) | "No stories yet. Share meaningful moments with Groot — the best ones become stories." |
| Mood (no mood data) | "No mood data yet. Groot picks up on how you're feeling from your conversations." |
| Tasks (no tasks) | "No tasks. Mention something you need to do in a conversation and Groot will track it." |
| Habits (no habits) | "No habits tracked yet. Tell Groot about a routine and it'll start tracking." |
| People (no people) | "No people detected yet. When you mention friends and family, they'll appear here." |
| Profile (no facts) | "Groot is still getting to know you. Keep chatting!" |
| Flashback (none) | Card simply doesn't render |

---

## 7. File Structure Changes

### Files to Create
```
mobile/app/(tabs)/timeline.tsx      → Timeline tab (new, swipeable)
mobile/app/(tabs)/you.tsx           → You tab (new, unified profile)
mobile/components/ui/sheet.tsx      → Sheet component (replaces GlassCard)
mobile/components/ui/section-label.tsx → SectionLabel (replaces SectionHeader)
mobile/components/ui/tag.tsx        → Tag component (replaces PillBadge)
mobile/components/ui/bottom-sheet.tsx → BottomSheet component
mobile/components/ui/avatar.tsx     → Avatar circle with initials
mobile/components/ui/stat-chip.tsx  → Compact stat chip for Today
```

### Files to Delete
```
mobile/app/(tabs)/more.tsx          → Killed
mobile/app/(tabs)/stories.tsx       → Folded into timeline.tsx
mobile/app/(tabs)/mood.tsx          → Folded into timeline.tsx
mobile/app/insights.tsx             → Folded into Today
mobile/app/topics.tsx               → Killed
mobile/app/people.tsx               → Folded into you.tsx
mobile/app/profile.tsx              → Folded into you.tsx
mobile/app/habits.tsx               → Folded into you.tsx
mobile/app/tasks.tsx                → Folded into you.tsx
mobile/components/ui/glass-card.tsx → Replaced by sheet.tsx
mobile/components/ui/gradient-background.tsx → Killed
mobile/components/ui/animated-stat.tsx → Killed
mobile/components/ui/pill-badge.tsx → Replaced by tag.tsx
mobile/components/ui/section-header.tsx → Replaced by section-label.tsx
```

### Files to Modify
```
mobile/app/(tabs)/_layout.tsx       → 3 tabs (Today, Timeline, You)
mobile/app/(tabs)/index.tsx         → Rewritten as Today
mobile/app/_layout.tsx              → Remove old stack screens
mobile/lib/theme/tokens.ts          → Add surface/tint, remove glass/gradient
mobile/constants/typography.ts      → Add semantic aliases
```

---

## 8. Dependencies to Add

```
react-native-pager-view     → Native swipe between Timeline sub-views
@gorhom/bottom-sheet        → Production-quality bottom sheet
```

No other new dependencies needed. Everything else (react-query, reanimated, lucide, expo-av) stays.

---

## 9. What We Keep

- ✅ `PressScale` — spring-based tap feedback (adjust scale to 0.97)
- ✅ `MediaPlayer` — audio/image inline rendering (already supports media: + storage:)
- ✅ `MoodDot` — mood indicator dots
- ✅ `Skeleton` — loading placeholders
- ✅ `SwitchToggle` — settings toggles
- ✅ All React Query hooks (`useHome`, `useMemories`, `useStories`, `useMood`, etc.)
- ✅ Auth flow (login.tsx) — visual refresh only
- ✅ Theme provider + tokens architecture
- ✅ Typography scale
- ✅ Pull-to-refresh on all tabs

---

## 10. Implementation Priority

1. **Foundation** — Sheet, SectionLabel, Tag, BottomSheet, Avatar components
2. **Tokens** — Update colors (remove glass/gradient, add surface/tint)
3. **Tab layout** — Reconfigure to 3 tabs (Today, Timeline, You)
4. **Today tab** — Rewrite index.tsx
5. **Timeline tab** — New timeline.tsx with PagerView + 3 sub-views
6. **You tab** — New you.tsx with profile/people/habits/tasks
7. **Settings** — Visual refresh (Sheet instead of GlassCard)
8. **Login** — Visual refresh
9. **Cleanup** — Delete old files, remove unused imports
10. **Polish** — Empty states, edge cases, pull-to-refresh
