import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Sprout } from "lucide-react-native";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { useAuth } from "../../lib/auth/provider";
import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { PressScale } from "../../components/ui/press-scale";

const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://groot-three.vercel.app"
).replace(/\/$/, "");

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

// Configure Google Sign-In on module load
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

export default function LoginScreen() {
  const { setToken } = useAuth();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      // Check Play Services availability
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in natively — no browser redirect needed
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
        // User cancelled
        setLoading(false);
      }
    } catch (err) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // User cancelled the sign-in flow
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
          setError(data.message ?? "Groot is invite-only. Ask the owner to add your email.");
        } else {
          const details = (data as Record<string, unknown>).details;
          const msg = data.error ?? data.message ?? "Sign-in failed";
          setError(details ? `${msg}: ${details}` : msg);
        }
        return;
      }

      // Store JWT — triggers navigation to main app
      await setToken(data.token);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
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
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: colors.glassSurface },
              ]}
            >
              <Sprout size={48} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              The Garden
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Your AI Second Brain
            </Text>
          </Animated.View>

          {/* Google Sign-In Card */}
          <Animated.View entering={FadeIn.delay(200).duration(500)}>
            <GlassCard delay={100} padding={24}>
              <View style={styles.form}>
                <Text
                  style={[styles.welcomeText, { color: colors.mutedForeground }]}
                >
                  Sign in to start chatting with Groot — your empathetic AI
                  companion that remembers everything.
                </Text>

                {error ? (
                  <View style={[styles.errorBox, { backgroundColor: `${colors.destructive}12` }]}>
                    <Text
                      style={[styles.errorText, { color: colors.destructive }]}
                    >
                      {error}
                    </Text>
                  </View>
                ) : null}

                <PressScale
                  onPress={handleGoogleSignIn}
                  haptic={!loading}
                >
                  <View
                    style={[
                      styles.googleButton,
                      {
                        backgroundColor: colors.foreground,
                        opacity: loading ? 0.6 : 1,
                      },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <View style={styles.googleButtonInner}>
                        <View style={styles.googleIconWrap}>
                          <GoogleIcon size={20} />
                        </View>
                        <Text
                          style={[
                            styles.googleButtonText,
                            { color: colors.background },
                          ]}
                        >
                          Continue with Google
                        </Text>
                      </View>
                    )}
                  </View>
                </PressScale>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(400).duration(500)}>
            <Text
              style={[styles.footer, { color: colors.mutedForeground }]}
            >
              Groot is invite-only. Ask the owner to add your email to get started.
            </Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

// ── Official Google "G" logo (multi-color) ──
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
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Sora_700Bold",
    ...typography.hero,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.base,
  },
  form: {
    gap: 16,
  },
  welcomeText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
    textAlign: "center",
  },
  errorBox: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    textAlign: "center",
  },
  googleButton: {
    height: 52,
    borderRadius: 14,
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
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
  footer: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 18,
  },
});
