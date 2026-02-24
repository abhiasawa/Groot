import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface PillBadgeProps {
  label: string;
  /** Background color override */
  color?: string;
  /** Text color override */
  textColor?: string;
  /** Small variant */
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
          borderColor: colors.glassBorder,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillSmall: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  text: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.1,
  },
  textSmall: {
    fontSize: 11,
  },
});
