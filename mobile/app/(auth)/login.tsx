import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Sprout } from "lucide-react-native";

import { useAuth } from "../../lib/auth/provider";
import { useTheme } from "../../lib/theme/provider";

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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Branding */}
        <View style={styles.branding}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: colors.primary + "1A" },
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
        </View>

        {sent ? (
          /* Success state */
          <View style={styles.successCard}>
            <Text style={[styles.successTitle, { color: colors.primary }]}>
              Check your email
            </Text>
            <Text
              style={[styles.successBody, { color: colors.mutedForeground }]}
            >
              We sent a magic link to {email}. Tap it to sign in.
            </Text>
            <Pressable
              onPress={() => {
                setSent(false);
                setEmail("");
              }}
            >
              <Text style={[styles.retryLink, { color: colors.primary }]}>
                Use a different email
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Email input form */
          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.secondary,
                  color: colors.foreground,
                  borderColor: colors.border,
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
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {error}
              </Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleSendLink}
              disabled={loading || !email.trim()}
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
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 32,
  },
  branding: {
    alignItems: "center",
    marginBottom: 48,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  form: {
    gap: 16,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  successCard: {
    alignItems: "center",
    gap: 8,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  successBody: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  retryLink: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 8,
  },
});
