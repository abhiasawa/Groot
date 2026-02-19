# Groot — AI Second Brain

Groot is an AI-powered second brain and life companion. It remembers everything you tell it, tracks your habits, understands your moods, and helps you stay on top of your life — through the messaging apps you already use or a dedicated web portal.

Send a text, voice note, or image and Groot remembers it. Ask it anything you've ever told it, track habits, save ideas, get article summaries, and explore your personal knowledge on a web dashboard called **The Garden**.

## Features

**Conversational AI with Long-Term Memory**
- Full conversational AI powered by Supermemory for semantic long-term recall
- Voice note transcription (Whisper) and image analysis (Vision)
- Quick capture shortcuts: `note:`, `todo:`, `idea:`, `remind:`
- Link/article saving with auto-summarization
- Smart reminders with context from your memories

**Multi-Platform Messaging**
- WhatsApp (via Meta Cloud API)
- Telegram (via Bot API)
- Modular design — easy to add new platforms

**Habit Tracking**
- Track habits with daily check-ins and streak counting
- Bare number recognition (send `80.2` and it logs your weight)
- Milestone celebrations at Day 3, 7, 14, 21, 30, 50, 100

**Proactive Check-ins**
- Morning check-ins, evening journal prompts, weekly reports
- Smart de-escalation (pauses if you stop responding)
- Configurable preferences: daily, weekly, or paused

**The Garden (Web Portal)**
- Notion-inspired clean, minimal design
- **Home** — daily briefing with mood pulse, flashbacks, and semantic search
- **Journal** — timeline + calendar view of memories, grouped by date
- **People** — auto-extracted relationship tracker from conversations
- **Mood** — Year in Pixels grid, mood trends, and emotional patterns
- **Habits** — streak counters, 30-day heatmaps, and check-in history
- **Tasks** — grouped to-do/done with due dates and overdue indicators
- **Insights** — weekly reports with mood bars and topic tags
- **Profile** — categorized facts Groot has learned about you
- **Topics** — browse your memories by topic and mood
- Mobile-first responsive layout with sidebar + bottom nav

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| AI | Claude Sonnet (default), OpenAI, Gemini (swappable) |
| Memory | Supermemory (semantic search + long-term storage) |
| Database | Supabase (Postgres + Auth + RLS) |
| Messaging | WhatsApp Cloud API, Telegram Bot API |
| Voice | OpenAI Whisper |
| Vision | Claude Vision / OpenAI Vision |
| Hosting | Vercel |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |

## Deploy to Vercel

### Prerequisites

You'll need accounts on:
- [Supabase](https://supabase.com) (database + auth)
- [OpenAI](https://platform.openai.com) or [Anthropic](https://console.anthropic.com) (AI, transcription, vision)
- [Supermemory](https://supermemory.ai) (long-term memory)
- [Vercel](https://vercel.com) (hosting)
- [Meta for Developers](https://developers.facebook.com) (WhatsApp — optional)
- [Telegram BotFather](https://t.me/BotFather) (Telegram — optional)

### 1. Clone and Deploy

```bash
git clone https://github.com/abhiasawa/Groot.git
cd Groot
npm install
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fabhiasawa%2FGroot)

Or deploy via CLI:

```bash
npx vercel
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migrations in order:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_auth_link_and_secure_rls.sql
   supabase/migrations/003_habit_streaks_unique_constraint.sql
   ```
3. Go to **Authentication > URL Configuration**:
   - Set **Site URL** to your Vercel URL (e.g., `https://your-app.vercel.app`)
   - Add `https://your-app.vercel.app/**` to **Redirect URLs**
4. Copy your project URL, anon key, and service role key from **Project Settings > API**

### 3. Configure Environment Variables

Set these in your Vercel project settings (**Settings > Environment Variables**):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx

# AI (at least one required)
OPENAI_API_KEY=sk-proj-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Supermemory
SUPERMEMORY_API_KEY=sm_xxxxx

# AI Provider (openai | anthropic | gemini)
AI_PROVIDER=anthropic
VISION_PROVIDER=anthropic

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
CRON_SECRET=any_random_secret_string
```

<details>
<summary><strong>WhatsApp configuration (optional)</strong></summary>

```env
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
META_APP_SECRET=your_app_secret
OWNER_WHATSAPP_NUMBER=your_number_with_country_code
```

Set webhook URL to `https://your-app.vercel.app/api/webhook/whatsapp` and subscribe to the `messages` field.

</details>

<details>
<summary><strong>Telegram configuration (optional)</strong></summary>

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=any_random_secret_string
```

Register your webhook: `node scripts/setup-telegram-webhook.mjs`

</details>

<details>
<summary><strong>Other optional variables</strong></summary>

```env
ANTHROPIC_CHAT_MODEL=claude-sonnet-4-5-20250514
OPENAI_CHAT_MODEL=gpt-5-mini
GOOGLE_GEMINI_API_KEY=xxxxx
OWNER_EMAIL=you@example.com
UPSTASH_REDIS_REST_URL=xxxxx
UPSTASH_REDIS_REST_TOKEN=xxxxx
TRANSCRIPTION_PROVIDER=openai
TTS_PROVIDER=openai
TTS_VOICE=nova
```

</details>

### 4. Verify

1. Visit `https://your-app.vercel.app/login` — log in with magic link to access The Garden
2. (Optional) Send a message via WhatsApp or Telegram to test the messaging integration

## Switching AI Providers

Change one env var to swap the entire AI backend — zero code changes:

```env
AI_PROVIDER=anthropic   # Claude Sonnet (default)
AI_PROVIDER=openai      # GPT-5-mini
AI_PROVIDER=gemini      # Gemini Pro
```

Each provider implements the same `LLMProvider` interface. If the primary fails 3 consecutive times, Groot automatically falls back to the next available provider.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── webhook/
│   │   │   ├── whatsapp/       # WhatsApp webhook
│   │   │   └── telegram/       # Telegram webhook
│   │   ├── cron/               # Scheduled jobs (check-ins, reports, reminders)
│   │   ├── garden/home/        # Consolidated home page API
│   │   ├── memories/           # Memory list + semantic search
│   │   ├── habits/             # Habit data with streaks + checkins
│   │   ├── tasks/              # Quick capture tasks
│   │   ├── mood/               # Mood tracking + Year in Pixels
│   │   ├── people/             # Auto-extracted relationships
│   │   ├── reports/            # Weekly reports
│   │   ├── profile/            # User profile facts
│   │   └── settings/           # Notification preferences
│   ├── garden/                 # The Garden portal pages
│   ├── login/                  # Magic link login
│   └── auth/callback/          # Supabase Auth callback
├── lib/
│   ├── ai/                     # Groot engine, persona, context builder
│   ├── providers/
│   │   ├── llm/                # OpenAI, Anthropic, Gemini (swappable)
│   │   ├── vision/             # Vision providers
│   │   ├── transcription/      # Whisper, Gemini audio
│   │   └── tts/                # Text-to-speech providers
│   ├── memory/                 # Short-term (Supabase) + long-term (Supermemory)
│   ├── habits/                 # Habit tracker
│   ├── capture/                # Quick capture, link summarization
│   ├── reminders/              # Smart reminders
│   ├── whatsapp/               # WhatsApp API client
│   └── supabase/               # Database clients
├── components/                 # Portal UI components
└── types/                      # TypeScript type definitions

supabase/
└── migrations/                 # SQL migrations (run in order)
```

## Local Development

```bash
git clone https://github.com/abhiasawa/Groot.git
cd Groot
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

## License

MIT

## Author

**Abhishek Asawa** — [@abhiasawa](https://github.com/abhiasawa)
