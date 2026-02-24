import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accentColor?: string;
  delay?: number;
  padding?: number;
  intensity?: number;
}

export function GlassCard({
  children,
  style,
  accentColor,
  delay = 0,
  padding = 20,
  intensity = 40,
}: GlassCardProps) {
  const { colors } = useTheme();
  void delay;
  void intensity;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.glassSurface,
          shadowColor: colors.elevatedShadowColor,
          borderLeftWidth: accentColor ? 3 : 0,
          borderLeftColor: accentColor ?? "transparent",
        },
        style,
      ]}
    >
      <View style={{ padding }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
});
