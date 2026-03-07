import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { Sora_600SemiBold, Sora_700Bold } from "@expo-google-fonts/sora";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../lib/auth/provider";
import { ThemeProvider } from "../lib/theme/provider";
import { useNotifications } from "../lib/notifications";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before assets are loaded.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden or not available — safe to ignore.
});

// ---------------------------------------------------------------------------
// React Query
// ---------------------------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
});

let asyncStoragePersister: ReturnType<typeof createAsyncStoragePersister>;
try {
  asyncStoragePersister = createAsyncStoragePersister({
    storage: AsyncStorage,
  });
} catch {
  // If persister creation fails, create a no-op persister
  asyncStoragePersister = createAsyncStoragePersister({
    storage: {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    },
  });
}

// ---------------------------------------------------------------------------
// Auth-aware navigation
// ---------------------------------------------------------------------------

/**
 * Redirects the user based on their auth state:
 * - No session → login screen
 * - Has session → main tabs
 *
 * Account linking (if needed) is handled automatically by the backend:
 * when a user logs in with an email that matches a Groot user,
 * the backend auto-links the accounts on the first API call.
 *
 * If the backend can't match (no email on record), the user will see
 * an error when accessing data and can link manually via Settings.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const segments = useSegments();
  const previousTokenRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;

    if (previousTokenRef.current === undefined) {
      previousTokenRef.current = token;
      return;
    }

    if (previousTokenRef.current !== token) {
      // Prevent stale cross-account data from persisted query cache.
      queryClient.clear();
    }
    previousTokenRef.current = token;
  }, [token, loading, queryClient]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      // Not signed in → go to login
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      // Signed in → go to main app
      router.replace("/(tabs)");
    }
  }, [token, loading, segments, router]);

  if (loading) {
    return null; // Splash screen is still showing
  }

  return <>{children}</>;
}

/**
 * Initialises local notifications once the user is authenticated.
 * Must be rendered inside both AuthProvider and QueryClientProvider.
 */
function NotificationBootstrap({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();

  // Only activate notifications when signed in
  if (token) {
    return <NotificationRunner>{children}</NotificationRunner>;
  }
  return <>{children}</>;
}

function NotificationRunner({ children }: { children: React.ReactNode }) {
  useNotifications();
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      // Log the error but don't throw — the app can still render with system fonts
      console.warn("[Fonts] Failed to load Inter fonts:", fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        // Safe to ignore — splash may already be hidden
      });
    }
  }, [fontsLoaded, fontError]);

  // Show a minimal loading view while fonts load (instead of null which can
  // cause Android to think the app has no UI and kill it)
  if (!fontsLoaded && !fontError) {
    return (
      <View style={fallbackStyles.container}>
        <View style={fallbackStyles.orb}>
          <Text style={fallbackStyles.orbText}>G</Text>
        </View>
        <Text style={fallbackStyles.title}>Groot</Text>
        <Text style={fallbackStyles.text}>Initializing organic systems...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: asyncStoragePersister }}
          >
            <AuthGate>
              <NotificationBootstrap>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="tasks" />
                  <Stack.Screen name="insights" />
                  <Stack.Screen name="topics" />
                  <Stack.Screen name="profile" />
                  <Stack.Screen name="settings" />
                </Stack>
              </NotificationBootstrap>
            </AuthGate>
          </PersistQueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const fallbackStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#171B19",
  },
  orb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2E483A",
    marginBottom: 20,
  },
  orbText: {
    color: "#FFF8EE",
    fontFamily: "Sora_700Bold",
    fontSize: 34,
  },
  title: {
    color: "#FFF8EE",
    fontFamily: "Sora_700Bold",
    fontSize: 28,
    marginBottom: 8,
  },
  text: {
    color: "#A5B3A8",
    fontSize: 14,
  },
});
