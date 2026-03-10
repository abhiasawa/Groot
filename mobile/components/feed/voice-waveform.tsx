/**
 * Skia-powered real-time voice waveform visualization.
 * Renders smooth, organic audio bars on a GPU-accelerated canvas.
 */
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import {
  Canvas,
  RoundedRect,
  Group,
} from "@shopify/react-native-skia";
import Animated, {
  useSharedValue,
  useDerivedValue,
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
  // Bars near center are taller
  const maxHeight = CANVAS_HEIGHT * (1 - distFromCenter * 0.6);
  const minHeight = 4;
  const duration = 400 + Math.random() * 300;
  const delay = i * 30;
  return { maxHeight, minHeight, duration, delay };
});

interface VoiceWaveformProps {
  /** Whether actively recording. Bars animate when true, shrink when false. */
  active: boolean;
  /** Canvas width. Default computed from bar count. */
  width?: number;
  /** Primary color for bars. */
  color?: string;
}

export function VoiceWaveform({
  active,
  width: overrideWidth,
  color = "#111",
}: VoiceWaveformProps) {
  const canvasWidth = overrideWidth ?? BAR_COUNT * (BAR_WIDTH + BAR_GAP);

  // One shared value per bar for its current height
  const barHeights = BAR_CONFIGS.map(() => useSharedValue(4));

  useEffect(() => {
    if (active) {
      barHeights.forEach((sv, i) => {
        const cfg = BAR_CONFIGS[i];
        sv.value = withDelay(
          cfg.delay,
          withRepeat(
            withSequence(
              withTiming(cfg.maxHeight, {
                duration: cfg.duration,
                easing: Easing.inOut(Easing.sin),
              }),
              withTiming(cfg.minHeight, {
                duration: cfg.duration * 0.8,
                easing: Easing.inOut(Easing.sin),
              }),
            ),
            -1,
            true,
          ),
        );
      });
    } else {
      barHeights.forEach((sv) => {
        sv.value = withTiming(4, { duration: 300 });
      });
    }
  }, [active]);

  // Derive y position for each bar (centered vertically)
  const barYs = barHeights.map((h) =>
    useDerivedValue(() => (CANVAS_HEIGHT - h.value) / 2),
  );

  // Derive opacity — slightly transparent at edges
  const barOpacities = BAR_CONFIGS.map((_, i) => {
    const center = BAR_COUNT / 2;
    const dist = Math.abs(i - center) / center;
    return 1 - dist * 0.4;
  });

  // Animated container for pulse effect
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
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
    <Animated.View style={[{ width: canvasWidth, height: CANVAS_HEIGHT }, containerStyle]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group>
          {BAR_CONFIGS.map((_, i) => (
            <RoundedRect
              key={i}
              x={i * (BAR_WIDTH + BAR_GAP)}
              y={barYs[i]}
              width={BAR_WIDTH}
              height={barHeights[i]}
              r={BAR_RADIUS}
              color={color}
              opacity={barOpacities[i]}
            />
          ))}
        </Group>
      </Canvas>
    </Animated.View>
  );
}
