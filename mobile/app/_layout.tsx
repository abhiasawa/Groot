import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "../lib/theme/provider";
import { AuthProvider, useAuth } from "../lib/auth/provider";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before assets are loaded.
SplashScreen.preventAutoHideAsync();

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

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

// ---------------------------------------------------------------------------
// Auth gate — redirects unauthenticated users to the login screen
// ---------------------------------------------------------------------------

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Not signed in and not already on the auth screens — redirect.
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Signed in but still on an auth screen — go to the main app.
      router.replace("/(tabs)");
    }
  }, [session, loading, segments, router]);

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister }}
        >
          <AuthProvider>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="habits" />
                <Stack.Screen name="tasks" />
                <Stack.Screen name="insights" />
                <Stack.Screen name="topics" />
                <Stack.Screen name="people" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="settings" />
              </Stack>
            </AuthGate>
          </AuthProvider>
        </PersistQueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
