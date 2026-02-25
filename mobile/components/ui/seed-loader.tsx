import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Svg, { Path, Circle, Ellipse } from "react-native-svg";
import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface SeedLoaderProps {
  /** Text shown below the animation */
  label?: string;
  /** Overall size of the loader. Default 48 */
  size?: number;
}

/**
 * Seed germination loading animation.
 * 3-phase loop: seed → sprout → small leaf, then resets.
 */
export function SeedLoader({ label = "Growing...", size = 48 }: SeedLoaderProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        // Phase 1: seed appears (0 → 0.3)
        withTiming(0.3, { duration: 600, easing: Easing.out(Easing.cubic) }),
        // Phase 2: sprout grows (0.3 → 0.7)
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.cubic) }),
        // Phase 3: leaf unfurls (0.7 → 1.0)
        withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
        // Pause at full bloom
        withTiming(1.0, { duration: 400 }),
        // Reset
        withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }),
      ),
      -1,
      false,
    );
  }, [progress]);

  // Seed: opacity fades as sprout grows
  const seedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 0.5], [0, 1, 0]),
  }));

  // Sprout: grows upward
  const sproutStyle = useAnimatedStyle(() => {
    const stemHeight = interpolate(progress.value, [0.25, 0.7], [0, 1], "clamp");
    return {
      opacity: interpolate(progress.value, [0.2, 0.35, 0.95, 1.0], [0, 1, 1, 0]),
      transform: [{ scaleY: stemHeight }],
    };
  });

  // Leaves: unfurl at the end
  const leafStyle = useAnimatedStyle(() => {
    const leafScale = interpolate(progress.value, [0.6, 0.9], [0, 1], "clamp");
    return {
      opacity: interpolate(progress.value, [0.55, 0.7, 0.95, 1.0], [0, 1, 1, 0]),
      transform: [{ scale: leafScale }],
    };
  });

  // Gentle bounce for the whole thing
  const containerStyle = useAnimatedStyle(() => {
    const bounce = interpolate(progress.value, [0, 0.5, 1], [0, -2, 0]);
    return {
      transform: [{ translateY: bounce }],
    };
  });

  const halfSize = size / 2;

  return (
    <View style={s.wrapper}>
      <Animated.View style={[{ width: size, height: size }, containerStyle]}>
        {/* Seed phase */}
        <Animated.View style={[s.layer, seedStyle]}>
          <Svg width={size} height={size} viewBox="0 0 48 48">
            <Ellipse cx="24" cy="36" rx="6" ry="4" fill={colors.primary} opacity={0.15} />
            <Circle cx="24" cy="32" r="5" fill={colors.accent} />
            <Circle cx="23" cy="31" r="1.5" fill={colors.accentForeground} opacity={0.3} />
          </Svg>
        </Animated.View>

        {/* Sprout phase */}
        <Animated.View style={[s.layer, s.sproutOrigin, sproutStyle]}>
          <Svg width={size} height={size} viewBox="0 0 48 48">
            <Ellipse cx="24" cy="38" rx="8" ry="3" fill={colors.primary} opacity={0.1} />
            <Path
              d="M24 38 Q23.5 28 24 16"
              stroke={colors.primary}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Animated.View>

        {/* Leaf phase */}
        <Animated.View style={[s.layer, leafStyle]}>
          <Svg width={size} height={size} viewBox="0 0 48 48">
            {/* Left leaf */}
            <Path
              d="M24 22 Q16 16 14 10 Q20 14 24 20"
              fill={colors.primary}
              opacity={0.7}
            />
            {/* Right leaf */}
            <Path
              d="M24 20 Q32 14 34 8 Q28 12 24 18"
              fill={colors.primary}
              opacity={0.85}
            />
            {/* Leaf veins */}
            <Path
              d="M23 21 Q18 16 15.5 12"
              stroke={colors.primaryForeground}
              strokeWidth="0.5"
              fill="none"
              opacity={0.3}
            />
            <Path
              d="M25 19 Q30 14 32.5 10"
              stroke={colors.primaryForeground}
              strokeWidth="0.5"
              fill="none"
              opacity={0.3}
            />
          </Svg>
        </Animated.View>
      </Animated.View>

      {label ? (
        <Text style={[s.label, { color: colors.mutedForeground }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  sproutOrigin: {
    transformOrigin: "center bottom",
  },
  label: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
  },
});
