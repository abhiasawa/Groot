# Noto Redesign — Implementation Plan

**Source:** `template/Journal Mobile App.fig` (Figma/Sketch/XD design files)
**Date:** March 2026
**Scope:** Full visual redesign + new features from the template

---

## Design Spec (Extracted from Figma)

### Color Palette

```
Background (canvas):     #F0EFEB   (warm cream — replaces current #FEFEFE)
Card surface:            #FFFFFF
Primary text:            #1E1E1E
Secondary text:          #555555
Muted text:              rgba(30,30,30,0.6)
Accent (primary):        #FFBB2C   (warm amber — calendar highlight, FAB, CTA)
Accent (orange):         #FF8815   (sun icon, waveform played)
Waveform unplayed:       #D9D9D9
Journal card hero:       #FFC856   (golden yellow)
Journal card sidebar:    #CFC5B6   (warm taupe)
Quick Journal pink:      #F3D3CC   (pastel rose)
Quick Journal lavender:  #E1D8FF   (light purple)
Quick Journal beige:     #DDDBCE   (warm stone)
Tag "Personal":          #EE2336   (red)
Tag "Family":            #803EF2   (violet)
Emotion: Happy:          #FFBB2C   (amber)
Emotion: Sad:            #764539   (brown)
Emotion: Calm:           #8AA230   (olive green)
Emotion: Anxious:        #787163   (warm gray)
Avatar circle:           #D0C5B6   (beige)
Back button bg:          #FFFFFF
Separator line:          #EAEAEA
```

### Typography

```
Font family:             Plus Jakarta Sans (all weights)
Weights used:            Regular (400), Medium (500), SemiBold (600), Bold (700)

Greeting "Hi, Jose":     SemiBold, ~24px
Section header:          SemiBold, ~18px
Section action:          Medium, ~14px
Calendar day label:      Medium, ~13px
Calendar day number:     Medium, ~14px (SemiBold when active)
Stats large number:      Bold, ~64px
Stats subtitle:          Regular, ~14px
Emotion title:           SemiBold, ~18px
Emotion subtitle:        Regular, ~13px
Emotion label:           Medium, ~14px
Quick Journal title:     SemiBold, ~15px
Quick Journal body:      Regular, ~13px
Tab label:               Medium, ~11px
Body text:               Regular, ~16px, line-height 1.6
Tags:                    Medium, ~13px
Audio timestamp:         Medium, ~14px
Journal Title:           Bold, ~28px
Date accent:             SemiBold, ~14px, color #8F4601
```

### Layout & Spacing

```
Screen width:            390px (iPhone standard)
Screen padding:          16px horizontal
Card corner radius:      ~16px (quick journal), ~20px (large cards)
Tab bar height:          96px (with safe area)
Tab bar bg:              #F0EFEB (same as canvas — no border, no blur)
Tab bar icon size:       24px
Tab bar FAB:             48x48, #FFBB2C fill, centered + icon
Avatar:                  48x48, circle
Calendar day pill:       48x48 circle, white default, #FFBB2C active
Quick journal card:      160x140
Audio player bar:        358x56, white bg, waveform bars 2px wide
Back button:             48x48, white circle, arrow-left icon
Tags:                    28px height, white bg, rounded pill
Action FAB row:          3 white circle buttons (edit, bookmark, delete) 48x48
```

### Screens

```
1. Home Screen
   - Header: "Hi, {name}" + avatar (48px circle)
   - Week calendar: Mon–Sun labels + date circles (active = amber)
   - "My Journal" section with hero illustration card (278x243) + sidebar
   - "Quick Journal" horizontal scroll cards (3 prompt cards)
   - Tab bar: Home (active), Explore, + (FAB), Journey, Profile

2. Journal Reports
   - Nav: back button + "My Journal" centered title + dots menu
   - Large stat: "420" in ~64px bold
   - Subtitle: motivational text
   - Emotions card: white card with "Emotions" title + 4 vertical bar chart
   - Bars: Happy (#FFBB2C), Sad (#764539), Calm (#8AA230), Anxious (#787163)
   - CTA button: "Create a New Journal" full-width, #FFBB2C fill

3. Journal Detail
   - Back button top-left
   - Date in accent color (#8F4601)
   - "Journal Title" in bold ~28px
   - Tags row (Tag 1, Tag 2, Tag 3) as white pills
   - Hero image (358x180)
   - Audio player bar with waveform + timestamp
   - Body text (lorem ipsum placeholder)
   - Floating action row at bottom: edit, bookmark, delete (3 white circles)
```

---

## Architecture: What Changes

### Current Noto → New Design

```
CURRENT                           NEW (from Figma template)
─────────────────────────────     ─────────────────────────────────
Single stack nav                  Tab navigation (4 tabs + center FAB)
Masonry grid feed                 Home: greeting + calendar + journal + prompts
Cloud mascot FAB                  Amber circle FAB in tab bar center
Sora + Manrope fonts              Plus Jakarta Sans (single family)
#FEFEFE white bg                  #F0EFEB warm cream bg
Pastel category cards             White cards + colored prompts
Search bar always visible         Search on Explore tab (future)
Settings via avatar tap           Profile tab
Capture modal                     FAB in tab bar triggers capture
Card detail slide-up              Journal detail full screen
```

---

## Implementation Phases

### Phase 0: Dependencies & Font Setup
**Files:** `app/_layout.tsx`, `package.json`

- [ ] Install `@expo-google-fonts/plus-jakarta-sans`
- [ ] Remove `@expo-google-fonts/sora` and `@expo-google-fonts/manrope` imports
- [ ] Load all 4 weights: Regular, Medium, SemiBold, Bold
- [ ] Update fallback loading screen to use new font + amber accent

### Phase 1: Theme Tokens
**Files:** `lib/theme/tokens.ts`, `constants/typography.ts`, `constants/card-colors.ts`

- [ ] Replace `notoTheme` colors:
  - background: `#F0EFEB`
  - foreground: `#1E1E1E`
  - card: `#FFFFFF`
  - secondary: `#555555`
  - muted: `rgba(30,30,30,0.6)`
  - accent: `#FFBB2C` (amber)
  - accentForeground: `#1E1E1E`
  - destructive: `#EE2336`
  - border: `#EAEAEA`
  - shadowColor: `rgba(0,0,0,0.06)`
- [ ] Update `typography.ts` — all references to `Plus Jakarta Sans`:
  - hero: 64px/Bold (stats number)
  - title: 28px/Bold
  - xl: 24px/SemiBold (greeting)
  - lg: 18px/SemiBold (section headers)
  - base: 16px/Regular (body)
  - sm: 14px/Medium (labels, actions)
  - xs: 13px/Medium (calendar, subtitles)
  - caption: 11px/Medium (tab labels)
- [ ] Add new color constants for the template palette:
  - `EMOTION_COLORS`: happy (#FFBB2C), sad (#764539), calm (#8AA230), anxious (#787163)
  - `PROMPT_COLORS`: rose (#F3D3CC), lavender (#E1D8FF), stone (#DDDBCE)
  - `TAG_COLORS`: personal (#EE2336), family (#803EF2)

### Phase 2: Navigation — Tabs
**Files:** `app/_layout.tsx`, `app/(tabs)/_layout.tsx` (NEW), `app/(tabs)/index.tsx`, `app/(tabs)/explore.tsx` (NEW), `app/(tabs)/journey.tsx` (NEW), `app/(tabs)/profile.tsx` (NEW)

- [ ] Convert from single Stack to Tab navigator layout
- [ ] Create `app/(tabs)/_layout.tsx` with 5 tab positions:
  - Home (house icon, active fills #1E1E1E, inactive rgba(30,30,30,0.6))
  - Explore (search icon)
  - Center FAB spacer (48x48 amber circle with + icon — triggers capture modal)
  - Journey (clipboard-text icon)
  - Profile (user icon)
- [ ] Tab bar style: bg #F0EFEB, height 96px, no border, no blur
- [ ] Move current `index.tsx` feed logic → `app/(tabs)/index.tsx` (Home)
- [ ] Create placeholder `explore.tsx` (search + discover thoughts)
- [ ] Create placeholder `journey.tsx` (journal reports/stats)
- [ ] Move settings → `profile.tsx` (rename to Profile)
- [ ] Keep `capture`, `card-detail`, `onboarding` as Stack screens above tabs

### Phase 3: Home Screen Redesign
**Files:** `app/(tabs)/index.tsx`, new components

- [ ] **Header**: "Hi, {displayName}" in 24px SemiBold + 48px avatar circle (beige #D0C5B6)
- [ ] **Week Calendar** (NEW component `components/home/week-calendar.tsx`):
  - Row of Mon–Sun labels (13px, muted color)
  - Row of 7 date circles (48x48, white default, #FFBB2C for today)
  - Show current week dates
  - Tapping a day filters journal entries (future enhancement)
- [ ] **My Journal Card** (NEW component `components/home/journal-hero.tsx`):
  - Horizontal layout: main card (278px) + sidebar strip (72px)
  - Main card: amber/gold (#FFC856) bg, "Let's start your day" title, subtitle, **animated sun**
  - Sidebar: taupe (#CFC5B6) bg, vertical "Evening" text (or time-of-day label)
  - "My Journal" header with "See all" action → navigates to Journey tab
  - Replace the current masonry grid as the hero element
- [ ] **Animated Sun** (NEW component `components/ui/animated-sun.tsx`):
  - Lives on the journal hero card as the focal illustration element
  - Built with React Native Reanimated (no Skia dependency)
  - **Visual design**: warm amber (#FFBB2C) circle body + 8 tapered rays radiating outward
    - Rays are rounded rect shapes rotated at 45° increments
    - Optional inner face: two dot eyes + small arc smile (friendly, minimal)
    - Warm glow: soft shadow/blur behind the body (#FF8815 at 30% opacity)
  - **Animation cycles** (ported from cloud mascot pattern):
    - **Idle rotation**: rays rotate very slowly (one full turn per 20s), continuous
    - **Breathe pulse**: body scales 1.0 → 1.06 → 1.0 over 3s, continuous
    - **Glow pulse**: shadow opacity oscillates 0.2 → 0.4 over 3.5s, continuous
    - **Wiggle** (random trigger every 5-8s): quick ±6° rotation, spring settle
    - **Bounce** (random trigger): translateY -12 → spring back, playful hop
    - **Happy shake** (random trigger): rapid small rotations ±3°, paired with scale squish
    - **Ray spread** (random trigger): rays scale outward 1.0 → 1.15 → 1.0, starburst effect
  - **Time-of-day variants** (optional future enhancement):
    - Morning (6-12): bright amber, energetic animations
    - Afternoon (12-17): warm orange tint, calm animations
    - Evening (17-21): sunset gradient (amber → coral), slower animations
  - **Size**: ~100px on the hero card, configurable via `size` prop
  - **Reduced motion**: respects `prefers-reduced-motion` — disables cycling, keeps only slow rotation
- [ ] **Quick Journal Prompts** (NEW component `components/home/quick-prompts.tsx`):
  - Horizontal ScrollView of 160x140 prompt cards
  - 3 cards with different pastel backgrounds:
    - "Pause & reflect" (#F3D3CC) → opens capture with "What are you grateful for?" pre-filled
    - "Set Intentions" (#E1D8FF) → opens capture with "How do you want to feel?"
    - "Embrace the Present" (#DDDBCE) → opens capture with "Let go of yesterday"
  - Each card: title (15px SemiBold) + body (13px Regular) + tag row at bottom
  - Tag row: "Today" label + category badge (Personal/Family)
- [ ] Remove: masonry grid, search bar, cloud mascot FAB, pull-to-refresh mascot

### Phase 4: Journal Reports Screen (Journey Tab)
**Files:** `app/(tabs)/journey.tsx`

- [ ] **Header**: back button (48px white circle) + "My Journal" centered + menu dots
- [ ] **Stats Hero**: large number (total entries) in 64px Bold + motivational subtitle
- [ ] **Emotions Card** (NEW component `components/journey/emotions-chart.tsx`):
  - White card (#FFFFFF) with 16px padding
  - "Emotions" title + subtitle
  - Separator line (#EAEAEA)
  - 4 vertical bar chart columns (Happy, Sad, Calm, Anxious)
  - Each bar: background #F0EFEB, filled portion with emotion color
  - Percentage label on filled bar
  - Emotion name below each bar
  - Data source: analyze memories for emotion keywords (reuse `EMOTION_WORDS` from card-colors.ts)
- [ ] **CTA Button**: "Create a New Journal" full-width, 56px height, #FFBB2C fill, 16px corner radius

### Phase 5: Journal Detail Screen
**Files:** `app/card-detail.tsx`

- [ ] Redesign to match template:
  - Back button: 48px white circle, top-left
  - Date: accent color (#8F4601), 14px SemiBold
  - Title: entry content first line or "Journal Entry", 28px Bold
  - Tags row: horizontal list of white pills (28px height, category + custom tags)
  - Hero image: if memory has `media_url`, show 358x180 rounded image
  - **Audio player** (NEW component `components/detail/audio-player.tsx`):
    - If voice memory: white bar (56px height) with play button (32px amber circle + triangle icon)
    - Waveform visualization: 2px wide bars, played = #FF720E, unplayed = #D9D9D9
    - Duration timestamp on the right
  - Body text: 16px Regular, #000000, 1.6 line-height
  - **Floating action bar** at bottom: 3 white circle buttons (48x48) — edit, bookmark, delete
  - Actions: edit → opens capture pre-filled, bookmark → (future), delete → confirm dialog

### Phase 6: Component Cleanup & Polish
**Files:** Multiple component files

- [ ] **Remove obsolete components:**
  - `components/ui/noto-mascot.tsx` (cloud mascot — replaced by animated sun)
  - `components/feed/masonry-grid.tsx` (masonry grid — home is now section-based)
  - `components/feed/thought-card.tsx` (pastel cards — replaced by journal entries)
  - `components/feed/skeleton-grid.tsx` (masonry skeleton — replace with section skeletons)
  - `components/feed/voice-waveform.tsx` (Skia waveform — replace with simpler bar waveform)
- [ ] **Update existing components:**
  - `components/ui/compose-modal.tsx`: update colors to new palette, font to Plus Jakarta Sans
  - `components/ui/pill-badge.tsx`: update to white bg pills with rounded style
- [ ] **New shared components:**
  - `components/ui/icon-button.tsx`: 48px white circle with icon (back, menu, actions)
  - `components/ui/section-header.tsx`: title + "See all" action pattern
  - `components/ui/amber-button.tsx`: full-width CTA with #FFBB2C fill

### Phase 7: New Functionality

#### 7a. Week Calendar with Day Filtering
- Tapping a calendar date filters the Journey/home to show only entries from that day
- Active day highlighted with #FFBB2C
- Horizontal swipe to navigate weeks

#### 7b. Emotion Tracking & Analytics
- **Client-side emotion analysis**: extend existing `EMOTION_WORDS` regex in `card-colors.ts` to classify memories into Happy/Sad/Calm/Anxious
- **Emotion distribution**: calculate percentages for the bar chart
- **Per-entry emotion tagging**: store emotion alongside category when creating memories
- Consider adding an API endpoint or local calculation for emotion stats

#### 7c. Quick Journal Prompts
- Pre-fill capture modal with prompt text when user taps a prompt card
- Add `initialPrompt` prop to `ComposeModal`
- Prompts rotate or can be customized

#### 7d. Audio Playback in Detail View
- Add `expo-av` for audio playback (if not already installed)
- Play/pause voice memories directly in the detail view
- Show progress through waveform visualization
- Display elapsed time / total duration

#### 7e. Journal Entry Actions (Edit, Bookmark, Delete)
- **Edit**: re-open capture modal pre-filled with existing content
- **Bookmark/Favorite**: add a `bookmarked` flag to memories (local or API)
- **Delete**: existing delete with confirmation dialog (already implemented)

#### 7f. Profile Tab
- Move settings content to Profile tab
- Add user avatar, display name at top
- Keep export (JSON/Markdown) and sign out functionality

---

## File Change Summary

```
MODIFIED FILES:
  app/_layout.tsx                    — Font swap, add tab navigation
  lib/theme/tokens.ts                — New color palette
  lib/theme/provider.tsx             — Update if needed
  constants/typography.ts            — Plus Jakarta Sans scale
  constants/card-colors.ts           — Add emotion colors, prompt colors
  components/ui/compose-modal.tsx    — New colors/fonts, add initialPrompt prop
  components/ui/pill-badge.tsx       — White bg pill style
  app/card-detail.tsx                — Full redesign to template style
  app/settings.tsx                   — Refactor into profile tab
  app/onboarding.tsx                 — Update colors/fonts

NEW FILES:
  app/(tabs)/_layout.tsx             — Tab navigator with 5 positions + FAB
  app/(tabs)/index.tsx               — Home screen (greeting + calendar + journal + prompts)
  app/(tabs)/explore.tsx             — Explore/search placeholder
  app/(tabs)/journey.tsx             — Journal reports/stats
  app/(tabs)/profile.tsx             — Profile (from settings)
  components/home/week-calendar.tsx  — Mon-Sun calendar strip
  components/home/journal-hero.tsx   — Illustration hero card with animated sun
  components/home/quick-prompts.tsx  — Horizontal prompt cards
  components/ui/animated-sun.tsx     — Animated sun character (replaces cloud mascot)
  components/journey/emotions-chart.tsx — Vertical bar chart for emotions
  components/detail/audio-player.tsx — Waveform audio player
  components/ui/icon-button.tsx      — 48px white circle icon button
  components/ui/section-header.tsx   — "Title + See all" pattern
  components/ui/amber-button.tsx     — Full-width amber CTA

DELETED FILES:
  components/ui/noto-mascot.tsx      — Cloud mascot (no longer used)
  components/feed/masonry-grid.tsx   — Masonry layout (replaced)
  components/feed/thought-card.tsx   — Pastel thought cards (replaced)
  components/feed/skeleton-grid.tsx  — Masonry skeleton (replaced)
  components/feed/voice-waveform.tsx — Skia voice waveform (replaced with simpler)
```

---

## Implementation Order

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 4 → Phase 6 → Phase 7

Rationale:
- Phase 0-1 (fonts + tokens): foundation, everything depends on these
- Phase 2 (tabs): structural change, must happen before screen work
- Phase 3 (home): most visible screen, biggest impact
- Phase 5 (detail): second most-used screen
- Phase 4 (journey): new screen, depends on emotion analysis
- Phase 6 (cleanup): remove old code after new screens are stable
- Phase 7 (features): incremental additions after visual redesign is solid
```

---

## Test Gates

After each phase, verify:
- [ ] `npx tsc --noEmit` passes (no type errors)
- [ ] `npm run lint` passes
- [ ] App builds: `cd mobile/android && ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew assembleRelease`
- [ ] App runs on device without crashes
- [ ] Visual inspection matches Figma template

---

## Risk Notes

1. **Tab navigation refactor** is the riskiest change — moving from Stack to Tabs restructures the entire app routing. Test auth flow carefully.
2. **Mascot transition**: Cloud mascot is replaced by an animated sun on the journal hero card — same animation DNA (float, wiggle, bounce, breathe) ported to the new warm aesthetic. Keeps the homepage feeling alive.
3. **Plus Jakarta Sans** must be confirmed available via expo-google-fonts before proceeding.
4. **Audio playback** (`expo-av`) may need `expo prebuild --clean` if not already in the native build.
5. **Emotion analysis** is approximate — keyword matching won't be perfect. Consider it a v1 that can be improved with AI classification later.
