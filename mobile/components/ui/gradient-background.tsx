import React from "react";
import { StyleSheet, type ColorValue } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../lib/theme/provider";

interface GradientBackgroundProps {
  children: React.ReactNode;
  /** Override gradient colors (min 2) */
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
}

export function GradientBackground({ children, colors: overrideColors }: GradientBackgroundProps) {
  const { colors } = useTheme();

  const gradientColors: readonly [ColorValue, ColorValue, ...ColorValue[]] =
    overrideColors ?? [
      colors.gradientStart,
      colors.gradientMid,
      colors.gradientEnd,
    ];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
