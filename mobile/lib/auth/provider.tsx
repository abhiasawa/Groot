import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

// ---------------------------------------------------------------------------
// Supabase client with expo-secure-store backed persistence
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const missingSupabaseEnvMessage =
  "App is missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
  "Set them in mobile/.env.local for local dev and EAS build env for production.";
const hasSupabaseConfig = !!supabaseUrl && !!supabaseAnonKey;

if (!hasSupabaseConfig) {
  console.warn(`[Auth] ${missingSupabaseEnvMessage}`);
}

/**
 * Custom storage adapter that delegates to expo-secure-store so that tokens
 * survive app restarts and are stored in the device keychain / keystore.
 */
const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn("[Auth] SecureStore.getItem failed:", err);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn("[Auth] SecureStore.setItem failed:", err);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn("[Auth] SecureStore.removeItem failed:", err);
    }
  },
};

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: secureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** Send a magic-link OTP to the given email address. */
  signIn: (email: string) => Promise<void>;
  /** Sign the current user out and clear the stored session. */
  signOut: () => Promise<void>;
  /** True while the initial session is being restored from storage. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Restore session on mount
    supabase.auth
      .getSession()
      .then(({ data: { session: restored } }) => {
        setSession(restored);
      })
      .catch((err) => {
        console.warn("[Auth] Failed to restore session:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Subscribe to future auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error(missingSupabaseEnvMessage);
    }

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      throw new Error(missingSupabaseEnvMessage);
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const user = session?.user ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({ session, user, signIn, signOut, loading }),
    [session, user, signIn, signOut, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
