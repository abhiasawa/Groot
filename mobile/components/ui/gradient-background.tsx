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
  },
  auraPrimary: {
    width: 280,
    height: 280,
    top: -180,
    right: -120,
    opacity: 0.5,
  },
  auraSecondary: {
    width: 240,
    height: 240,
    bottom: -160,
    left: -100,
    opacity: 0.4,
  },
});
