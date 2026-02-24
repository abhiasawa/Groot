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
      <View pointerEvents="none" style={styles.paperWash} />
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
    opacity: 0.14,
  },
  auraPrimary: {
    width: 220,
    height: 220,
    top: -150,
    right: -110,
  },
  auraSecondary: {
    width: 210,
    height: 210,
    top: "44%",
    left: -130,
  },
  auraTertiary: {
    width: 230,
    height: 230,
    bottom: -170,
    right: -60,
  },
  paperWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.015)",
  },
});
