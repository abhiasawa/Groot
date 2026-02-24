import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface PillBadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  small?: boolean;
  style?: ViewStyle;
}

export function PillBadge({ label, color, textColor, small, style }: PillBadgeProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.pill,
        small && styles.pillSmall,
        {
          backgroundColor: color ?? colors.secondary,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          small && styles.textSmall,
          { color: textColor ?? colors.mutedForeground },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillSmall: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 16,
  },
  text: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.1,
  },
  textSmall: {
    fontSize: 11,
  },
});
