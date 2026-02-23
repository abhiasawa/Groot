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

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Auth] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Auth will not work. Check your .env.local file.",
  );
}

/**
 * Custom storage adapter that delegates to expo-secure-store so that tokens
 * survive app restarts and are stored in the device keychain / keystore.
 */
const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session: restored } }) => {
      setSession(restored);
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
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
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
