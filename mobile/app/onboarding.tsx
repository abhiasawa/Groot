import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Mic, X } from "lucide-react-native";

import { GradientBackground } from "../components/ui/gradient-background";
import { useTheme } from "../lib/theme/provider";
import { apiFetch } from "../lib/api/client";
import { typography } from "../constants/typography";

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [voiceCheckins, setVoiceCheckins] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleFinish = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch("/api/mobile/onboard", {
        method: "POST",
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          checkinTime: "08:00",
          preferences: {
            morning_checkin: true,
            evening_journal: true,
            voice_checkins: voiceCheckins,
          },
        }),
      });
    } catch {
      // Proceed even if onboarding write fails.
    } finally {
      setLoading(false);
      router.replace("/(tabs)/journal");
    }
  }, [displayName, router, voiceCheckins]);

  return (
    <SafeAreaView style={styles.safe}>
      <GradientBackground>
        <View style={styles.header}>
          <Pressable style={[styles.topButton, { backgroundColor: colors.secondary }]} onPress={() => router.replace("/(tabs)/journal")}>
            <X size={18} color={colors.foreground} />
          </Pressable>
          <View style={styles.progressWrap}>
            <Text style={[styles.brand, { color: colors.primary }]}>Groot</Text>
            <View style={styles.progressRow}>
              <View style={[styles.progressActive, { backgroundColor: colors.primary }]} />
              <View style={[styles.progressIdle, { backgroundColor: `${colors.primary}30` }]} />
              <View style={[styles.progressIdle, { backgroundColor: `${colors.primary}30` }]} />
            </View>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.copyBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>How was your day?</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Whisper your thoughts to the seed</Text>
        </View>

        <View style={styles.visualWrap}>
          <View style={[styles.visualHalo, { backgroundColor: colors.auraPrimary }]} />
          <View style={styles.waveRow}>
            {[16, 24, 40, 56, 64, 48, 32, 20, 12].map((bar, index) => (
              <View
                key={index}
                style={[
                  styles.waveBar,
                  {
                    height: bar * 3,
                    backgroundColor: index >= 3 && index <= 5 ? colors.primary : `${colors.primary}${index > 5 ? "33" : "55"}`,
                  },
                ]}
              />
            ))}
          </View>
          <View style={[styles.listenPill, { backgroundColor: `${colors.primary}16`, borderColor: `${colors.primary}26` }]}>
            <Mic size={14} color={colors.primary} />
            <Text style={[styles.listenText, { color: colors.primary }]}>Listening...</Text>
          </View>
        </View>

        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Plant your first seed</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border }]}
            placeholder="What should Groot call you?"
            placeholderTextColor={colors.mutedForeground}
            value={displayName}
            onChangeText={setDisplayName}
          />

          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Voice check-ins</Text>
              <Text style={[styles.toggleSubtitle, { color: colors.mutedForeground }]}>Secure and encrypted whispers</Text>
            </View>
            <Switch
              value={voiceCheckins}
              onValueChange={setVoiceCheckins}
              trackColor={{ false: colors.muted, true: `${colors.primary}50` }}
              thumbColor={voiceCheckins ? colors.primary : colors.card}
            />
          </View>

          <View style={styles.actionRow}>
            <Pressable style={[styles.cancelButton, { backgroundColor: colors.secondary }]} onPress={() => router.replace("/(tabs)/journal")}>
              <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.finishButton, { backgroundColor: colors.primary }]} onPress={handleFinish}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.finishText, { color: colors.primaryForeground }]}>Finish Seed</Text>
              )}
            </Pressable>
          </View>
        </View>
      </GradientBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: {
    alignItems: "center",
  },
  brand: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
  },
  progressActive: {
    width: 18,
    height: 4,
    borderRadius: 999,
  },
  progressIdle: {
    width: 10,
    height: 4,
    borderRadius: 999,
  },
  placeholder: {
    width: 44,
  },
  copyBlock: {
    paddingHorizontal: 24,
    paddingTop: 30,
    alignItems: "center",
  },
  title: {
    fontFamily: "Sora_700Bold",
    ...typography["3xl"],
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Manrope_500Medium",
    ...typography.base,
    marginTop: 8,
    textAlign: "center",
  },
  visualWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  visualHalo: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  waveRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  waveBar: {
    width: 10,
    borderRadius: 999,
  },
  listenPill: {
    marginTop: 28,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 40,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listenText: {
    fontFamily: "Manrope_700Bold",
    ...typography.xs,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  sheetTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: "Manrope_700Bold",
    ...typography.sm,
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 6,
  },
  cancelButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontFamily: "Manrope_700Bold",
    ...typography.sm,
  },
  finishButton: {
    flex: 1.4,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  finishText: {
    fontFamily: "Sora_600SemiBold",
    ...typography.sm,
  },
});
