import React from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../lib/theme/provider";

interface GradientBackgroundProps {
  children: React.ReactNode;
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
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.gradient}
    >
      <View
        pointerEvents="none"
        style={[styles.veil, { backgroundColor: `${colors.background}88` }]}
      />
      <View
        pointerEvents="none"
        style={[styles.aura, styles.auraPrimary, { backgroundColor: colors.auraPrimary }]}
      />
      <View
        pointerEvents="none"
        style={[styles.aura, styles.auraSecondary, { backgroundColor: colors.auraSecondary }]}
      />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
  },
  aura: {
    position: "absolute",
    borderRadius: 999,
  },
  auraPrimary: {
    width: 340,
    height: 340,
    top: -150,
    right: -90,
    opacity: 0.7,
  },
  auraSecondary: {
    width: 280,
    height: 280,
    bottom: -120,
    left: -90,
    opacity: 0.55,
  },
});
