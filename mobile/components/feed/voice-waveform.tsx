/**
 * Reanimated-powered real-time voice waveform visualization.
 * Renders smooth, organic audio bars using animated Views.
 */
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  useAnimatedStyle,
} from "react-native-reanimated";

const BAR_COUNT = 24;
const BAR_WIDTH = 3.5;
const BAR_GAP = 2.5;
const BAR_RADIUS = 2;
const CANVAS_HEIGHT = 48;

// Each bar gets a slightly different frequency and phase
const BAR_CONFIGS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const center = BAR_COUNT / 2;
  const distFromCenter = Math.abs(i - center) / center;
  const maxHeight = CANVAS_HEIGHT * (1 - distFromCenter * 0.6);
  const minHeight = 4;
  const duration = 400 + Math.random() * 300;
  const delay = i * 30;
  const opacity = 1 - distFromCenter * 0.4;
  return { maxHeight, minHeight, duration, delay, opacity };
});

interface VoiceWaveformProps {
  /** Whether actively recording. Bars animate when true, shrink when false. */
  active: boolean;
  /** Container width. Default computed from bar count. */
  width?: number;
  /** Primary color for bars. */
  color?: string;
}

function WaveformBar({
  config,
  active,
  color,
}: {
  config: (typeof BAR_CONFIGS)[number];
  active: boolean;
  color: string;
}) {
  const height = useSharedValue(4);

  useEffect(() => {
    if (active) {
      height.value = withDelay(
        config.delay,
        withRepeat(
          withSequence(
            withTiming(config.maxHeight, {
              duration: config.duration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(config.minHeight, {
              duration: config.duration * 0.8,
              easing: Easing.inOut(Easing.sin),
            }),
          ),
          -1,
          true,
        ),
      );
    } else {
      height.value = withTiming(4, { duration: 300 });
    }
  }, [active]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: BAR_WIDTH,
          borderRadius: BAR_RADIUS,
          backgroundColor: color,
          opacity: config.opacity,
          marginRight: BAR_GAP,
        },
        barStyle,
      ]}
    />
  );
}

export function VoiceWaveform({
  active,
  width: overrideWidth,
  color = "#111",
}: VoiceWaveformProps) {
  const canvasWidth = overrideWidth ?? BAR_COUNT * (BAR_WIDTH + BAR_GAP);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [active]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: pulseScale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: canvasWidth,
          height: CANVAS_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
        },
        containerStyle,
      ]}
    >
      {BAR_CONFIGS.map((cfg, i) => (
        <WaveformBar key={i} config={cfg} active={active} color={color} />
      ))}
    </Animated.View>
  );
}
