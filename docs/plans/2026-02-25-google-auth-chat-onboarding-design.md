# Google Auth, Two-Way Chat & Easy Onboarding Design

**Date:** 2026-02-25
**Status:** Draft — awaiting approval

---

## 1. Problem Statement

Groot currently requires users to first message Groot on WhatsApp to create an account, then authenticate via WhatsApp OTP. This makes it impossible for friends to quickly install and use the app. Additionally, the mobile app only supports one-way messaging (compose → get reply) with no conversation history.

### Goals

1. **Google Sign-In as primary auth** — any friend can install and sign in instantly
2. **Access control** — owner invites friends, friends get their own Groot instance
3. **Optional WhatsApp linking** — connect WhatsApp after sign-in for cross-platform messaging
4. **Two-way chat** — real conversations with Groot in the mobile app (not just one-shot compose)
5. **Easy README** — simple install guide for friends

---

## 2. Google Authentication

### 2.1 Flow Overview

```
Mobile App                          Server                         Google
    |                                  |                              |
    |-- "Sign in with Google" -------->|                              |
    |   (expo-auth-session)            |                              |
    |                                  |                              |
    |<---- Google OAuth consent ------>|                              |
    |                                  |                              |
    |-- POST /api/auth/google -------->|                              |
    |   { id_token }                   |-- Verify id_token ---------->|
    |                                  |<-- { email, name, sub } -----|
    |                                  |                              |
    |                                  |-- Find/create user           |
    |                                  |-- Check access (allowlist)   |
    |                                  |-- Issue JWT                  |
    |                                  |                              |
    |<---- { token, user } ------------|                              |
```

### 2.2 Mobile Implementation

- **Library:** `expo-auth-session` with Google provider (already supports Expo Go and standalone builds)
- **Login Screen Changes:**
  - Replace current WhatsApp OTP form with a prominent "Continue with Google" button
  - Keep WhatsApp OTP as secondary option (small link below Google button)
  - After Google sign-in, receive `id_token` from Google
  - Send `id_token` to new server endpoint

### 2.3 Server Endpoint

**POST `/api/auth/google`**

```typescript
// Request
{ id_token: string }

// Response (success)
{ token: string, user: { id, display_name, email } }

// Response (denied)
{ error: "not_allowed", message: "Ask the owner to invite you" }
```

**Logic:**
1. Verify `id_token` with Google's token info endpoint (or use `google-auth-library`)
2. Extract `email`, `name`, `sub` (Google user ID)
3. Look up user by `email` OR `google_id` in the `users` table
4. If found → issue JWT, return
5. If not found → check if email is in `allowed_users` table
6. If allowed → create new user record, issue JWT
7. If not allowed → return `not_allowed` error

### 2.4 Database Changes

```sql
-- Add Google identity fields to users table
ALTER TABLE users
  ADD COLUMN google_id VARCHAR(255) UNIQUE,
  ADD COLUMN avatar_url TEXT;

-- Make whatsapp_number nullable (no longer required for Google-first users)
ALTER TABLE users ALTER COLUMN whatsapp_number DROP NOT NULL;

-- Access control: who can use this Groot instance
CREATE TABLE allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  invited_by UUID REFERENCES users(id),
  access_level VARCHAR(20) DEFAULT 'friend', -- 'owner' | 'friend'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the owner
INSERT INTO allowed_users (email, access_level)
VALUES ('owner@gmail.com', 'owner');
```

### 2.5 Access Control Model

- **Owner:** Full access. Can invite friends. Identified by `OWNER_EMAIL` env var or `access_level = 'owner'` in `allowed_users`.
- **Friend:** Full Groot access (chat, journal, mood, habits, tasks). Cannot invite others.
- **Unknown:** Blocked at sign-in. Sees "Ask [owner name] to invite you" message.

**Invite flow:** Owner opens Settings → "Invite a Friend" → enters email → adds to `allowed_users`. When that person signs in with Google, they're auto-approved.

---

## 3. WhatsApp Linking (Optional)

### 3.1 Purpose

After signing in with Google, users can optionally link their WhatsApp number. This enables:
- Messaging Groot from WhatsApp
- Cross-platform conversation history (WhatsApp messages appear in app chat)
- WhatsApp-initiated features (proactive check-ins, reminders)

### 3.2 Flow

```
Settings Screen
  └── "Link WhatsApp" button
        └── Enter phone number
              └── Send OTP via WhatsApp (reuse existing OTP system)
                    └── Verify OTP
                          └── Update users.whatsapp_number
```

### 3.3 Endpoint

**POST `/api/auth/link-whatsapp`** (authenticated)

```typescript
// Step 1: Request OTP
{ action: "request", phone_number: string }
→ Sends OTP via WhatsApp, returns { success: true }

// Step 2: Verify OTP
{ action: "verify", phone_number: string, code: string }
→ Updates user's whatsapp_number, returns { success: true }
```

**Constraint:** Phone number must not already be linked to another user.

---

## 4. Two-Way Chat

### 4.1 Architecture Decision

**Approach: Polling with optimistic updates** (recommended)

Why not WebSockets/SSE:
- Vercel serverless doesn't support persistent connections
- Supabase Realtime adds complexity and a separate connection
- Groot responses are always request-initiated (no unprompted messages in chat)
- Polling at 0.5-1s during active chat is sufficient

Why not Supabase Realtime:
- Extra dependency and connection management
- Battery impact on mobile
- Not needed since all messages are initiated by the user

### 4.2 Chat Screen Design

Replace the current compose modal with a full chat experience:

```
┌──────────────────────────────┐
│  ← Chat with Groot     ···  │  (header)
│──────────────────────────────│
│                              │
│        Today, 10:23 AM       │  (date separator)
│                              │
│  ┌──────────────────┐        │
│  │ How did your      │        │  (Groot's message - left aligned)
│  │ meeting go today? │        │
│  └──────────────────┘        │
│                              │
│        ┌──────────────────┐  │
│        │ It went great!   │  │  (User's message - right aligned)
│        │ We closed the    │  │
│        │ deal 🎉          │  │
│        └──────────────────┘  │
│                              │
│  ┌──────────────────┐        │
│  │ That's amazing!   │        │  (Groot's response)
│  │ You've been working│       │
│  │ hard on this.     │        │
│  └──────────────────┘        │
│                              │
│  ···  (typing indicator)     │
│                              │
│──────────────────────────────│
│ [🎤] What's on your mind? [→]│  (input bar)
│ [📷] [🖼️]                    │
└──────────────────────────────┘
```

### 4.3 Navigation Changes

**Option A (Recommended): Chat as 5th tab**
- Replace "Settings" tab with "Chat"
- Move Settings to a gear icon in profile/header
- Tab order: Journal | Pulse | + | Tasks | Chat

**Option B: Chat replaces compose modal**
- FAB (+) button opens chat screen instead of modal
- Better for primary interaction but loses quick-compose convenience

**Recommendation:** Option A — Chat as its own tab. The compose modal can remain for quick one-shot messages from any screen, but the Chat tab provides the full conversation view.

### 4.4 API Endpoints

**GET `/api/mobile/messages`** (new)

```typescript
// Query params
{ limit?: number, before?: string (cursor), after?: string }

// Response
{
  messages: Array<{
    id: string,
    direction: 'inbound' | 'outbound',
    message_type: 'text' | 'audio' | 'image',
    content: string,
    media_url?: string,
    media_description?: string,
    created_at: string,
    metadata?: {
      mood?: string,
      memoryTags?: string[],
    }
  }>,
  has_more: boolean,
  cursor?: string
}
```

**POST `/api/mobile/compose`** (existing, enhanced)

Add to response:
```typescript
{
  ok: true,
  reply: string,
  reply_id: string,        // NEW: ID of Groot's response message
  inbound_id: string,      // NEW: ID of user's message
  mood?: string,
  tasks?: number
}
```

### 4.5 Mobile Implementation

**New files:**
- `mobile/app/(tabs)/chat.tsx` — Chat screen (FlatList with inverted scroll)
- `mobile/components/ui/chat-bubble.tsx` — Individual message bubble
- `mobile/components/ui/chat-input.tsx` — Input bar with voice/image/text
- `mobile/lib/api/queries.ts` — Add `useMessages()` query with cursor pagination

**Chat screen behavior:**
1. On mount: fetch last 50 messages via `GET /api/mobile/messages`
2. User types → POST to `/api/mobile/compose` → optimistically add user bubble
3. On response → add Groot's reply bubble
4. Scroll to bottom on new messages
5. Pull-to-load-more for older messages (cursor-based pagination)
6. Show typing indicator while waiting for Groot's response
7. Support voice recording and image sending (reuse compose modal logic)

### 4.6 Message Rendering

- **User messages:** Right-aligned, primary color background
- **Groot messages:** Left-aligned, subtle card background
- **Media:** Inline image thumbnails, audio player with waveform
- **Date separators:** "Today", "Yesterday", "Feb 24"
- **Metadata badges:** Mood emoji, task count (subtle, below message)

---

## 5. Onboarding Flow

### 5.1 New User Experience

```
1. Install app → Open
2. "Continue with Google" → Google OAuth
3. If allowed → Welcome screen with Groot avatar
   "Hey! I'm Groot, your AI second brain.
    I'll help you journal, track moods, and stay organized."
4. Optional: "Link WhatsApp" card (skippable)
5. → Main app (Chat tab)
```

### 5.2 If Not Allowed

```
1. Sign in with Google → Server returns "not_allowed"
2. Show friendly screen:
   "Groot is invite-only right now.
    Ask [owner_name] to add your email."
3. [Try Again] button to retry sign-in
```

---

## 6. Settings Screen Changes

Add to settings:
- **Account section:** Email, display name, avatar (from Google)
- **WhatsApp Linking:** Link/unlink WhatsApp number
- **Invite Friends** (owner only): Add emails to allowlist

---

## 7. Environment Variables

New variables needed:
```env
# Google OAuth
GOOGLE_CLIENT_ID=<from Google Cloud Console>
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<same, for mobile>

# Owner identity
OWNER_EMAIL=owner@gmail.com
```

---

## 8. Migration Plan

### Phase 1: Google Auth + Access Control
1. Create Supabase migration (google_id column, allowed_users table)
2. Build `/api/auth/google` endpoint
3. Update mobile login screen (add Google button)
4. Seed owner email in allowed_users

### Phase 2: Two-Way Chat
5. Build `GET /api/mobile/messages` endpoint
6. Build chat screen UI (chat.tsx, chat-bubble.tsx, chat-input.tsx)
7. Update tab layout (add Chat tab)
8. Enhance compose endpoint response with message IDs

### Phase 3: WhatsApp Linking
9. Build `/api/auth/link-whatsapp` endpoint
10. Build linking UI in settings screen

### Phase 4: Polish & README
11. Update README with install guide
12. Add environment variable documentation
13. Test full flow end-to-end

---

## 9. Security Considerations

- Google `id_token` verified server-side (never trust client-side claims)
- Access control checked on every auth request, not just sign-up
- WhatsApp linking requires OTP verification (prevents hijacking)
- JWT tokens contain user ID only (no PII in tokens)
- Rate limiting on auth endpoints (reuse existing Upstash Redis)
- Allowed users table has RLS policies (owner-only write access)

---

## 10. Data Model Summary

```
users
  ├── id (UUID, PK)
  ├── email (VARCHAR, UNIQUE, nullable)
  ├── google_id (VARCHAR, UNIQUE, nullable)     ← NEW
  ├── avatar_url (TEXT, nullable)                ← NEW
  ├── display_name (VARCHAR)
  ├── whatsapp_number (VARCHAR, nullable)        ← NOW NULLABLE
  ├── telegram_chat_id (VARCHAR, nullable)
  ├── timezone, onboarding_step, etc.
  └── created_at, updated_at

allowed_users                                    ← NEW TABLE
  ├── id (UUID, PK)
  ├── email (VARCHAR, UNIQUE)
  ├── invited_by (UUID, FK → users)
  ├── access_level ('owner' | 'friend')
  └── created_at

messages (existing, no changes)
  ├── id, user_id, direction, message_type
  ├── content, media_url, metadata
  └── platform, created_at
```
