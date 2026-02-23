# Storyworthy Journaling — Design Doc

**Date:** 2026-02-23
**Status:** Approved

## Context

Inspired by Matthew Dicks' *Storyworthy* — specifically the "Homework for Life" practice. The core idea: every day has a storyworthy moment — a five-second instant when something shifts. Capturing these builds a storytelling lens that slows down time and makes life more deliberate.

## Two Deliverables

### 1. Prompt Upgrades

Replace existing generic evening/midday prompts with Storyworthy-blended versions in Groot's natural voice.

**Evening Reflection** — replace 10 generic prompts with Storyworthy-informed alternatives:
- Homework for Life style: "What's one moment from today you'd actually tell someone about?"
- Five-second probes: "Was there a moment today where something clicked — or shifted?"
- Small > Big: "Any small thing happen today that felt surprisingly meaningful?"
- Transformation: "Did anything change how you see something — even a little?"
- Softer rotations for variety

**Midday Nudge** — reframe through storytelling lens:
- "Anything happening right now you'd want to remember later?"
- "What's the most interesting thing about today so far?"

**Morning Check-in** — add occasional First/Last/Best/Worst bonus prompts.

**Persona** — add Storyworthy context line so Groot probes for the *moment*, not the event.

### 2. Stories Page (`/garden/stories`)

**Hero: Today's Story** — large card showing today's captured moment, or a prompt state.

**Timeline: Story Archive** — vertical timeline grouped by week, mood-colored borders, expandable cards. Infinite scroll.

**Stats Strip** — streak counter, total stories, monthly trend, common themes.

**Data Source:** messages with `shouldStoreMemory: true` or evening reflection responses, identified by `memoryTags` metadata.

**Navigation:** Add "Stories" to sidebar between Journal and People.
