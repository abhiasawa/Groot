/**
 * Noto Cloud Mascot — expressive animated character.
 *
 * 15 body animations + face micro-interactions (blink via opacity,
 * cheek glow). All elements stay inside SVG for correct scaling.
 */
import React, { useEffect, useRef } from "react";
import Svg, { Path, Circle, Ellipse, Defs, LinearGradient, Stop, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  createAnimatedComponent,
} from "react-native-reanimated";

const AnimatedEllipse = createAnimatedComponent(Ellipse);
const AnimatedG = createAnimatedComponent(G);

interface NotoMascotProps {
  size?: number;
  compact?: boolean;
}

export function NotoMascot({ size = 260, compact = false }: NotoMascotProps) {
  const sc = size / 320;
  const svgW = 320 * sc;
  const svgH = compact ? 160 * sc : 240 * sc;

  // ── Body ──
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotateZ = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const scaleU = useSharedValue(1);

  // ── Face ──
  const eyeOpacity = useSharedValue(1); // 1=open, 0=blink
  const cheekOpacity = useSharedValue(0.35);

  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);

    // ── Idle float ──
    const startFloat = () => {
      translateY.value = withRepeat(
        withTiming(-6, { duration: 2800, easing: ease }),
        -1,
        true,
      );
    };
    startFloat();

    // ── Cheek glow ──
    cheekOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 2000, easing: ease }),
        withTiming(0.25, { duration: 2000, easing: ease }),
      ),
      -1,
      true,
    );

    // ── Blink cycle (opacity-based) ──
    const doBlink = () => {
      const isDouble = Math.random() < 0.25;
      if (isDouble) {
        eyeOpacity.value = withSequence(
          withTiming(0, { duration: 60 }),
          withTiming(1, { duration: 80 }),
          withDelay(100, withSequence(
            withTiming(0, { duration: 50 }),
            withTiming(1, { duration: 70 }),
          )),
        );
      } else {
        eyeOpacity.value = withSequence(
          withTiming(0, { duration: 70 }),
          withTiming(1, { duration: 90 }),
        );
      }
      blinkTimer.current = setTimeout(doBlink, 2200 + Math.random() * 2500);
    };
    blinkTimer.current = setTimeout(doBlink, 1500);

    // ── 15 body animations ──
    const bodyAnims = [
      // 1. Wiggle
      () => {
        rotateZ.value = withSequence(
          withTiming(10, { duration: 100, easing: ease }),
          withTiming(-10, { duration: 100, easing: ease }),
          withTiming(7, { duration: 80, easing: ease }),
          withTiming(-7, { duration: 80, easing: ease }),
          withTiming(3, { duration: 60, easing: ease }),
          withTiming(0, { duration: 60, easing: ease }),
        );
      },
      // 2. Bounce
      () => {
        translateY.value = withSequence(
          withSpring(-24, { damping: 5, stiffness: 450 }),
          withSpring(5, { damping: 7, stiffness: 300 }),
          withSpring(-14, { damping: 7, stiffness: 350 }),
          withSpring(0, { damping: 10, stiffness: 250 }),
        );
        setTimeout(startFloat, 700);
      },
      // 3. Breathe
      () => {
        scaleU.value = withSequence(
          withTiming(1.15, { duration: 500, easing: ease }),
          withTiming(0.93, { duration: 350, easing: ease }),
          withTiming(1.06, { duration: 250, easing: ease }),
          withSpring(1, { damping: 12, stiffness: 200 }),
        );
      },
      // 4. Happy shake
      () => {
        rotateZ.value = withSequence(
          withTiming(5, { duration: 35 }), withTiming(-5, { duration: 35 }),
          withTiming(5, { duration: 35 }), withTiming(-5, { duration: 35 }),
          withTiming(4, { duration: 35 }), withTiming(-4, { duration: 35 }),
          withTiming(3, { duration: 35 }), withTiming(-3, { duration: 35 }),
          withTiming(0, { duration: 50 }),
        );
        scaleU.value = withSequence(
          withTiming(1.08, { duration: 140, easing: ease }),
          withSpring(1, { damping: 10, stiffness: 250 }),
        );
      },
      // 5. Look around (head tilt)
      () => {
        rotateZ.value = withSequence(
          withTiming(5, { duration: 300, easing: ease }),
          withTiming(5, { duration: 500 }),
          withTiming(-5, { duration: 400, easing: ease }),
          withTiming(-5, { duration: 500 }),
          withTiming(0, { duration: 300, easing: ease }),
        );
      },
      // 6. Nod
      () => {
        translateY.value = withSequence(
          withTiming(-3, { duration: 130 }),
          withTiming(6, { duration: 130 }),
          withTiming(-2, { duration: 110 }),
          withTiming(5, { duration: 110 }),
          withTiming(0, { duration: 180 }),
        );
        setTimeout(startFloat, 550);
      },
      // 7. Spin
      () => {
        rotateZ.value = withTiming(360, { duration: 600, easing: Easing.out(Easing.cubic) });
        setTimeout(() => { rotateZ.value = 0; }, 620);
        scaleU.value = withSequence(
          withTiming(0.9, { duration: 150 }),
          withTiming(1.1, { duration: 300 }),
          withSpring(1, { damping: 10, stiffness: 200 }),
        );
      },
      // 8. Squash & stretch
      () => {
        scaleX.value = withSequence(
          withTiming(1.25, { duration: 120, easing: ease }),
          withTiming(0.85, { duration: 120, easing: ease }),
          withTiming(1.12, { duration: 100, easing: ease }),
          withSpring(1, { damping: 10, stiffness: 250 }),
        );
        scaleY.value = withSequence(
          withTiming(0.8, { duration: 120, easing: ease }),
          withTiming(1.2, { duration: 120, easing: ease }),
          withTiming(0.92, { duration: 100, easing: ease }),
          withSpring(1, { damping: 10, stiffness: 250 }),
        );
      },
      // 9. Float drift
      () => {
        translateX.value = withSequence(
          withTiming(12, { duration: 800, easing: ease }),
          withTiming(-12, { duration: 1200, easing: ease }),
          withTiming(6, { duration: 600, easing: ease }),
          withTiming(0, { duration: 400, easing: ease }),
        );
      },
      // 10. Peek-a-boo
      () => {
        scaleU.value = withSequence(
          withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) }),
          withTiming(0, { duration: 200 }),
          withSpring(1.15, { damping: 6, stiffness: 300 }),
          withSpring(1, { damping: 10, stiffness: 200 }),
        );
      },
      // 11. Jelly wobble
      () => {
        scaleX.value = withSequence(
          withTiming(1.15, { duration: 100 }), withTiming(0.9, { duration: 100 }),
          withTiming(1.1, { duration: 90 }), withTiming(0.93, { duration: 90 }),
          withTiming(1.05, { duration: 80 }), withSpring(1, { damping: 12, stiffness: 250 }),
        );
        scaleY.value = withSequence(
          withTiming(0.88, { duration: 100 }), withTiming(1.12, { duration: 100 }),
          withTiming(0.92, { duration: 90 }), withTiming(1.08, { duration: 90 }),
          withTiming(0.96, { duration: 80 }), withSpring(1, { damping: 12, stiffness: 250 }),
        );
      },
      // 12. Sneeze
      () => {
        scaleU.value = withSequence(
          withTiming(1.08, { duration: 400, easing: ease }),
          withTiming(0.88, { duration: 60 }),
          withSpring(1, { damping: 8, stiffness: 300 }),
        );
        translateY.value = withSequence(
          withTiming(2, { duration: 400, easing: ease }),
          withSpring(-16, { damping: 6, stiffness: 400 }),
          withSpring(0, { damping: 10, stiffness: 250 }),
        );
        rotateZ.value = withDelay(400, withSequence(
          withTiming(8, { duration: 60 }),
          withTiming(-3, { duration: 100 }),
          withTiming(0, { duration: 150, easing: ease }),
        ));
        setTimeout(startFloat, 800);
      },
      // 13. Sleepy drift
      () => {
        const side = Math.random() < 0.5 ? 1 : -1;
        rotateZ.value = withSequence(
          withTiming(12 * side, { duration: 1000, easing: ease }),
          withTiming(12 * side, { duration: 600 }),
          withTiming(0, { duration: 800, easing: ease }),
        );
      },
      // 14. Excited jump
      () => {
        translateY.value = withSequence(
          withTiming(8, { duration: 150 }),
          withSpring(-35, { damping: 4, stiffness: 500 }),
          withSpring(3, { damping: 6, stiffness: 300 }),
          withSpring(-8, { damping: 8, stiffness: 350 }),
          withSpring(0, { damping: 10, stiffness: 250 }),
        );
        scaleY.value = withSequence(
          withTiming(0.85, { duration: 150 }),
          withTiming(1.2, { duration: 100 }),
          withSpring(1, { damping: 10, stiffness: 200 }),
        );
        scaleX.value = withSequence(
          withTiming(1.15, { duration: 150 }),
          withTiming(0.9, { duration: 100 }),
          withSpring(1, { damping: 10, stiffness: 200 }),
        );
        setTimeout(startFloat, 900);
      },
      // 15. Wave
      () => {
        rotateZ.value = withSequence(
          withTiming(-12, { duration: 200, easing: ease }),
          withTiming(8, { duration: 200, easing: ease }),
          withTiming(-10, { duration: 180, easing: ease }),
          withTiming(6, { duration: 180, easing: ease }),
          withTiming(-4, { duration: 150, easing: ease }),
          withTiming(0, { duration: 150, easing: ease }),
        );
        translateX.value = withSequence(
          withTiming(-5, { duration: 200, easing: ease }),
          withTiming(4, { duration: 200, easing: ease }),
          withTiming(-3, { duration: 180, easing: ease }),
          withTiming(2, { duration: 180, easing: ease }),
          withTiming(0, { duration: 150, easing: ease }),
        );
      },
    ];

    let lastIdx = -1;
    const runCycle = () => {
      let idx = Math.floor(Math.random() * bodyAnims.length);
      while (idx === lastIdx && bodyAnims.length > 1) {
        idx = Math.floor(Math.random() * bodyAnims.length);
      }
      lastIdx = idx;
      bodyAnims[idx]();
      cycleTimer.current = setTimeout(runCycle, 2000 + Math.random() * 2000);
    };
    cycleTimer.current = setTimeout(runCycle, 1000);

    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
    };
  }, []);

  // ── Animated styles ──
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotateZ.value}deg` },
      { scaleX: scaleX.value * scaleU.value },
      { scaleY: scaleY.value * scaleU.value },
    ],
  }));

  const eyeProps = useAnimatedProps(() => ({
    opacity: eyeOpacity.value,
  }));
  const leftCheekProps = useAnimatedProps(() => ({
    opacity: cheekOpacity.value,
  }));
  const rightCheekProps = useAnimatedProps(() => ({
    opacity: cheekOpacity.value,
  }));

  return (
    <Animated.View style={[{ width: svgW, height: svgH }, containerStyle]}>
      <Svg width={svgW} height={svgH} viewBox="0 0 320 240">
        <Defs>
          <LinearGradient id="cloudGrad" x1="160" y1="18" x2="160" y2="140" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#C7D2FE" />
            <Stop offset="0.5" stopColor="#A5B4FC" />
            <Stop offset="1" stopColor="#818CF8" />
          </LinearGradient>
        </Defs>

        {/* Glow aura */}
        <Circle cx={160} cy={90} r={100} fill="#A5B4FC" opacity={0.15} />

        {/* Cloud body */}
        <Path
          d="M130 140 C95 140 70 120 70 100 C70 82 82 68 98 65 C96 50 108 35 125 35 C132 25 145 18 160 18 C175 18 185 25 195 35 C212 35 224 50 222 65 C238 68 250 82 250 100 C250 120 225 140 190 140 Z"
          fill="url(#cloudGrad)"
        />

        {/* Glass highlight */}
        <Ellipse cx={160} cy={52} rx={40} ry={22} fill="white" opacity={0.2} />

        {/* Eyes — animated opacity for blink */}
        <AnimatedG animatedProps={eyeProps}>
          {/* Left eye */}
          <Path
            d="M142 82 Q150 74 158 82"
            stroke="#4338CA"
            strokeWidth={2.8}
            strokeLinecap="round"
            fill="none"
          />
          {/* Right eye */}
          <Path
            d="M162 82 Q170 74 178 82"
            stroke="#4338CA"
            strokeWidth={2.8}
            strokeLinecap="round"
            fill="none"
          />
        </AnimatedG>

        {/* Cheeks */}
        <AnimatedEllipse cx={138} cy={95} rx={8} ry={4.5} fill="rgba(196,181,253,1)" animatedProps={leftCheekProps} />
        <AnimatedEllipse cx={182} cy={95} rx={8} ry={4.5} fill="rgba(196,181,253,1)" animatedProps={rightCheekProps} />

        {/* Smile */}
        <Path
          d="M150 105 Q160 113 170 105"
          stroke="#4338CA"
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />

        {/* Rain dots */}
        {!compact && (
          <>
            <Circle cx={130} cy={165} r={2.5} fill="#A5B4FC" opacity={0.35} />
            <Circle cx={160} cy={170} r={2.5} fill="#A5B4FC" opacity={0.3} />
            <Circle cx={190} cy={165} r={2.5} fill="#A5B4FC" opacity={0.35} />
            <Circle cx={145} cy={180} r={2.5} fill="#A5B4FC" opacity={0.25} />
            <Circle cx={175} cy={180} r={2.5} fill="#A5B4FC" opacity={0.25} />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}
