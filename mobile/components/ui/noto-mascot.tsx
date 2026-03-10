/**
 * Noto Cloud Mascot — animated with React Native Skia + Reanimated.
 *
 * Renders a friendly, symmetrical cloud character with cycling animations:
 *  - Idle float (gentle bob)
 *  - Wiggle (side-to-side rotation)
 *  - Bounce (pronounced vertical hop)
 *  - Breathe (scale pulse)
 *  - Happy shake (quick excited vibration)
 *  - Breathing glow pulse
 *  - Occasional eye blink
 *  - Drifting rain dots
 */
import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  Canvas,
  Path,
  Circle,
  LinearGradient,
  RadialGradient,
  vec,
  Skia,
  Group,
  Oval,
  BlurMask,
} from "@shopify/react-native-skia";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  useDerivedValue,
} from "react-native-reanimated";

// ── Cloud shape path (symmetrical) ──────────────────────────
const CLOUD_PATH = Skia.Path.MakeFromSVGString(
  "M130 140 " +
    "C95 140 70 120 70 100 " +
    "C70 82 82 68 98 65 " +
    "C96 50 108 35 125 35 " +
    "C132 25 145 18 160 18 " +
    "C175 18 185 25 195 35 " +
    "C212 35 224 50 222 65 " +
    "C238 68 250 82 250 100 " +
    "C250 120 225 140 190 140 Z",
)!;

// ── Rain drop positions (symmetrical pairs + center) ────────
const RAIN_DROPS = [
  { x: 130, startY: 155, delay: 0 },
  { x: 160, startY: 158, delay: 400 },
  { x: 190, startY: 155, delay: 200 },
  { x: 145, startY: 165, delay: 600 },
  { x: 175, startY: 165, delay: 800 },
];

interface NotoMascotProps {
  /** Overall width — height computed proportionally. Default 260. */
  size?: number;
  /** If true, crops canvas to just the cloud body (no rain). Good for small sizes. */
  compact?: boolean;
}

export function NotoMascot({ size = 260, compact = false }: NotoMascotProps) {
  const scale = size / 320;
  const canvasW = 320 * scale;
  // Compact mode: crop to just the cloud (y 0–150), no rain area
  const canvasH = compact ? 160 * scale : 280 * scale;

  // ── Shared values ────────────────────────────────────────
  const translateY = useSharedValue(0);
  const rotateZ = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const glowOpacity = useSharedValue(0.15);
  const blinkProgress = useSharedValue(0); // 0 = open, 1 = closed
  const rainProgress = RAIN_DROPS.map(() => useSharedValue(0));
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // ── Always-on: gentle float baseline ──────────────────
    translateY.value = withRepeat(
      withTiming(-6, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    // ── Glow pulse — 3.5s period ──────────────────────────
    glowOpacity.value = withRepeat(
      withTiming(0.35, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    // ── Blink — random interval ───────────────────────────
    const startBlink = () => {
      blinkProgress.value = withSequence(
        withDelay(
          2500 + Math.random() * 1500,
          withTiming(1, { duration: 80 }),
        ),
        withTiming(0, { duration: 120 }),
      );
      setTimeout(startBlink, 3000 + Math.random() * 2500);
    };
    startBlink();

    // ── Rain drops ────────────────────────────────────────
    rainProgress.forEach((sv, i) => {
      sv.value = withDelay(
        RAIN_DROPS[i].delay,
        withRepeat(
          withTiming(1, { duration: 2200, easing: Easing.in(Easing.ease) }),
          -1,
          false,
        ),
      );
    });

    // ── Cycling animation states ──────────────────────────
    // Each cycle picks a random animation, plays it, then resets
    const animations = [
      // Wiggle — side-to-side rotation
      () => {
        rotateZ.value = withSequence(
          withTiming(8, { duration: 150, easing: Easing.inOut(Easing.ease) }),
          withTiming(-8, { duration: 150, easing: Easing.inOut(Easing.ease) }),
          withTiming(6, { duration: 120, easing: Easing.inOut(Easing.ease) }),
          withTiming(-6, { duration: 120, easing: Easing.inOut(Easing.ease) }),
          withTiming(3, { duration: 100, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 100, easing: Easing.inOut(Easing.ease) }),
        );
      },
      // Bounce — pronounced hop
      () => {
        translateY.value = withSequence(
          withSpring(-18, { damping: 6, stiffness: 400 }),
          withSpring(2, { damping: 8, stiffness: 300 }),
          withSpring(-10, { damping: 8, stiffness: 350 }),
          withSpring(0, { damping: 10, stiffness: 250 }),
        );
        // Resume float after bounce settles
        setTimeout(() => {
          translateY.value = withRepeat(
            withTiming(-6, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
            -1,
            true,
          );
        }, 800);
      },
      // Breathe — scale pulse
      () => {
        scaleAnim.value = withSequence(
          withTiming(1.12, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.05, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withSpring(1, { damping: 12, stiffness: 200 }),
        );
      },
      // Happy shake — quick excited vibration
      () => {
        rotateZ.value = withSequence(
          withTiming(4, { duration: 50 }),
          withTiming(-4, { duration: 50 }),
          withTiming(4, { duration: 50 }),
          withTiming(-4, { duration: 50 }),
          withTiming(3, { duration: 50 }),
          withTiming(-3, { duration: 50 }),
          withTiming(2, { duration: 50 }),
          withTiming(-2, { duration: 50 }),
          withTiming(0, { duration: 80 }),
        );
        // Pair with a little squish
        scaleAnim.value = withSequence(
          withTiming(1.06, { duration: 200, easing: Easing.inOut(Easing.ease) }),
          withSpring(1, { damping: 10, stiffness: 250 }),
        );
      },
      // Tilt & sway — lean to one side then recover
      () => {
        rotateZ.value = withSequence(
          withTiming(10, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(-8, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(4, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withSpring(0, { damping: 12, stiffness: 200 }),
        );
      },
    ];

    let lastIndex = -1;
    const runCycle = () => {
      // Pick a different animation than last time
      let idx = Math.floor(Math.random() * animations.length);
      while (idx === lastIndex && animations.length > 1) {
        idx = Math.floor(Math.random() * animations.length);
      }
      lastIndex = idx;
      animations[idx]();

      // Next cycle in 4–7 seconds
      cycleTimer.current = setTimeout(runCycle, 4000 + Math.random() * 3000);
    };

    // Start first cycle after a short delay
    cycleTimer.current = setTimeout(runCycle, 2000);

    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
    };
  }, []);

  // ── Animated container style ────────────────────────────
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotateZ.value}deg` },
      { scale: scaleAnim.value },
    ],
  }));

  // ── Derived Skia values ──────────────────────────────────
  const skiaGlowOpacity = useDerivedValue(() => glowOpacity.value);
  const skiaBlink = useDerivedValue(() => blinkProgress.value);

  const rainDerivedY = rainProgress.map((sv, i) =>
    useDerivedValue(() => {
      const drop = RAIN_DROPS[i];
      return drop.startY + sv.value * 40;
    }),
  );
  const rainDerivedOpacity = rainProgress.map((sv) =>
    useDerivedValue(() => {
      const p = sv.value;
      // Fade in then fade out
      if (p < 0.2) return p * 5 * 0.35;
      if (p > 0.7) return (1 - p) * (1 / 0.3) * 0.35;
      return 0.35;
    }),
  );

  // Eye geometry — derived from blink
  const leftEyeY1 = useDerivedValue(() => 82 - skiaBlink.value * 4);
  const rightEyeY1 = useDerivedValue(() => 82 - skiaBlink.value * 4);

  return (
    <Animated.View style={[{ width: canvasW, height: canvasH }, containerStyle]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={[{ scale }]}>
          {/* ── Glow aura ─────────────────────────────── */}
          <Circle cx={160} cy={90} r={100} opacity={skiaGlowOpacity}>
            <RadialGradient
              c={vec(160, 90)}
              r={100}
              colors={["rgba(165,180,252,0.5)", "rgba(165,180,252,0)"]}
            />
            <BlurMask blur={20} style="normal" />
          </Circle>

          {/* ── Cloud body ────────────────────────────── */}
          <Path path={CLOUD_PATH}>
            <LinearGradient
              start={vec(160, 18)}
              end={vec(160, 140)}
              colors={["#C7D2FE", "#A5B4FC", "#818CF8"]}
            />
          </Path>

          {/* ── Glass highlight ────────────────────────── */}
          <Oval x={120} y={30} width={80} height={45} opacity={0.2} color="white">
            <BlurMask blur={8} style="normal" />
          </Oval>

          {/* ── Left eye (peaceful closed arc) ─────────── */}
          <Path
            path={`M142 82 Q150 ${74} 158 82`}
            style="stroke"
            strokeWidth={2.8}
            strokeCap="round"
            color="#4338CA"
          />

          {/* ── Right eye ──────────────────────────────── */}
          <Path
            path={`M162 82 Q170 ${74} 178 82`}
            style="stroke"
            strokeWidth={2.8}
            strokeCap="round"
            color="#4338CA"
          />

          {/* ── Left cheek ─────────────────────────────── */}
          <Oval
            x={130}
            y={91}
            width={16}
            height={9}
            color="rgba(196,181,253,0.35)"
          />

          {/* ── Right cheek ────────────────────────────── */}
          <Oval
            x={174}
            y={91}
            width={16}
            height={9}
            color="rgba(196,181,253,0.35)"
          />

          {/* ── Smile ──────────────────────────────────── */}
          <Path
            path="M150 105 Q160 113 170 105"
            style="stroke"
            strokeWidth={2.2}
            strokeCap="round"
            color="#4338CA"
          />

          {/* ── Rain dots ──────────────────────────────── */}
          {RAIN_DROPS.map((drop, i) => (
            <Circle
              key={i}
              cx={drop.x}
              cy={rainDerivedY[i]}
              r={2.5}
              color="#A5B4FC"
              opacity={rainDerivedOpacity[i]}
            />
          ))}
        </Group>
      </Canvas>
    </Animated.View>
  );
}
