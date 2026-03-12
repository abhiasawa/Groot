# Noto

Noto is a mobile-first AI second brain. This repo now contains:

- The Expo / React Native mobile app in [`mobile/`](/Users/abhishekasawa/Downloads/Experiments/Noto/mobile)
- The backend APIs, webhooks, auth routes, and cron endpoints that support the mobile app in [`src/app/api/`](/Users/abhishekasawa/Downloads/Experiments/Noto/src/app/api)
- Shared types in [`shared/`](/Users/abhishekasawa/Downloads/Experiments/Noto/shared)

The old web portal has been removed from the codebase.

## Architecture

- Mobile client: Expo SDK 54, React Native, Expo Router
- Backend: Next.js App Router used as an API server only
- Database: Supabase
- Messaging: WhatsApp Cloud API and Telegram Bot API
- AI: Provider-based abstraction across LLM, vision, transcription, and TTS
- Long-term memory: Supermemory.ai

## Repo Layout

```text
mobile/                 Expo mobile app
src/app/api/            Backend route handlers for mobile + messaging
src/lib/                Server-side business logic
shared/                 Shared TypeScript types
supabase/migrations/    Database schema history
```

## Mobile Development

Install dependencies:

```bash
npm install
cd mobile && npm install
```

Run the backend API server:

```bash
npm run dev
```

Run the mobile app:

```bash
cd mobile
npx expo start
```

Build the Android release APK:

```bash
cd mobile/android
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew assembleRelease
```

APK output:

```text
mobile/android/app/build/outputs/apk/release/app-release.apk
```

## Environment

Root `.env.local` holds backend credentials and service configuration.

`mobile/.env` or Expo env values should provide:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

## Notes

- `NEXT_PUBLIC_APP_URL` is still used by backend setup scripts and webhook/cron configuration.
- Google auth remains in the backend because the mobile app exchanges Google ID tokens with `/api/auth/google`.
