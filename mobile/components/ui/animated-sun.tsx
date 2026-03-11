import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from "react-native-reanimated";

interface AnimatedSunProps {
  size?: number;
}

const RAY_COUNT = 8;

export function AnimatedSun({ size = 100 }: AnimatedSunProps) {
  const bodySize = size * 0.45;
  const rayLength = size * 0.22;
  const rayWidth = size * 0.06;
  const rayDistance = bodySize / 2 + size * 0.06;

  // ── Continuous animations ──────────────────────────────
  const rayRotation = useSharedValue(0);
  const breatheScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);

  // ── Cycling animations ─────────────────────────────────
  const bodyRotation = useSharedValue(0);
  const bodyTranslateY = useSharedValue(0);
  const bodyScale = useSharedValue(1);
  const raySpread = useSharedValue(1);

  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Slow continuous ray rotation (full turn every 20s)
    rayRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false,
    );

    // Breathe pulse
    breatheScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    // ── Cycling animation states ──────────────────────
    const animations = [
      // Wiggle
      () => {
        bodyRotation.value = withSequence(
          withTiming(6, { duration: 120, easing: Easing.inOut(Easing.ease) }),
          withTiming(-6, { duration: 120, easing: Easing.inOut(Easing.ease) }),
          withTiming(4, { duration: 100, easing: Easing.inOut(Easing.ease) }),
          withTiming(-4, { duration: 100, easing: Easing.inOut(Easing.ease) }),
          withSpring(0, { damping: 12, stiffness: 200 }),
        );
      },
      // Bounce
      () => {
        bodyTranslateY.value = withSequence(
          withSpring(-12, { damping: 6, stiffness: 400 }),
          withSpring(2, { damping: 8, stiffness: 300 }),
          withSpring(-6, { damping: 8, stiffness: 350 }),
          withSpring(0, { damping: 10, stiffness: 250 }),
        );
      },
      // Happy shake + squish
      () => {
        bodyRotation.value = withSequence(
          withTiming(3, { duration: 50 }),
          withTiming(-3, { duration: 50 }),
          withTiming(3, { duration: 50 }),
          withTiming(-3, { duration: 50 }),
          withTiming(2, { duration: 50 }),
          withTiming(-2, { duration: 50 }),
          withTiming(0, { duration: 80 }),
        );
        bodyScale.value = withSequence(
          withTiming(1.08, { duration: 200, easing: Easing.inOut(Easing.ease) }),
          withSpring(1, { damping: 10, stiffness: 250 }),
        );
      },
      // Ray spread — starburst effect
      () => {
        raySpread.value = withSequence(
          withTiming(1.15, { duration: 300, easing: Easing.out(Easing.ease) }),
          withSpring(1, { damping: 10, stiffness: 200 }),
        );
      },
    ];

    let lastIndex = -1;
    const runCycle = () => {
      let idx = Math.floor(Math.random() * animations.length);
      while (idx === lastIndex && animations.length > 1) {
        idx = Math.floor(Math.random() * animations.length);
      }
      lastIndex = idx;
      animations[idx]();
      cycleTimer.current = setTimeout(runCycle, 5000 + Math.random() * 3000);
    };

    cycleTimer.current = setTimeout(runCycle, 2000);

    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
    };
  }, []);

  // ── Animated styles ────────────────────────────────────
  const bodyAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bodyTranslateY.value },
      { rotate: `${bodyRotation.value}deg` },
      { scale: bodyScale.value * breatheScale.value },
    ],
  }));

  const rayContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rayRotation.value}deg` },
      { scale: raySpread.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Warm glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.2,
            height: size * 1.2,
            borderRadius: size * 0.6,
            top: -size * 0.1,
            left: -size * 0.1,
          },
          glowStyle,
        ]}
      />

      {/* Rays container — rotates slowly */}
      <Animated.View
        style={[
          styles.raysContainer,
          { width: size, height: size },
          rayContainerStyle,
        ]}
      >
        {Array.from({ length: RAY_COUNT }).map((_, i) => {
          const angle = (360 / RAY_COUNT) * i;
          return (
            <View
              key={i}
              style={[
                styles.ray,
                {
                  width: rayWidth,
                  height: rayLength,
                  borderRadius: rayWidth / 2,
                  top: size / 2 - rayDistance - rayLength,
                  left: size / 2 - rayWidth / 2,
                  transformOrigin: `${rayWidth / 2}px ${rayDistance + rayLength}px`,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* Sun body */}
      <Animated.View
        style={[
          styles.body,
          {
            width: bodySize,
            height: bodySize,
            borderRadius: bodySize / 2,
            top: (size - bodySize) / 2,
            left: (size - bodySize) / 2,
          },
          bodyAnimStyle,
        ]}
      >
        {/* Face — two dot eyes + arc smile */}
        <View style={styles.face}>
          <View style={[styles.eye, { width: size * 0.05, height: size * 0.05, borderRadius: size * 0.025 }]} />
          <View style={{ width: size * 0.12 }} />
          <View style={[styles.eye, { width: size * 0.05, height: size * 0.05, borderRadius: size * 0.025 }]} />
        </View>
        <View
          style={[
            styles.smile,
            {
              width: size * 0.14,
              height: size * 0.07,
              borderBottomLeftRadius: size * 0.07,
              borderBottomRightRadius: size * 0.07,
              marginTop: size * 0.02,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  glow: {
    position: "absolute",
    backgroundColor: "#FF8815",
  },
  raysContainer: {
    position: "absolute",
  },
  ray: {
    position: "absolute",
    backgroundColor: "#FFBB2C",
  },
  body: {
    position: "absolute",
    backgroundColor: "#FFBB2C",
    alignItems: "center",
    justifyContent: "center",
  },
  face: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  eye: {
    backgroundColor: "#1E1E1E",
  },
  smile: {
    borderColor: "#1E1E1E",
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 0,
    backgroundColor: "transparent",
  },
});
