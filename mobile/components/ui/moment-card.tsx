import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Flower2 } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useCompose } from "../../lib/compose-context";
import { typography } from "../../constants/typography";
import { GlassCard } from "./glass-card";
import { PressScale } from "./press-scale";

interface MomentCardProps {
  prompt: string | null;
}

/**
 * Storyworthy prompt card — the centerpiece of the Today screen.
 * Shows tonight's evening question. Tap opens compose modal.
 */
export function MomentCard({ prompt }: MomentCardProps) {
  const { colors } = useTheme();
  const { open: openCompose } = useCompose();

  const displayPrompt = prompt ?? "What's one moment from today worth remembering?";

  return (
    <PressScale onPress={() => openCompose("text")} scale={0.98}>
      <GlassCard padding={0} accentColor={colors.accent}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <Flower2 size={16} color={colors.accent} strokeWidth={1.8} />
            <Text style={[styles.label, { color: colors.accent }]}>
              Today&apos;s Moment
            </Text>
          </View>

          <Text style={[styles.prompt, { color: colors.foreground }]}>
            {displayPrompt}
          </Text>

          <Text style={[styles.cta, { color: colors.mutedForeground }]}>
            Tap to respond
          </Text>
        </View>
      </GlassCard>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  inner: {
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  prompt: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
    lineHeight: 26,
  },
  cta: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    marginTop: 4,
  },
});
