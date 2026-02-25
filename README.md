<p align="center">
  <img src="mobile/assets/images/icon.png" width="120" alt="Groot Logo" />
</p>

<h1 align="center">Groot</h1>

<p align="center">
  <strong>Your AI Second Brain & Empathetic Life Companion</strong>
</p>

<p align="center">
  <a href="#features">Features</a> · <a href="#get-the-app">Get the App</a> · <a href="#how-it-works">How It Works</a> · <a href="#tech-stack">Tech Stack</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Claude-Sonnet-D97706?logo=anthropic" alt="Claude" />
</p>

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
A polished Android app with:
- **Journal** — Searchable timeline with calendar navigation
- **Pulse** — Mood check-in, habit tracking with streaks & progress rings
- **Tasks** — AI-extracted to-dos with edit, complete, categorize
- **Chat** — Two-way conversation with Groot (text, voice, images)
- **Settings** — Theme, notifications, WhatsApp linking, profile management

### 🧠 Dual-Track Memory
- **Short-term:** Recent messages for conversation context
- **Long-term:** Semantic lifetime memory — Groot recalls facts about you months later

### 🔄 Swappable AI Providers
Change AI providers with a single config. No code changes required.

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
Automated insight reports with mood trends, key topics, and personalized observations.

---

## Get the App

### Mobile App (Android)

1. **Get an invite** — Groot is currently invite-only. Ask the owner to add your Google account.
2. **Install the APK** — Download and install on your Android device.
3. **Sign in with Google** — Tap "Continue with Google" and you're in.

That's it. No setup, no configuration — just sign in and start chatting with Groot.

### WhatsApp

Once signed in, you can link your WhatsApp number in **Settings → WhatsApp** to also receive Groot messages on WhatsApp.

### Web Portal

Visit [The Garden](https://groot-three.vercel.app) to explore your memories, journals, mood trends, habits, and more.

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
┌────────┐  ┌──────────┐  ┌──────────┐
│Supabase│  │Supermemory│  │ Response │
│  (DB)  │  │(Long-term)│  │  + Reply │
└────────┘  └──────────┘  └──────────┘
```

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
| **Auth** | Google Sign-In (native) + JWT |
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

## Project Structure

```
groot/
├── src/                          # Next.js web app + API
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/          # WhatsApp & Telegram webhooks
│   │   │   ├── cron/             # Scheduled jobs (check-ins, reports)
│   │   │   ├── auth/             # Google OAuth + WhatsApp linking
│   │   │   ├── mobile/           # Mobile-specific endpoints
│   │   │   ├── tasks/            # Task CRUD
│   │   │   ├── habits/           # Habit CRUD + check-ins
│   │   │   ├── mood/             # Mood recording & history
│   │   │   ├── memories/         # Memory/journal queries
│   │   │   ├── stories/          # Story timeline
│   │   │   ├── topics/           # Topic extraction
│   │   │   ├── profile/          # User profile facts
│   │   │   └── settings/         # Notification preferences
│   │   └── garden/               # The Garden web portal
│   └── lib/
│       ├── ai/                   # Groot persona, context builder
│       ├── providers/            # AI provider abstraction layer
│       ├── memory/               # Supermemory + Supabase memory
│       ├── messaging/            # Unified message pipeline
│       ├── habits/               # Habit tracking logic
│       ├── reminders/            # Smart reminder system
│       └── media/                # Media upload & processing
├── mobile/                       # Expo React Native app
│   ├── app/(auth)/               # Login (Google Sign-In)
│   ├── app/(tabs)/               # Tab screens
│   ├── components/ui/            # Reusable UI components
│   └── lib/                      # API client, auth, theme
├── shared/                       # Shared TypeScript types
└── supabase/migrations/          # Database migrations
```

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with 🌱 by Abhishek
</p>
