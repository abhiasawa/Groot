# Groot - AI Second Brain

## Project Overview

Groot is an AI Second Brain & Empathetic Life Companion that lives on WhatsApp. It combines knowledge management, emotional companionship, and a WhatsApp-native experience — something no existing app does.

**Primary Interface:** WhatsApp (via Meta Cloud API)
**Web Portal:** "The Garden" — a Next.js dashboard for memories, knowledge graph, habits, and reports
**Personality:** Empathetic, supportive, disciplined (J.A.R.V.I.S. vibe)

## Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript strict mode)
- **Messaging:** Meta WhatsApp Cloud API (free, official, no Twilio)
- **AI Engine:** Claude Sonnet (default) — swappable to OpenAI/Gemini via provider abstraction
- **Long-term Memory:** Supermemory.ai SDK
- **Voice:** OpenAI Whisper (transcription), OpenAI TTS (voice replies)
- **Vision:** Claude Vision (OCR, image analysis)
- **Database:** Supabase (Postgres) with RLS
- **Rate Limiting:** Upstash Redis
- **Deployment:** Vercel
- **Cron Scheduling:** Upstash QStash

## Architecture

### Provider Abstraction
All AI calls go through modular interfaces (`LLMProvider`, `VisionProvider`, `TranscriptionProvider`, `TTSProvider`). Switch providers by changing env vars — zero code changes.

### Async Webhook Processing
WhatsApp webhook validates signature, deduplicates, returns 200 immediately. Processing happens asynchronously to prevent Meta retries.

### Dual-Track Memory
- **Short-term:** Last 20 messages in Supabase (conversation context)
- **Long-term:** Semantic memory in Supermemory.ai (lifetime knowledge)

## Key Directories

```
src/
  app/api/webhook/whatsapp/   # WhatsApp webhook (heart of the app)
  app/api/cron/               # Scheduled jobs (check-ins, reports, reminders)
  app/garden/                 # The Garden web portal
  lib/ai/                     # Groot persona, context builder, intent classifier
  lib/providers/              # AI provider abstraction (LLM, Vision, TTS, Transcription)
  lib/memory/                 # Supermemory + Supabase memory layer
  lib/whatsapp/               # WhatsApp Cloud API client
  lib/habits/                 # Habit tracking logic
  lib/capture/                # Quick capture shortcuts, link summarization
  lib/reminders/              # Smart reminder system
  types/                      # TypeScript type definitions
supabase/migrations/          # Database schema (version-controlled)
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your API keys. See the API Key Setup Guide in `PLAN.md`.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
```

## Security Practices

- Webhook signature validation with `crypto.timingSafeEqual`
- Service role key isolated behind `server-only` import guard
- Input sanitization with DOMPurify for portal rendering
- Message deduplication via `processed_messages` table
- Rate limiting via Upstash Redis middleware
- Zod env var validation at startup
- AI provider circuit breaker with automatic fallback

## Conventions

- TypeScript strict mode with `noUncheckedIndexedAccess`
- Pino structured logging (not `console.log`)
- Supabase CLI migrations for schema changes
- All cron endpoints protected by `CRON_SECRET` Bearer token
- WhatsApp messages follow formatting rules: *bold* for labels, _italic_ for status, max 1-2 emoji, never >15 lines
