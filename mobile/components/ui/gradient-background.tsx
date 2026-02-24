import React from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
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
      <View
        pointerEvents="none"
        style={[styles.aura, styles.auraPrimary, { backgroundColor: colors.auraPrimary }]}
      />
      <View
        pointerEvents="none"
        style={[styles.aura, styles.auraSecondary, { backgroundColor: colors.auraSecondary }]}
      />
      <View
        pointerEvents="none"
        style={[styles.aura, styles.auraTertiary, { backgroundColor: colors.auraTertiary }]}
      />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  aura: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.6,
  },
  auraPrimary: {
    width: 260,
    height: 260,
    top: -92,
    left: -70,
  },
  auraSecondary: {
    width: 220,
    height: 220,
    top: "34%",
    right: -100,
  },
  auraTertiary: {
    width: 260,
    height: 260,
    bottom: -130,
    left: "20%",
  },
});
