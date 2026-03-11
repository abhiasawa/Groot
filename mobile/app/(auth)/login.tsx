import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { useAuth } from "../../lib/auth/provider";
import { fonts, typography } from "../../constants/typography";
import { AnimatedSun } from "../../components/ui/animated-sun";

const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://groot-three.vercel.app"
).replace(/\/$/, "");

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

export default function LoginScreen() {
  const { setToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;
        if (idToken) {
          await handleGoogleToken(idToken);
        } else {
          setError("No ID token received from Google");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            break;
          case statusCodes.IN_PROGRESS:
            setError("Sign-in already in progress");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError("Google Play Services not available");
            break;
          default:
            setError(err.message || "Google sign-in failed");
        }
      } else {
        setError("Could not open Google sign-in");
      }
      setLoading(false);
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        user?: { id: string; display_name: string; email: string };
        error?: string;
        message?: string;
      };

      if (!res.ok || !data.token) {
        if (data.error === "not_allowed") {
          setError(data.message ?? "Noto is invite-only.");
        } else {
          const details = (data as Record<string, unknown>).details;
          const msg = data.error ?? data.message ?? "Sign-in failed";
          setError(details ? `${msg}: ${details}` : msg);
        }
        return;
      }

      await setToken(data.token);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          {/* Branding */}
          <Animated.View
            entering={FadeInDown.duration(450)}
            style={styles.branding}
          >
            <AnimatedSun size={96} />
            <Text style={styles.title}>noto</Text>
            <Text style={styles.subtitle}>
              A calm place for your thoughts
            </Text>
          </Animated.View>

          {/* Sign-in card */}
          <Animated.View entering={FadeIn.delay(200).duration(500)}>
            <View style={styles.card}>
              <Text style={styles.welcomeText}>
                Capture anything, find everything.{"\n"}Sign in to get started.
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleGoogleSignIn}
                disabled={loading}
                style={[styles.googleButton, loading && { opacity: 0.6 }]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={styles.googleButtonInner}>
                    <View style={styles.googleIconWrap}>
                      <GoogleIcon size={20} />
                    </View>
                    <Text style={styles.googleButtonText}>
                      Continue with Google
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(400).duration(500)}>
            <Text style={styles.footer}>
              Noto is invite-only. Ask the owner to add your email.
            </Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function GoogleIcon({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <Path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <Path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <Path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F0EFEB",
  },
  container: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 28,
  },
  branding: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 36,
    color: "#1A1A1A",
    letterSpacing: -1,
    marginTop: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.regular,
    ...typography.base,
    color: "#999",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 24,
    gap: 16,
  },
  welcomeText: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: "#999",
    lineHeight: 22,
    textAlign: "center",
  },
  errorBox: {
    borderRadius: 12,
    backgroundColor: "rgba(226,85,85,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontFamily: fonts.regular,
    ...typography.xs,
    color: "#E25555",
    textAlign: "center",
  },
  googleButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  googleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  googleButtonText: {
    fontFamily: fonts.semiBold,
    ...typography.base,
    color: "#FFF",
  },
  footer: {
    fontFamily: fonts.regular,
    ...typography.xs,
    color: "#C0BDB8",
    textAlign: "center",
    marginTop: 24,
    lineHeight: 18,
  },
});
