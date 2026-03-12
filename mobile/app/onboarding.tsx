import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";

import { apiFetch } from "../lib/api/client";
import { fonts, typography } from "../constants/typography";
import { NotoMascot } from "../components/ui/noto-mascot";
import { notoTheme } from "../lib/theme/tokens";

export default function OnboardingScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFinish = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch("/api/mobile/onboard", {
        method: "POST",
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          checkinTime: "08:00",
          preferences: { morning_checkin: false, evening_journal: false },
        }),
      });
    } catch {
      // Proceed even if onboarding write fails.
    } finally {
      setLoading(false);
      router.replace("/");
    }
  }, [displayName, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        {/* Skip button */}
        <View style={styles.topRow}>
          <View style={styles.spacer} />
          <Pressable
            style={styles.skipBtn}
            onPress={() => router.replace("/")}
            hitSlop={12}
          >
            <X size={18} color="#999" />
          </Pressable>
        </View>

        {/* Mascot + welcome */}
        <View style={styles.center}>
          <NotoMascot size={160} />
          <Text style={styles.title}>Welcome to Noto</Text>
          <Text style={styles.subtitle}>
            A calm place for your thoughts.{"\n"}Capture anything, find everything.
          </Text>
        </View>

        {/* Name input + finish */}
        <View style={styles.sheet}>
          <TextInput
            style={styles.input}
            placeholder="What should we call you?"
            placeholderTextColor="#BBB"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <Pressable
            style={[styles.finishBtn, !displayName.trim() && styles.finishBtnDisabled]}
            onPress={handleFinish}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.finishText}>Get started</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0EFEB" },
  root: { flex: 1, paddingHorizontal: 24 },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 8,
  },
  spacer: { flex: 1 },
  skipBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: notoTheme.background,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.bold,
    ...typography["2xl"],
    color: notoTheme.foreground,
    marginTop: 24,
  },
  subtitle: {
    fontFamily: fonts.regular,
    ...typography.sm,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  sheet: {
    paddingBottom: 20,
    gap: 12,
  },
  input: {
    height: 52,
    borderRadius: 16,
    backgroundColor: notoTheme.background,
    paddingHorizontal: 16,
    fontFamily: fonts.medium,
    ...typography.sm,
    color: "#333",
  },
  finishBtn: {
    height: 52,
    borderRadius: 20,
    backgroundColor: notoTheme.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  finishBtnDisabled: {
    opacity: 0.5,
  },
  finishText: {
    fontFamily: fonts.semiBold,
    ...typography.sm,
    color: "#FFF",
  },
});
