import React from "react";
import { View, StyleSheet, type ViewStyle, Platform } from "react-native";
import { BlurView } from "expo-blur";
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
      {Platform.OS === "android" ? (
        // Android: use semi-transparent background (BlurView has limited support)
        <View
          style={[
            styles.androidFallback,
            { backgroundColor: colors.glassSurface, padding },
          ]}
        >
          <View
            pointerEvents="none"
            style={[styles.highlightStrip, { backgroundColor: colors.glassHighlight }]}
          />
          {children}
        </View>
      ) : (
        <BlurView
          intensity={intensity}
          tint={resolvedMode === "dark" ? "dark" : "light"}
          style={[styles.blur, { padding }]}
        >
          <View
            pointerEvents="none"
            style={[styles.highlightStrip, { backgroundColor: colors.glassHighlight }]}
          />
          {children}
        </BlurView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    // Shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 10,
  },
  blur: {
    overflow: "hidden",
    position: "relative",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.26)",
  },
  androidFallback: {
    overflow: "hidden",
    position: "relative",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
  },
  highlightStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    opacity: 0.45,
  },
});
