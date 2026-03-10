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

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync().catch(() => {});

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
      queryClient.clear();
    }
    previousTokenRef.current = token;
  }, [token, loading, queryClient]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      router.replace("/");
    }
  }, [token, loading, segments, router]);

  if (loading) {
    return null;
  }

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
      console.warn("[Fonts] Failed to load fonts:", fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={fallbackStyles.container}>
        <View style={fallbackStyles.orb}>
          <Text style={fallbackStyles.orbText}>N</Text>
        </View>
        <Text style={fallbackStyles.title}>noto</Text>
        <Text style={fallbackStyles.text}>Loading...</Text>
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
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="index" />
                <Stack.Screen
                  name="capture"
                  options={{
                    presentation: "transparentModal",
                    animation: "fade",
                    contentStyle: { backgroundColor: "transparent" },
                  }}
                />
                <Stack.Screen
                  name="card-detail"
                  options={{
                    animation: "fade",
                  }}
                />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="settings" />
              </Stack>
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
    backgroundColor: "#FEFEFE",
  },
  orb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A5B4FC",
    marginBottom: 20,
  },
  orbText: {
    color: "#FFF",
    fontFamily: "Sora_700Bold",
    fontSize: 34,
  },
  title: {
    color: "#1A1A1A",
    fontFamily: "Sora_700Bold",
    fontSize: 28,
    marginBottom: 8,
  },
  text: {
    color: "#999",
    fontSize: 14,
  },
});
