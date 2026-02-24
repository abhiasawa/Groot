import React from "react";
import { Pressable, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  /** Scale factor on press. Default 0.985 */
  scale?: number;
  /** Enable haptic feedback. Default true */
  haptic?: boolean;
  disabled?: boolean;
}

export function PressScale({
  children,
  onPress,
  style,
  scale = 0.985,
  haptic = true,
  disabled = false,
}: PressScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(pressed.value ? scale : 1, {
          damping: 26,
          stiffness: 320,
          mass: 0.25,
          overshootClamping: true,
        }),
      },
      {
        translateY: withSpring(pressed.value ? 1.2 : 0, {
          damping: 22,
          stiffness: 260,
        }),
      },
    ],
    opacity: withTiming(pressed.value ? 0.96 : 1, { duration: 120 }),
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      onPress={() => {
        if (haptic && !disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
      }}
      android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: false }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
