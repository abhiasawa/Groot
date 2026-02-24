import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
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

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(360)}
      style={[
        styles.outer,
        {
          borderColor: colors.glassBorder,
          shadowColor: colors.elevatedShadowColor,
          borderLeftWidth: accentColor ? 3 : 1,
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
              resolvedMode === "dark" ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.55)",
            padding,
          },
        ]}
      >
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    // Shadow
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  card: {
    overflow: "hidden",
    position: "relative",
    borderTopWidth: 1,
  },
});
