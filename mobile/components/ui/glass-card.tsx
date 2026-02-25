import React, { useEffect } from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../../lib/theme/provider";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accentColor?: string;
  delay?: number;
  padding?: number;
  intensity?: number;
  /** Enable a very subtle "breathing" scale pulse. Default false. */
  breathing?: boolean;
}

export function GlassCard({
  children,
  style,
  accentColor,
  delay = 0,
  padding = 20,
  intensity = 40,
  breathing = false,
}: GlassCardProps) {
  const { colors } = useTheme();
  void delay;
  void intensity;

  const breathScale = useSharedValue(1);

  useEffect(() => {
    if (breathing) {
      breathScale.value = withRepeat(
        withSequence(
          withTiming(1.002, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }
  }, [breathing, breathScale]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  const cardContent = (
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

  if (breathing) {
    return <Animated.View style={breathStyle}>{cardContent}</Animated.View>;
  }

  return cardContent;
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
