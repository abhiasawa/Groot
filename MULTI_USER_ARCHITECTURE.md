# Multi-User Architecture Plan — Groot

## Executive Summary

Groot currently operates as a **single-user system** with a hacky fallback. This plan outlines the architecture changes needed to support **multiple isolated users** — each with their own Groot instance, data, dashboard, and messaging channels — while keeping the existing functionality intact.

**First use case:** Onboarding Abhishek's wife as a second user.

---

## Current State Analysis

### What Works (Single-User)
- WhatsApp/Telegram webhooks identify users by phone number/chat ID
- `users` table has `user_id` foreign keys on all data tables
- RLS policies exist (but bypassed — all queries use `getSupabaseAdmin()`)
- Mobile app has Supabase Auth with magic-link OTP
- Database schema already scopes all data by `user_id`

### What's Broken / Missing
1. **Web portal (`portal-user.ts`):** Falls back to "most recently active user" — no real auth
2. **Mobile API client:** Sends zero auth headers — relies on single-user fallback
3. **Cross-platform linking (line 46):** Finds ANY user on other platform, would link wife's Telegram to your WhatsApp user!
4. **No user registration flow:** Users are auto-created when they message on WhatsApp/Telegram
5. **Garden web portal:** No login screen, no user switcher
6. **Cron jobs:** Some may be hardcoded to single user or iterate all users without isolation

---

## Architecture Changes Required

### Phase 1: Fix Critical Bugs (Day 1)

#### 1.1 Fix Cross-Platform Linking Bug
**File:** `src/lib/whatsapp/onboarding.ts` (lines 42-48)

**Current (BROKEN):**
```typescript
// Finds ANY user on the other platform — would link unrelated users!
const { data: crossPlatformUser } = await supabase
  .from("users")
  .not(otherColumn, "is", null)
  .limit(1)
  .single();
```

**Fix:** Remove cross-platform auto-linking entirely. Instead, add a manual "Link Accounts" feature in the mobile app settings where a user can explicitly link their WhatsApp and Telegram.

```typescript
// REMOVE the cross-platform lookup block entirely (lines 40-71)
// Each platform creates a separate user until manually linked
```

**Alternative:** If you want auto-linking, require users to verify via a code:
- User messages from WhatsApp → gets a 6-digit linking code
- User messages from Telegram with `/link <code>` → accounts merged

### Phase 2: Proper Authentication (Day 2-3)

#### 2.1 Mobile App — Send Auth Token with API Requests
**File:** `mobile/lib/api/client.ts`

The auth provider already stores JWTs in secure storage. The API client just needs to include them:

```typescript
import { supabase } from "../auth/provider";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  // Attach Bearer token if user is authenticated
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${session.access_token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  // ... rest stays the same
}
```

#### 2.2 Server — Remove Single-User Fallback
**File:** `src/lib/auth/portal-user.ts`

Remove the "most recently active user" fallback. All requests MUST have a Bearer token:

```typescript
export async function getAuthenticatedPortalUser(request?: NextRequest): Promise<PortalUser> {
  const authHeader = request?.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new PortalAuthError("Authentication required", 401);
  }
  const token = authHeader.slice(7);
  return authenticateWithToken(token);
}
```

#### 2.3 Link Supabase Auth to App User
**Problem:** When a user signs up via magic-link OTP in the mobile app, a Supabase Auth user is created. But there's no automatic link to the `users` table record (which was created when they first messaged on WhatsApp).

**Solution:** Add a "Link Account" step after mobile app sign-in:

1. User signs in with email via magic link
2. App calls `POST /api/auth/link` with their phone number
3. Server verifies the phone number matches a WhatsApp user
4. Server sets `auth_user_id` on the matching `users` row

**File to create:** `src/app/api/auth/link/route.ts`
```typescript
// POST { phone_number: "+91..." }
// - Validates the JWT (Supabase auth)
// - Finds user by whatsapp_number matching phone_number
// - Sets auth_user_id = auth.uid() on that user
// - Returns the linked user
```

### Phase 3: User Onboarding Flow (Day 3-4)

#### 3.1 New User Registration via Mobile App

**Flow for wife onboarding:**
1. She installs the Groot mobile app
2. Opens app → Login screen → enters her email
3. Gets magic-link OTP → verifies
4. App asks: "What's your WhatsApp number?" (or Telegram username)
5. She messages Groot from WhatsApp → user record created
6. App calls `/api/auth/link` with her phone number
7. Server links Supabase Auth user to WhatsApp user
8. She now has full access to her own dashboard, journal, etc.

**Alternative simpler flow:**
1. She messages Groot on WhatsApp → user auto-created
2. Groot sends her a "Set up your dashboard" link (deep link to mobile app)
3. She opens app, enters email for magic link
4. Server auto-links based on the deep link token

#### 3.2 Web Garden Portal Auth
For the web portal, add a simple login page:
- Email + magic link OTP (same as mobile)
- After auth, `portal-user.ts` resolves user by `auth_user_id`
- No more "most recently active user" fallback

### Phase 4: Data Isolation Verification (Day 4-5)

#### 4.1 Audit All API Endpoints
Every API route must call `getAuthenticatedPortalUser(request)` and use the returned `user.id` for all queries:

**Files to audit:**
```
src/app/api/memories/route.ts
src/app/api/stories/route.ts
src/app/api/mood/route.ts
src/app/api/habits/route.ts
src/app/api/tasks/route.ts
src/app/api/people/route.ts
src/app/api/profile/route.ts
src/app/api/insights/route.ts
src/app/api/home/route.ts
```

**Pattern to enforce:**
```typescript
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedPortalUser(request);
  // All queries MUST use user.id
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id);  // ← CRITICAL
}
```

#### 4.2 RLS as Defense-in-Depth
RLS policies already exist but are bypassed. Keep using `getSupabaseAdmin()` for performance, but consider switching mobile app to use user-scoped Supabase client as a safety net.

### Phase 5: WhatsApp Multi-User (Already Works!)

The WhatsApp pipeline **already handles multiple users correctly:**
- Each incoming message has a `from` phone number
- `getOrCreateUser()` finds/creates user by phone number
- All downstream processing uses `userId` from that lookup
- Responses go back to the correct phone number

**No changes needed** in the messaging pipeline for multi-user.

The only WhatsApp concern is the **test number limitation** (max 5 recipients). For production with 2+ users, register a real business number.

### Phase 6: Cron Jobs Audit (Day 5)

**Files to check:**
```
src/app/api/cron/check-in/route.ts
src/app/api/cron/weekly-report/route.ts
src/app/api/cron/reminders/route.ts
```

Ensure cron jobs iterate over ALL users (not hardcoded to one):
```typescript
// Good pattern:
const { data: users } = await supabase.from("users").select("id").eq("onboarding_completed_at", true);
for (const user of users) {
  await processUserCheckin(user.id);
}
```

---

## Database Schema Changes

### Migration: Add email to users table
```sql
ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;
```

This allows matching Supabase Auth email to the users table for auto-linking.

### No Other Schema Changes Needed
All tables already have `user_id` foreign keys. The data model is already multi-user ready.

---

## Summary: Effort Estimate

| Phase | Description | Effort |
|-------|-------------|--------|
| 1 | Fix cross-platform linking bug | 30 min |
| 2 | Proper auth (mobile + server) | 3-4 hours |
| 3 | User onboarding flow | 2-3 hours |
| 4 | Data isolation audit | 1-2 hours |
| 5 | WhatsApp (already works) | 0 |
| 6 | Cron jobs audit | 1 hour |
| **Total** | | **~8-10 hours** |

---

## Key Principle

**The database is already multi-user.** The main work is:
1. Making the mobile app send auth tokens (currently sends nothing)
2. Removing the single-user fallback on the server
3. Adding a user onboarding/linking flow
4. Fixing the cross-platform linking bug

The messaging pipeline, AI engine, and all data operations are already scoped by `user_id`. This is a **frontend auth + API layer** change, not a fundamental architecture rewrite.
