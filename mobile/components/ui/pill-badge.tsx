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
          backgroundColor: color ?? colors.glassSurface,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  pillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.1,
  },
  textSmall: {
    fontSize: 11,
  },
});
