# The Garden — Full Visual Redesign

**Date:** 2026-02-24
**Status:** Approved
**Reference:** Mood Tracker: Self-Care Habits (Google Play)

## Summary

Complete visual overhaul of the Groot mobile app ("The Garden") inspired by the warm, cozy aesthetic of the reference mood tracker app. Replaces the current cool teal/glassmorphic design with a warm sage-green + cream nature palette, illustrated mood faces, a Groot sprout mascot, a new Today dashboard home screen, and a 5-tab navigation with center FAB.

## Color System

### Light Theme

| Token | Old | New |
|-------|-----|-----|
| background | #F2F6F4 | #F5F2EB |
| foreground | #1A1E1C | #2D3A2E |
| primary | #176B5A | #4A7C59 |
| primaryForeground | #FFFFFF | #FFFFFF |
| secondary | #E6F1EC | #E8EDDF |
| secondaryForeground | #1F6A58 | #3D6B4A |
| accent | #F07B53 | #E8845A |
| accentForeground | #FFFFFF | #FFFFFF |
| muted | #EDF3F0 | #ECE9E1 |
| mutedForeground | #66746E | #7D8B7E |
| destructive | #C9554D | #C76A6A |
| card | #FFFFFF | #FFFFFF |
| cardForeground | #1A1E1C | #2D3A2E |
| border | rgba(33,101,84,0.16) | rgba(74,124,89,0.12) |
| input | rgba(33,101,84,0.16) | rgba(74,124,89,0.12) |
| ring | #176B5A | #4A7C59 |
| moodGreat | #1FA67A | #5BAE7C |
| moodGood | #37BD8D | #7EC8A0 |
| moodOkay | #E5A53D | #F0C76E |
| moodLow | #EB8C45 | #E8945C |
| moodBad | #CB5A53 | #D47B7B |
| moodNone | #D8DFDA | #D5D3CB |
| chart1 | #176B5A | #4A7C59 |
| chart2 | #F07B53 | #E8845A |
| chart3 | #4E7BDF | #5B8FD4 |
| chart4 | #A37F52 | #B09068 |
| chart5 | #8B66D0 | #9A7DC8 |
| glassSurface | #FFFFFF | #FFFFFF |
| glassBorder | rgba(61,106,92,0.18) | rgba(74,124,89,0.08) |
| glassHighlight | rgba(255,255,255,0.92) | rgba(255,255,255,0.95) |
| gradientStart | #F8FCFA | #FAF8F3 |
| gradientMid | #F1F8F5 | #F5F2EB |
| gradientEnd | #EAF3F0 | #EEF0E5 |
| shadowColor | rgba(20,28,24,0.08) | rgba(45,58,46,0.06) |
| elevatedShadowColor | rgba(18,24,22,0.16) | rgba(45,58,46,0.12) |
| auraPrimary | rgba(23,107,90,0.16) | rgba(74,124,89,0.10) |
| auraSecondary | rgba(240,123,83,0.11) | rgba(232,132,90,0.08) |
| auraTertiary | rgba(78,123,223,0.12) | rgba(91,143,212,0.08) |

### Dark Theme

Dark theme shifts the warm palette to deep forest tones:
- background: #141912
- foreground: #E5E8E0
- primary: #8BC4A0
- secondary: #242E22
- accent: #F0A07A
- muted: #1E2620
- mutedForeground: #A0AEA2
- Mood colors: lighter/brighter versions of light theme

## Navigation — 5 Tabs with Center FAB

```
[ Today ]  [ Journal ]  [ (+) ]  [ Mood ]  [ Insights ]
```

- Today (Sprout icon) — new home dashboard
- Journal (BookOpen icon) — memories
- Center FAB — raised 56px circle, sage green, white + icon
- Mood (SmilePlus icon) — mood tracking
- Insights (BarChart3 icon) — reports

Settings/Profile/Topics: accessible from Today screen header (gear icon → navigates to settings deep screen, avatar → profile).

## Today Dashboard (New Screen)

Layout top-to-bottom:
1. Header: "The Garden" + settings gear + avatar
2. Groot Sprout mascot with speech bubble (time-of-day greeting)
3. Mood check-in: "How are you today?" + 5 mood faces row
4. Today's Tasks: 2-3 pending tasks with checkboxes
5. Quick Stats: 3-card row (streak, open tasks, recent mood)
6. Recent Journal: 1-2 latest entries as compact cards

## Mood Faces (SVG Illustrations)

5 faces replacing plain colored dots:
- Score 1 (Terrible): #D47B7B — frowning, downturned eyes
- Score 2 (Bad): #E8945C — slightly sad
- Score 3 (Okay): #F0C76E — neutral flat mouth
- Score 4 (Good): #7EC8A0 — gentle smile
- Score 5 (Excellent): #5BAE7C — big happy grin

Used in: Today mood check-in, Mood calendar cells, mood trend cards.

## Groot Sprout Mascot (SVG)

Simple illustrated tree sprout:
- Small trunk, 2-3 leaves, dot eyes, subtle smile
- Appears on Today screen with speech bubble
- Speech changes by time-of-day and recent mood data
- Built with react-native-svg

## Card Style

Replace GlassCard glassmorphism with warm solid cards:
- backgroundColor: #FFFFFF
- borderRadius: 16
- shadow: color #2D3A2E, opacity 0.06, radius 12, offset {0, 4}
- No border (or very subtle #E8EDDF 1px)
- Optional left accent strip for mood/category
- Padding: 20-24px

## Bottom Tab Bar

- White background, subtle top shadow (no border line)
- Center FAB: 56px sage green circle, elevated, white + icon
- Active: sage green icon + label + dot indicator
- Inactive: sage gray #7D8B7E
- Press animations + haptic feedback

## Files

### New
- components/illustrations/groot-sprout.tsx
- components/illustrations/mood-faces.tsx
- app/(tabs)/today.tsx

### Modified
- lib/theme/tokens.ts
- constants/mood.ts
- app/(tabs)/_layout.tsx
- components/ui/bottom-tab-bar.tsx
- components/ui/glass-card.tsx (refactor to warm card style)
- components/ui/gradient-background.tsx
- app/(tabs)/journal.tsx
- app/(tabs)/mood.tsx
- app/tasks.tsx
- app/insights.tsx
- app/(tabs)/more.tsx (remove or repurpose)

### Dependencies
- react-native-svg (explicit install, already peer-dep of lucide)
