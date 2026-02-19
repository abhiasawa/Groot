# Groot — AI Second Brain on WhatsApp

Groot is an AI-powered second brain and life companion that lives on WhatsApp. It combines knowledge management, habit tracking, emotional companionship, and a web dashboard — all accessible from your favorite messaging app.

Send a text, voice note, or image to Groot on WhatsApp and it remembers everything. Ask it anything you've told it, track habits, save ideas, get article summaries, and explore your knowledge graph on a beautiful web portal called **The Garden**.

## Features

**WhatsApp Native**
- Full conversational AI with long-term memory (powered by Supermemory)
- Voice note transcription (Whisper) and image analysis (Vision)
- Quick capture shortcuts: `note:`, `todo:`, `idea:`, `remind:`
- Send messages on your behalf to contacts
- Link/article saving with auto-summarization
- Smart reminders with context from your memories

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
- **Graph** — interactive knowledge graph visualization
- Mobile-first responsive layout with sidebar + bottom nav

**Architecture**
- Modular AI provider system — swap between OpenAI, Anthropic, or Gemini with one env var
- Circuit breaker with automatic provider fallback
- Webhook signature validation and message deduplication
- Row-level security linking Supabase Auth to WhatsApp users

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| AI | OpenAI GPT-5-mini (default), Claude, Gemini (swappable) |
| Memory | Supermemory (semantic search + long-term storage) |
| Database | Supabase (Postgres + Auth + RLS) |
| Messaging | Meta WhatsApp Cloud API |
| Voice | OpenAI Whisper |
| Vision | OpenAI Vision / Claude Vision |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| Charts | Recharts |

## Deploy to Vercel

### Prerequisites

You'll need accounts on:
- [Meta for Developers](https://developers.facebook.com) (WhatsApp Cloud API)
- [Supabase](https://supabase.com) (database + auth)
- [OpenAI](https://platform.openai.com) (AI, transcription, vision)
- [Supermemory](https://supermemory.ai) (long-term memory)
- [Vercel](https://vercel.com) (hosting)

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

### 3. Set Up WhatsApp

1. Go to [developers.facebook.com](https://developers.facebook.com) > Create App > Business type
2. Add the **WhatsApp** product
3. In **WhatsApp > API Setup**: copy your Phone Number ID and generate a permanent access token
4. In **WhatsApp > Configuration**:
   - Set webhook URL to `https://your-app.vercel.app/api/webhook/whatsapp`
   - Set a verify token (any string you choose)
   - Subscribe to the `messages` webhook field
5. Copy your App Secret from **App Settings > Basic**

### 4. Configure Environment Variables

Set these in your Vercel project settings (**Settings > Environment Variables**):

```env
# WhatsApp Cloud API
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
META_APP_SECRET=your_app_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx

# Supermemory
SUPERMEMORY_API_KEY=sm_xxxxx

# AI Provider (openai | anthropic | gemini)
AI_PROVIDER=openai
VISION_PROVIDER=openai

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
OWNER_WHATSAPP_NUMBER=your_number_with_country_code
CRON_SECRET=any_random_secret_string
```

<details>
<summary><strong>Optional environment variables</strong></summary>

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx          # Required if AI_PROVIDER=anthropic
ANTHROPIC_CHAT_MODEL=claude-sonnet-4-5-20250514
GOOGLE_GEMINI_API_KEY=xxxxx             # Required if AI_PROVIDER=gemini
OPENAI_CHAT_MODEL=gpt-5-mini
OWNER_EMAIL=you@example.com             # For multi-user portal auth safety
UPSTASH_REDIS_REST_URL=xxxxx            # Enables API rate limiting
UPSTASH_REDIS_REST_TOKEN=xxxxx          # Enables API rate limiting
TRANSCRIPTION_PROVIDER=openai           # openai (default) | gemini
TTS_PROVIDER=openai                     # openai (default) | google | elevenlabs
TTS_VOICE=nova                          # Voice for TTS replies
WHATSAPP_CONTEXT_RECENT_LIMIT=6         # Lower = faster replies, less history
WHATSAPP_MEMORY_SEARCH_LIMIT=2          # Lower = faster replies, fewer memories
WHATSAPP_RESPONSE_MAX_TOKENS=512        # Lower = faster replies, shorter outputs
```

</details>

### 5. Verify

1. Send a message to your WhatsApp number — you should get the 5-message onboarding sequence
2. Visit `https://your-app.vercel.app/login` — log in with magic link to access The Garden
3. Your Supabase Auth account auto-links to your WhatsApp user on first login

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── webhook/whatsapp/   # WhatsApp webhook (signature validation + message processing)
│   │   ├── cron/               # Daily check-in, evening reflection, reminders, weekly report
│   │   ├── garden/home/        # Consolidated home page API (single request)
│   │   ├── dashboard/          # Dashboard stats
│   │   ├── memories/           # Memory list + semantic search
│   │   ├── graph/              # Knowledge graph data
│   │   ├── habits/             # Habit data with streaks + checkins
│   │   ├── tasks/              # Quick capture tasks
│   │   ├── reports/            # Weekly reports
│   │   ├── mood/               # Mood tracking + Year in Pixels data
│   │   ├── people/             # Auto-extracted relationship data
│   │   ├── profile/            # User profile facts by category
│   │   ├── me/                 # Authenticated user endpoint
│   │   ├── settings/           # Notification preferences
│   │   ├── export/             # Full data export (JSON)
│   │   └── health/             # Health check endpoint
│   ├── garden/                 # The Garden portal pages
│   │   ├── journal/            # Timeline + calendar memory view
│   │   ├── people/             # Relationship tracker
│   │   ├── mood/               # Mood dashboard + Year in Pixels
│   │   ├── habits/             # Habit streaks + heatmaps
│   │   ├── tasks/              # Task management
│   │   ├── insights/           # Enhanced weekly reports
│   │   ├── profile/            # "What Groot Knows" about you
│   │   ├── graph/              # Knowledge graph
│   │   └── settings/           # Preferences
│   ├── login/                  # Magic link login
│   └── auth/callback/          # Supabase Auth callback
├── lib/
│   ├── ai/                     # Groot engine, persona, context builder
│   ├── auth/                   # Portal user authentication + linking
│   ├── capture/                # Shortcuts, tasks, links, summarizer
│   ├── contacts/               # Contact management for send-on-behalf
│   ├── habits/                 # Habit tracker, bare number parser
│   ├── journal/                # Evening reflection prompt generator
│   ├── media/                  # Voice/image download + processing pipeline
│   ├── memory/                 # Short-term (Supabase) + long-term (Supermemory)
│   ├── proactive/              # De-escalation engine + scheduling
│   ├── providers/
│   │   ├── llm/                # OpenAI, Anthropic, Gemini (swappable)
│   │   ├── vision/             # OpenAI Vision, Claude Vision, Gemini Vision
│   │   ├── transcription/      # Whisper, Gemini audio
│   │   └── tts/                # Text-to-speech providers
│   ├── reminders/              # Smart reminder detection + scheduling
│   ├── reports/                # Weekly synthesis generator
│   ├── supabase/               # Server (service role) + client (anon) instances
│   └── whatsapp/               # API client, webhook parser, onboarding, outbound
├── components/garden/          # Portal UI components (Notion design system)
├── hooks/                      # SWR data-fetching hooks
└── types/                      # TypeScript type definitions

supabase/
└── migrations/                 # SQL migrations (run in order)
```

## Switching AI Providers

Change one env var to swap the entire AI backend — zero code changes:

```env
AI_PROVIDER=openai      # GPT-5-mini (default)
AI_PROVIDER=anthropic   # Claude Sonnet
AI_PROVIDER=gemini      # Gemini Pro
```

Each provider implements the same `LLMProvider` interface. If the primary fails 3 consecutive times, Groot automatically falls back to the next available provider.

## Database

**Core tables:** `users`, `user_profile`, `messages`, `sessions`

**Feature tables:** `habits`, `habit_checkins`, `habit_streaks`, `weekly_reports`, `contacts`, `tasks`, `reminders`

**Operational tables:** `processed_messages` (deduplication), `api_usage` (cost tracking), `message_queue`

All tables use row-level security scoped to the authenticated user via `auth_user_id`. The webhook and cron jobs use the service role key which bypasses RLS.

## Local Development

```bash
git clone https://github.com/abhiasawa/Groot.git
cd Groot
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

For local webhook testing, use [ngrok](https://ngrok.com):

```bash
ngrok http 3000
# Then set the ngrok HTTPS URL as your webhook in the Meta Developer Dashboard
```

Run tests:

```bash
npm test
```

## License

MIT

## Author

**Abhishek Asawa** — [@abhiasawa](https://github.com/abhiasawa)
