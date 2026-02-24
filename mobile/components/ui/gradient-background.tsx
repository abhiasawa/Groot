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
    opacity: 0.2,
  },
  auraPrimary: {
    width: 180,
    height: 180,
    top: -120,
    right: -80,
  },
  auraSecondary: {
    width: 160,
    height: 160,
    top: "46%",
    left: -90,
  },
  auraTertiary: {
    width: 180,
    height: 180,
    bottom: -120,
    right: "10%",
  },
  paperWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
});
