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
          {children}
        </View>
      ) : (
        <BlurView
          intensity={intensity}
          tint={resolvedMode === "dark" ? "dark" : "light"}
          style={[styles.blur, { padding }]}
        >
          {children}
        </BlurView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    // Shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  blur: {
    overflow: "hidden",
  },
  androidFallback: {
    overflow: "hidden",
  },
});
