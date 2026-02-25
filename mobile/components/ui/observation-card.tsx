import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Eye } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GlassCard } from "./glass-card";

interface ObservationCardProps {
  observation: string;
}

/**
 * Groot's weekly observation — a pattern or insight noticed from the user's data.
 */
export function ObservationCard({ observation }: ObservationCardProps) {
  const { colors } = useTheme();

  return (
    <GlassCard padding={16}>
      <View style={styles.header}>
        <Eye size={14} color={colors.mutedForeground} strokeWidth={1.8} />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Groot noticed
        </Text>
      </View>
      <Text style={[styles.text, { color: colors.foreground }]}>
        {observation}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  text: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
    fontStyle: "italic",
  },
});
