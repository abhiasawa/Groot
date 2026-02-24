import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";

// ---------------------------------------------------------------------------
// Secure token storage
// ---------------------------------------------------------------------------

const TOKEN_KEY = "groot-jwt";

async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (err) {
    console.warn("[Auth] SecureStore.getItem failed:", err);
    return null;
  }
}

async function setStoredToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (err) {
    console.warn("[Auth] SecureStore.setItem failed:", err);
  }
}

async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (err) {
    console.warn("[Auth] SecureStore.deleteItem failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** The JWT token for API calls. Null = not authenticated. */
  token: string | null;
  /** Store a new JWT (called by login screen after OTP verification). */
  setToken: (token: string) => Promise<void>;
  /** Sign the current user out and clear the stored token. */
  signOut: () => Promise<void>;
  /** True while the initial token is being restored from storage. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore token on mount
  useEffect(() => {
    getStoredToken()
      .then((restored) => {
        if (restored) {
          setTokenState(restored);
        }
      })
      .catch((err) => {
        console.warn("[Auth] Failed to restore token:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const setToken = useCallback(async (newToken: string) => {
    await setStoredToken(newToken);
    setTokenState(newToken);
  }, []);

  const signOut = useCallback(async () => {
    await clearStoredToken();
    setTokenState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ token, setToken, signOut, loading }),
    [token, setToken, signOut, loading],
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
