import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Sprout, ArrowLeft, MessageCircle } from "lucide-react-native";

import { useAuth } from "../../lib/auth/provider";
import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { PressScale } from "../../components/ui/press-scale";

const API_BASE = "https://groot-three.vercel.app";

export default function LoginScreen() {
  const { setToken } = useAuth();
  const { colors } = useTheme();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);

  const otpInputRef = useRef<TextInput>(null);

  // ── Step 1: Request OTP via WhatsApp ────────────
  const handleRequestOtp = async () => {
    const cleaned = phone.trim();
    if (!cleaned) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: cleaned }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to send code");
      }

      setStep("otp");
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ─────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      setError("Please enter the 6-digit code from WhatsApp");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phone.trim(),
          code: otp.trim(),
        }),
      });

      const data = (await res.json()) as {
        token?: string;
        error?: string;
      };

      if (!res.ok || !data.token) {
        throw new Error(data.error ?? "Invalid code");
      }

      // Store JWT — this triggers AuthGate redirect to main app
      await setToken(data.token);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid code. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Go back to phone step ──────────────────────
  const handleBack = () => {
    setStep("phone");
    setOtp("");
    setError(null);
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

          {step === "otp" ? (
            /* ── OTP Verification Step ── */
            <Animated.View entering={FadeIn.delay(100).duration(500)}>
              <GlassCard delay={0} padding={24}>
                <View style={styles.form}>
                  <View style={styles.otpHeader}>
                    <PressScale onPress={handleBack}>
                      <ArrowLeft
                        size={20}
                        color={colors.mutedForeground}
                        strokeWidth={1.5}
                      />
                    </PressScale>
                    <Text
                      style={[styles.otpTitle, { color: colors.foreground }]}
                    >
                      Check your WhatsApp
                    </Text>
                  </View>

                  <View style={styles.otpDescRow}>
                    <MessageCircle
                      size={16}
                      color={colors.primary}
                      strokeWidth={1.5}
                    />
                    <Text
                      style={[styles.otpBody, { color: colors.mutedForeground }]}
                    >
                      We sent a 6-digit code to {phone}
                    </Text>
                  </View>

                  <TextInput
                    ref={otpInputRef}
                    style={[
                      styles.otpInput,
                      {
                        backgroundColor: colors.glassSurface,
                        color: colors.foreground,
                        borderColor: colors.glassBorder,
                      },
                    ]}
                    placeholder="000000"
                    placeholderTextColor={colors.mutedForeground}
                    value={otp}
                    onChangeText={(text) => {
                      const digits = text.replace(/\D/g, "").slice(0, 6);
                      setOtp(digits);
                    }}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={6}
                    editable={!loading}
                  />

                  {error ? (
                    <Text
                      style={[styles.errorText, { color: colors.destructive }]}
                    >
                      {error}
                    </Text>
                  ) : null}

                  <PressScale
                    onPress={handleVerifyOtp}
                    haptic={!loading && otp.length === 6}
                  >
                    <View
                      style={[
                        styles.button,
                        {
                          backgroundColor: colors.primary,
                          opacity: loading || otp.length < 6 ? 0.6 : 1,
                        },
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator color={colors.primaryForeground} />
                      ) : (
                        <Text
                          style={[
                            styles.buttonText,
                            { color: colors.primaryForeground },
                          ]}
                        >
                          Verify & Sign In
                        </Text>
                      )}
                    </View>
                  </PressScale>

                  <PressScale onPress={handleRequestOtp} haptic={!loading}>
                    <Text
                      style={[styles.resendLink, { color: colors.primary }]}
                    >
                      Resend code
                    </Text>
                  </PressScale>
                </View>
              </GlassCard>
            </Animated.View>
          ) : (
            /* ── Phone Number Input Step ── */
            <Animated.View entering={FadeIn.delay(200).duration(500)}>
              <GlassCard delay={100} padding={24}>
                <View style={styles.form}>
                  <Text
                    style={[styles.inputLabel, { color: colors.mutedForeground }]}
                  >
                    Enter your WhatsApp number
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.glassSurface,
                        color: colors.foreground,
                        borderColor: colors.glassBorder,
                      },
                    ]}
                    placeholder="98765 43210"
                    placeholderTextColor={colors.mutedForeground}
                    value={phone}
                    onChangeText={setPhone}
                    autoCapitalize="none"
                    autoComplete="tel"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    editable={!loading}
                  />

                  {error ? (
                    <Text
                      style={[styles.errorText, { color: colors.destructive }]}
                    >
                      {error}
                    </Text>
                  ) : null}

                  <PressScale
                    onPress={handleRequestOtp}
                    haptic={!loading && !!phone.trim()}
                  >
                    <View
                      style={[
                        styles.button,
                        {
                          backgroundColor: colors.primary,
                          opacity: loading || !phone.trim() ? 0.6 : 1,
                        },
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator color={colors.primaryForeground} />
                      ) : (
                        <Text
                          style={[
                            styles.buttonText,
                            { color: colors.primaryForeground },
                          ]}
                        >
                          Send Code via WhatsApp
                        </Text>
                      )}
                    </View>
                  </PressScale>
                </View>
              </GlassCard>
            </Animated.View>
          )}

          <Animated.View entering={FadeIn.delay(400).duration(500)}>
            <Text
              style={[styles.footer, { color: colors.mutedForeground }]}
            >
              Message Groot on WhatsApp first to create your account
            </Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
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
    fontFamily: "Inter_700Bold",
    ...typography.hero,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.base,
  },
  form: {
    gap: 16,
  },
  inputLabel: {
    fontFamily: "Inter_500Medium",
    ...typography.sm,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    ...typography.base,
  },
  otpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  otpTitle: {
    fontFamily: "Inter_600SemiBold",
    ...typography.lg,
  },
  otpDescRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  otpBody: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    lineHeight: 20,
    flex: 1,
  },
  otpInput: {
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: 10,
    textAlign: "center",
  },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    ...typography.base,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    textAlign: "center",
  },
  resendLink: {
    fontFamily: "Inter_500Medium",
    ...typography.sm,
    textAlign: "center",
  },
  footer: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    textAlign: "center",
    marginTop: 24,
  },
});
