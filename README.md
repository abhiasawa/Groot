<p align="center">
  <img src="mobile/assets/images/icon.png" width="120" alt="Groot Logo" />
</p>

<h1 align="center">Groot</h1>

<p align="center">
  <strong>Your AI Second Brain & Empathetic Life Companion</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> · <a href="#features">Features</a> · <a href="#how-it-works">How It Works</a> · <a href="#self-hosting-guide">Self-Host</a> · <a href="#mobile-app">Mobile App</a> · <a href="#api-reference">API</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Claude-Sonnet-D97706?logo=anthropic" alt="Claude" />
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="MIT License" />
</p>

---

## Quick Start

**Get Groot running in 5 minutes:**

```bash
# 1. Clone and install
git clone https://github.com/your-username/groot.git && cd groot && npm install

# 2. Copy env template
cp .env.example .env.local

# 3. Fill in your API keys in .env.local (see below)

# 4. Run database migrations (via Supabase SQL Editor or CLI)

# 5. Start the server
npm run dev
```

**Minimum keys needed:** Supabase (URL + keys), Anthropic API key, OpenAI API key, Supermemory API key. WhatsApp & Telegram are optional.

**For the mobile app:** See the [Mobile App](#mobile-app) section below.

---

## What is Groot?

Groot is an **AI-powered personal assistant** that remembers everything you tell it — forever. Chat naturally via **WhatsApp**, **Telegram**, or the **mobile app**, and Groot automatically organizes your life:

- 🧠 **Remembers** conversations, facts, preferences, and relationships
- 📝 **Extracts** tasks, reminders, and to-dos from natural language
- 😊 **Tracks** your mood and emotional patterns over time
- 📊 **Generates** weekly insight reports about your life
- 🏃 **Monitors** habits with streaks and check-ins
- 🔗 **Summarizes** links and articles you share
- 🎙️ **Understands** voice notes and images

Think of it as **J.A.R.V.I.S. meets a personal journal** — an always-available companion that's empathetic, supportive, and disciplined.

---

## Features

### 💬 Multi-Platform Messaging
Talk to Groot wherever you are. WhatsApp, Telegram, or the native mobile app — your conversations sync seamlessly.

### 🌱 The Garden — Web Dashboard
A beautiful web portal to explore your memories, journals, stories, mood trends, habits, tasks, topics, and weekly reports.

### 📱 Native Mobile App
A polished React Native app with:
- **Journal** — Searchable timeline with calendar navigation
- **Pulse** — Mood check-in, habit tracking with streaks & progress rings
- **Tasks** — AI-extracted to-dos with edit, complete, categorize
- **Settings** — Notification preferences, profile management

### 🧠 Dual-Track Memory
- **Short-term:** Last 20 messages for conversation context (Supabase)
- **Long-term:** Semantic lifetime memory via [Supermemory.ai](https://supermemory.ai) — Groot recalls facts about you months later

### 🔄 Swappable AI Providers
Change AI providers with a single env var. No code changes required.

| Capability | Default | Alternatives |
|---|---|---|
| Chat / Reasoning | Claude Sonnet | GPT-4o, Gemini |
| Vision / OCR | Claude Vision | GPT-4o Vision |
| Transcription | OpenAI Whisper | — |
| Text-to-Speech | OpenAI TTS | — |

### 📋 Smart Extraction
Every message is analyzed for:
- **Mood** — emotional state tracking
- **Tasks** — to-dos with categories and due dates
- **Reminders** — date-based event alerts
- **Profile facts** — job, location, relationships, preferences
- **People** — relationship mapping
- **Memory tags** — topic categorization

### 📈 Weekly Reports
Automated cron jobs generate weekly insight reports with mood trends, key topics, and personalized observations.

---

## How It Works

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   WhatsApp   │    │   Telegram   │    │  Mobile App  │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────┬───────┴───────────────────┘
                   ▼
         ┌─────────────────┐
         │  Message Pipeline│ ← Dedup, validate, parse
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │   Media Handler  │ ← Voice → text, Image → description
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │   Groot AI Core  │ ← Context + Memory + Persona
         └────────┬────────┘
                  ▼
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌────────┐  ┌─────────┐  ┌──────────┐
│Supabase│  │Supermemory│  │ Response │
│  (DB)  │  │(Long-term)│  │  + Reply │
└────────┘  └──────────┘  └──────────┘
```

---

## Self-Hosting Guide

### Prerequisites

- **Node.js** 18+ and **npm**
- A [Supabase](https://supabase.com) project (free tier works)
- A [Supermemory](https://supermemory.ai) account (for long-term memory)
- An AI provider API key (Anthropic, OpenAI, or Google)
- Optional: [Vercel](https://vercel.com) account for deployment
- Optional: Meta Developer account (for WhatsApp)
- Optional: Telegram bot via [@BotFather](https://t.me/BotFather)

---

### Step 1 — Clone & Install

```bash
git clone https://github.com/your-username/groot.git
cd groot
npm install
```

### Step 2 — Set Up Supabase

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Run the database migrations.** In the Supabase SQL Editor, run each file in `supabase/migrations/` in order:

```
001_initial_schema.sql          ← Core tables (users, messages, tasks, habits, etc.)
002_auth_link_and_secure_rls.sql ← Row Level Security policies
003_habit_streaks_unique_constraint.sql
004_add_performance_indexes.sql
005_memory_links.sql
006_add_query_indexes.sql
007_add_metadata_gin_index.sql
008_telegram_support.sql
009_media_storage.sql
010_deduplicate_habits.sql
011_cleanup_habits.sql
012_add_email_to_users.sql
013_login_otps.sql
014_cleanup_old_habits.sql
```

Or if you have the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase db push
```

4. **Create a storage bucket** called `media` (for voice notes and images):
   - Go to **Storage** in the Supabase dashboard
   - Click **New Bucket** → name it `media`
   - Set it to **Private**

### Step 3 — Set Up Supermemory

1. Sign up at [supermemory.ai](https://supermemory.ai)
2. Create an API key from the dashboard
3. Copy it → `SUPERMEMORY_API_KEY`

Supermemory handles Groot's long-term semantic memory. When you tell Groot something today, it will remember and reference it months later through vector search.

### Step 4 — Get AI Provider Keys

**Anthropic (Recommended for chat):**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key → `ANTHROPIC_API_KEY`

**OpenAI (Required for voice & TTS):**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key → `OPENAI_API_KEY`

**Google Gemini (Optional alternative):**
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create an API key → `GOOGLE_GEMINI_API_KEY`

### Step 5 — Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your keys:

```env
# ─── Required ───
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
SUPERMEMORY_API_KEY=your-supermemory-key

AI_PROVIDER=anthropic           # or openai, google
VISION_PROVIDER=anthropic       # or openai
TRANSCRIPTION_PROVIDER=openai
TTS_PROVIDER=openai

NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=any-random-secret-string

# ─── Optional: WhatsApp ───
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
META_APP_SECRET=your-meta-secret

# ─── Optional: Telegram ───
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret

# ─── Optional: Rate Limiting (Upstash) ───
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# ─── Optional: Cron Scheduling (Upstash QStash) ───
QSTASH_TOKEN=your-qstash-token
```

### Step 6 — Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see The Garden web portal.

### Step 7 — Deploy to Vercel (Optional)

```bash
npm i -g vercel
vercel
```

Set all environment variables in the Vercel project dashboard. The webhook URLs will be:
- WhatsApp: `https://your-domain.vercel.app/api/webhook/whatsapp`
- Telegram: `https://your-domain.vercel.app/api/webhook/telegram`

---

### Setting Up WhatsApp (Optional)

1. Create a [Meta Developer](https://developers.facebook.com) app
2. Add the **WhatsApp** product
3. Get a permanent access token and phone number ID
4. Set the webhook URL to `https://your-domain/api/webhook/whatsapp`
5. Subscribe to `messages` webhook field
6. Set the verify token to match your `WHATSAPP_VERIFY_TOKEN`

### Setting Up Telegram (Optional)

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token → `TELEGRAM_BOT_TOKEN`
4. Set the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain/api/webhook/telegram", "secret_token": "your-secret"}'
```

---

## Mobile App

The Garden mobile app is a native Android/iOS app built with **Expo** and **React Native**.

### Setup

```bash
cd mobile
npm install
cp .env.example .env.local
```

Edit `mobile/.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_BASE_URL=https://your-domain.vercel.app  # or http://localhost:3000
```

### Development

```bash
npx expo start             # Start Expo dev server
npx expo run:android       # Run on Android device/emulator
npx expo run:ios           # Run on iOS simulator
```

### Build Release APK (Android)

```bash
npx expo prebuild --platform android    # Generate native project
cd android
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew assembleRelease
```

APK output: `mobile/android/app/build/outputs/apk/release/app-release.apk`

Install on device:
```bash
adb install app-release.apk
```

---

## Project Structure

```
groot/
├── src/                          # Next.js web app + API
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/          # WhatsApp & Telegram webhooks
│   │   │   ├── cron/             # Scheduled jobs (check-ins, reports)
│   │   │   ├── tasks/            # Task CRUD endpoints
│   │   │   ├── habits/           # Habit CRUD + check-in endpoints
│   │   │   ├── mood/             # Mood recording & history
│   │   │   ├── memories/         # Memory/journal queries
│   │   │   ├── stories/          # Story timeline
│   │   │   ├── topics/           # Topic extraction
│   │   │   ├── profile/          # User profile facts
│   │   │   ├── settings/         # Notification preferences
│   │   │   └── auth/             # OTP auth flow
│   │   └── garden/               # The Garden web portal pages
│   └── lib/
│       ├── ai/                   # Groot persona, context builder
│       ├── providers/            # AI provider abstraction layer
│       ├── memory/               # Supermemory + Supabase memory
│       ├── messaging/            # Unified message pipeline
│       ├── habits/               # Habit tracking logic
│       ├── reminders/            # Smart reminder system
│       └── media/                # Media upload & processing
├── mobile/                       # Expo React Native app
│   ├── app/(tabs)/               # Tab screens (journal, pulse, tasks, settings)
│   ├── components/ui/            # Reusable UI components
│   ├── lib/api/                  # React Query hooks & mutations
│   └── lib/notifications/        # Local push notifications
├── shared/                       # Shared TypeScript types
│   └── types/api.ts              # API request/response types
└── supabase/migrations/          # Database migration SQL files
```

---

## API Reference

All endpoints require JWT Bearer token authentication (except auth routes).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/request-otp` | Request OTP for phone number |
| `POST` | `/api/auth/verify-otp` | Verify OTP, returns JWT |
| `GET` | `/api/garden/home` | Home dashboard data |
| `GET` | `/api/memories` | Journal entries (filterable) |
| `GET` | `/api/stories` | Story timeline |
| `GET` | `/api/mood` | Mood history by year |
| `POST` | `/api/mood` | Record mood check-in |
| `GET` | `/api/tasks` | List tasks |
| `PATCH` | `/api/tasks` | Toggle task completion |
| `PUT` | `/api/tasks` | Update task details |
| `GET` | `/api/habits` | List habits with check-ins |
| `POST` | `/api/habits` | Create habit |
| `PUT` | `/api/habits` | Update habit |
| `DELETE` | `/api/habits` | Delete habit |
| `POST` | `/api/habits/checkin` | Record habit check-in |
| `GET` | `/api/topics` | Topic analysis |
| `GET` | `/api/profile` | User profile facts |
| `GET` | `/api/reports` | Weekly insight reports |
| `GET/PATCH` | `/api/settings` | Notification preferences |
| `POST` | `/api/webhook/whatsapp` | WhatsApp message webhook |
| `POST` | `/api/webhook/telegram` | Telegram message webhook |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Web Framework** | Next.js 16 (App Router, TypeScript) |
| **Mobile** | Expo SDK 54, React Native, Expo Router |
| **Database** | Supabase (PostgreSQL + Storage + RLS) |
| **AI Chat** | Anthropic Claude / OpenAI GPT / Google Gemini |
| **Voice** | OpenAI Whisper (transcription) + TTS |
| **Vision** | Claude Vision / GPT-4o Vision |
| **Memory** | Supermemory.ai (semantic vector search) |
| **Styling** | Tailwind CSS (web), StyleSheet (mobile) |
| **Rate Limiting** | Upstash Redis |
| **Cron Jobs** | Upstash QStash |
| **Deployment** | Vercel |

---

## Security

- Webhook signature validation (`crypto.timingSafeEqual`)
- Service role key isolated behind `server-only` import guard
- Input sanitization with DOMPurify
- Message deduplication via `processed_messages` table
- Rate limiting via Upstash Redis
- Zod environment variable validation at startup
- AI provider circuit breaker with automatic fallback
- JWT-based authentication for all API endpoints
- Row Level Security (RLS) on all Supabase tables

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run type checks: `npx tsc --noEmit`
4. Commit your changes
5. Push to the branch and open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with 🌱 by the Groot team
</p>
