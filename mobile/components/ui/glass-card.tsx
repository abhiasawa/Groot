import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Left border accent color */
  accentColor?: string;
  /** Animation delay in ms (for stagger effects) */
  delay?: number;
  /** Padding inside the card. Default 20 */
  padding?: number;
  /** Blur intensity. Default 40 */
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
  const { colors, resolvedMode } = useTheme();
  void delay;
  void intensity;

  return (
    <View
      style={[
        styles.outer,
        {
          borderColor: colors.glassBorder,
          shadowColor: colors.elevatedShadowColor,
          borderLeftWidth: accentColor ? 2 : 1,
          borderLeftColor: accentColor ?? colors.glassBorder,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.glassSurface,
            borderTopColor:
              resolvedMode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.75)",
            padding,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    // Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    overflow: "hidden",
    position: "relative",
    borderTopWidth: 1,
  },
});
