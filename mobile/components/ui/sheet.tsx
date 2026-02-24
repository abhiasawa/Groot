import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface SheetProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  /** Optional mood-colored top stripe (2px) */
  accentColor?: string;
}

export function Sheet({
  children,
  style,
  padding = 16,
  accentColor,
}: SheetProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {accentColor && (
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
      )}
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  accent: {
    height: 2,
    width: "100%",
  },
});
