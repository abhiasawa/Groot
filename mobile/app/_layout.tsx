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
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../lib/auth/provider";
import { ThemeProvider } from "../lib/theme/provider";

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
        <Text style={fallbackStyles.text}>Loading…</Text>
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
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="habits" />
              <Stack.Screen name="tasks" />
              <Stack.Screen name="insights" />
              <Stack.Screen name="topics" />
              <Stack.Screen name="people" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="settings" />
            </Stack>
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
    backgroundColor: "#0A0A0A",
  },
  text: {
    color: "#888",
    fontSize: 16,
  },
});
