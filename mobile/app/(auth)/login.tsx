import React, { useState } from "react";
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
import { Sprout } from "lucide-react-native";

import { useAuth } from "../../lib/auth/provider";
import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { PressScale } from "../../components/ui/press-scale";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendLink = async () => {
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await signIn(email.trim());
      setSent(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
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

          {sent ? (
            /* Success state */
            <Animated.View entering={FadeIn.delay(100).duration(500)}>
              <GlassCard delay={0} padding={24}>
                <View style={styles.successContent}>
                  <Text style={[styles.successTitle, { color: colors.primary }]}>
                    Check your email
                  </Text>
                  <Text
                    style={[
                      styles.successBody,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    We sent a magic link to {email}. Tap it to sign in.
                  </Text>
                  <PressScale
                    onPress={() => {
                      setSent(false);
                      setEmail("");
                    }}
                  >
                    <Text style={[styles.retryLink, { color: colors.primary }]}>
                      Use a different email
                    </Text>
                  </PressScale>
                </View>
              </GlassCard>
            </Animated.View>
          ) : (
            /* Email input form */
            <Animated.View entering={FadeIn.delay(200).duration(500)}>
              <GlassCard delay={100} padding={24}>
                <View style={styles.form}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.glassSurface,
                        color: colors.foreground,
                        borderColor: colors.glassBorder,
                      },
                    ]}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
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
                    onPress={handleSendLink}
                    haptic={!loading && !!email.trim()}
                  >
                    <View
                      style={[
                        styles.button,
                        {
                          backgroundColor: colors.primary,
                          opacity: loading || !email.trim() ? 0.6 : 1,
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
                          Send Magic Link
                        </Text>
                      )}
                    </View>
                  </PressScale>
                </View>
              </GlassCard>
            </Animated.View>
          )}
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
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    ...typography.base,
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
  successContent: {
    alignItems: "center",
    gap: 8,
  },
  successTitle: {
    fontFamily: "Inter_600SemiBold",
    ...typography.xl,
  },
  successBody: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  retryLink: {
    fontFamily: "Inter_500Medium",
    ...typography.sm,
    marginTop: 8,
  },
});
