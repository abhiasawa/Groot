import React from "react";
import { Pressable, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
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
}

export function PressScale({
  children,
  onPress,
  style,
  scale = 0.985,
  haptic = true,
}: PressScaleProps) {
  const pressed = useSharedValue(false);

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
    ],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        pressed.value = true;
      }}
      onPressOut={() => {
        pressed.value = false;
      }}
      onPress={() => {
        if (haptic) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
      }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
