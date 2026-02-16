import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-safe Supabase client using the anon key.
 * Safe to use in client components — RLS is enforced.
 */
export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
