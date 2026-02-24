import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { useTheme } from "../../lib/theme/provider";

interface AnimatedStatProps {
  value: number;
  label: string;
  icon?: React.ReactNode;
}

export function AnimatedStat({ value, label, icon }: AnimatedStatProps) {
  const { colors } = useTheme();
  const displayValue = useSharedValue(0);

  useEffect(() => {
    displayValue.value = withTiming(value, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, displayValue]);

  // For React Native, we use a simple Text approach since AnimatedText
  // with useAnimatedProps has limitations. We'll use a static display.
  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.container}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={[styles.value, { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    gap: 4,
  },
  iconWrap: {
    marginBottom: 2,
  },
  value: {
    fontFamily: "Sora_700Bold",
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.7,
  },
  label: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
});
