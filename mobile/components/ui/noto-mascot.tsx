/**
 * Noto Cloud Mascot — animated with React Native Skia + Reanimated.
 *
 * Renders a friendly, symmetrical cloud character with:
 *  - Gentle floating bob
 *  - Breathing glow pulse
 *  - Drifting rain dots
 *  - Occasional eye blink
 */
import React, { useEffect } from "react";
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
}

export function NotoMascot({ size = 260 }: NotoMascotProps) {
  const scale = size / 320;
  const canvasW = 320 * scale;
  const canvasH = 280 * scale;

  // ── Shared values ────────────────────────────────────────
  const bobY = useSharedValue(0);
  const glowOpacity = useSharedValue(0.15);
  const blinkProgress = useSharedValue(0); // 0 = open, 1 = closed
  const rainProgress = RAIN_DROPS.map(() => useSharedValue(0));

  useEffect(() => {
    // Gentle bob — 3s period, ±4px
    bobY.value = withRepeat(
      withTiming(-4, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    // Glow pulse — 4s period
    glowOpacity.value = withRepeat(
      withTiming(0.28, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    // Blink every ~4s — quick close/open
    const startBlink = () => {
      blinkProgress.value = withSequence(
        withDelay(
          3500 + Math.random() * 2000,
          withTiming(1, { duration: 100 }),
        ),
        withTiming(0, { duration: 150 }),
      );
      // Re-trigger
      setTimeout(startBlink, 4000 + Math.random() * 3000);
    };
    startBlink();

    // Rain drops — continuous fall with staggered starts
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
  }, []);

  // ── Animated container style (bob) ───────────────────────
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }],
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
