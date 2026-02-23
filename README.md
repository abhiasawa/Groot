# Groot

Groot is an AI second brain and life companion with:
- WhatsApp + Telegram messaging pipeline
- The Garden web portal (Next.js)
- Mobile app (Expo / React Native)

It captures text, voice, and image conversations, stores long-term memory, and exposes views for journal, stories, mood, habits, tasks, topics, profile, and insights.

## Monorepo Layout

- `src/` — web app + API routes + backend logic
- `mobile/` — Expo mobile app (`app/`, `components/`, native Android project)
- `shared/` — shared API types used by web and mobile
- `supabase/migrations/` — database schema and migration scripts

## Core Stack

- Web: Next.js 16, TypeScript, Tailwind
- Mobile: Expo SDK 54, React Native 0.81, Expo Router
- DB/Auth: Supabase
- AI: OpenAI and Anthropic providers (with fallback chain)
- Memory: Supermemory
- Hosting: Vercel

## Features

- Conversational AI with metadata extraction (`memoryTags`, mood, dates, profile updates)
- Voice note transcription and image understanding
- Journal timeline with filters/search
- Story timeline + stats strip
- Mood timeline + weekly trend
- Habit streaks and check-ins
- Tasks, topics, people, profile and settings APIs

## Environment Setup

Create `.env.local` in repo root (do not commit it).

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
# or
ANTHROPIC_API_KEY=

SUPERMEMORY_API_KEY=

AI_PROVIDER=openai
VISION_PROVIDER=openai

NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=
```

Optional integrations:
- WhatsApp Cloud API (`WHATSAPP_*`, `META_APP_SECRET`)
- Telegram Bot API (`TELEGRAM_*`)

## Local Development

Install root dependencies:

```bash
npm install
```

Run web + API:

```bash
npm run dev
```

Web app default: `http://localhost:3000`

## Mobile Development

Install mobile dependencies:

```bash
cd mobile
npm install
```

Run Expo dev server:

```bash
npm run start
```

Run Android (local native build):

```bash
npm run android
```

Release APK build (from `mobile/android`):

```bash
JAVA_HOME=<path-to-jdk17> ./gradlew :app:assembleRelease
```

APK output:

`mobile/android/app/build/outputs/apk/release/app-release.apk`

## Quality Commands

From repo root:

```bash
npx tsc --noEmit
```

From mobile:

```bash
npx tsc --noEmit
```

## Deployment

Primary deployment target is Vercel. Set all required environment variables in the Vercel project before deploying.

## Notes

- Keep `.env*`, local credentials, and generated build artifacts out of git.
- Mobile app calls the deployed API base configured in `mobile/lib/api/client.ts`.

## License

MIT
