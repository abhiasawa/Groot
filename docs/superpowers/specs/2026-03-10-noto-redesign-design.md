# Noto — Product Requirements Document

**Date:** 2026-03-10
**Status:** Draft
**Previous name:** Groot (The Garden)

---

## 1. Overview

Noto is a mymind-inspired thought capture app. It replaces the previous Groot mobile experience with a fundamentally different philosophy: capture anything, organize nothing, find everything.

The app is a private place for thoughts. There are no folders, no tags to manage, no categories to choose. Users dump text, voice, and images into a single stream. AI silently indexes everything behind the scenes. The only retrieval mechanism is search.

**Core proposition:** Stream-of-consciousness capture with zero-friction input and AI-powered retrieval.

---

## 2. Design Principles

| Principle | Implementation |
|---|---|
| Capture everything | Text, voice, photos — all first-class. No friction, no metadata to fill. |
| Organize nothing | Zero manual organization. No folders, tags, or categories exposed to the user. |
| Find everything | AI-powered search across text, voice transcripts, and image descriptions. |
| Invisible AI | AI silently tags and indexes content. It never responds, suggests, or prompts. |
| Fully passive | No notifications, no nudges, no check-in prompts. The user comes when they want. |
| Content-forward | Bright, clean, white canvas. Content is the visual. No chrome competing for attention. |

**Visual direction:** mymind-inspired — white canvas, soft pastel card colors, clean typography, no dark mode.

---

## 3. App Surfaces

Noto has exactly three surfaces. No tabs, no navigation drawer.

### 3.1 The Feed (Home Screen)

The default and only persistent screen. A masonry grid of thought cards.

**Layout:**
- 2-column masonry grid, cards sized to content
- Header: "Noto" + thought count (left), avatar/settings button (right)
- Search bar always visible below header
- FAB centered at bottom — black circle, white `+` icon

**Cards:**
- AI-assigned soft pastel backgrounds based on content type:
  - Blue — tasks
  - Amber — ideas
  - Green — reflections
  - Rose — emotions
  - Gray — media
- Relative timestamps ("2m ago", "yesterday"), no absolute dates
- Newest first, no date grouping headers

**Interactions:**
- Scroll to browse
- Tap card to expand (full-screen detail view)
- Pull to refresh
- Tap FAB to open capture sheet
- Tap search bar to enter search mode

### 3.2 Capture Sheet (Bottom Sheet)

Opens from the FAB as a bottom sheet overlay. Three input modes:

**Text:**
- Auto-focused text input on open
- No title field, no category picker
- Send button commits the thought
- Sheet dismisses, new card appears at feed top

**Voice:**
- Tap mic to record
- Skia waveform visualization during recording
- Release or tap stop to auto-send
- Transcription happens server-side, silently

**Photo/Camera:**
- Opens system image picker or camera
- Optional caption field
- Send commits photo + caption as a thought

**Post-capture behavior:**
- Sheet dismisses immediately
- New card animates into feed at position [0,0]
- No AI reply, no confirmation dialog, no toast

### 3.3 Search (Feed Transform)

Search is not a separate screen. It transforms the feed in-place.

**Flow:**
1. Tap search bar — keyboard appears, background darkens, white input text
2. Type query — cards filter live as the user types
3. AI-powered: matches against text content, voice transcripts, and image descriptions
4. Cancel (X or back) restores the full feed

No search history. No suggested queries. Just a text input and results.

---

## 4. Skia Animations

All animations use `@shopify/react-native-skia` and Reanimated for GPU-accelerated rendering.

| Animation | Surface | Description |
|---|---|---|
| Card Entrance | Feed | Staggered fade-in + scale-up as cards appear on load or after capture |
| Search Filter | Feed/Search | Non-matching cards shrink and fade out; matching cards reposition smoothly |
| Capture Send | Capture Sheet | Content morphs from the input area into a card shape flying to the feed |
| Voice Waveform | Capture Sheet | Real-time audio visualization during voice recording |
| Pull to Refresh | Feed | Custom Skia-drawn refresh indicator replacing the system default |
| Card Tap Expand | Feed | Card expands to full-screen with path morphing transition |

**Mascot:** A cloud character (lavender/indigo palette, peaceful face, calming presence) rendered and animated with Skia. Used sparingly — empty states, onboarding.

---

## 5. Architecture

### Navigation

Single stack navigator. No tab bar.

```
Stack
  app/index.tsx        -- Feed (masonry grid + search)
  app/capture.tsx      -- Capture modal (bottom sheet)
  app/settings.tsx     -- Settings (retained as-is)
```

### New Components

```
components/
  feed/
    masonry-grid.tsx    -- 2-column masonry layout
    thought-card.tsx    -- Individual card (pastel bg, content, timestamp)
    voice-waveform.tsx  -- Skia voice recording visualization
    card-detail.tsx     -- Full-screen expanded card view
```

### New Modules

```
lib/theme/tokens.ts           -- Light-mode white canvas theme tokens
constants/card-colors.ts      -- Pastel color map by content type
```

### Data Flow

```
Capture --> API (POST /thoughts) --> Supabase
                                  --> AI pipeline (silent: tag, index, transcribe)

Feed    <-- React Query (GET /thoughts) <-- Supabase
Search  <-- React Query (GET /thoughts?q=) <-- Supabase (AI-indexed search)
```

---

## 6. Removed Features

Everything below is removed from the previous Groot mobile app:

- Tab navigation and bottom tab bar
- Dark mode / Living Earth theme
- Gradient backgrounds
- Glassmorphic card styling
- Calendar view
- Timeline / list view
- Content type filter pills
- Date grouping headers
- AI companion responses ("Groot asked:" context messages)
- Notification system (check-ins, nudges, reminders)
- Memory detail modal (replaced by card expand)

---

## 7. Retained Features

The following carry over unchanged or with minimal adaptation:

- **Auth flow** — Google Sign-In, same Supabase auth
- **Capture modal** — Simplified (text/voice/photo only, no metadata)
- **Settings screen** — Retained as-is
- **React Query + AsyncStorage** — Persistence layer unchanged
- **API layer** — `client.ts`, `queries.ts` unchanged
- **Backend API endpoints** — No backend changes required
- **Supabase database** — Same schema, AI indexing added server-side

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native / Expo SDK 54, Expo Router |
| Animations | @shopify/react-native-skia, React Native Reanimated 4.x |
| State / Data | TanStack React Query, AsyncStorage persistence |
| Backend | Supabase (Postgres, Auth, Storage) |
| AI (server-side) | Silent tagging, transcription, image description — provider-agnostic |
| Target | Android (arm64-v8a), iOS |
