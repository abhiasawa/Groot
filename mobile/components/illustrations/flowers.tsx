import React from "react";
import Svg, { Circle, Ellipse, Path, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

// ── Types ────────────────────────────────────

interface FlowerProps {
  /** small | medium | large */
  size?: "small" | "medium" | "large";
  /** Override color */
  color?: string;
  /** Enable subtle sway animation */
  animated?: boolean;
}

const SIZE_MAP = { small: 28, medium: 38, large: 50 } as const;

// ── Sway wrapper ─────────────────────────────

function SwayWrapper({
  children,
  animated,
  size,
}: {
  children: React.ReactNode;
  animated: boolean;
  size: number;
}) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;
    rotation.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-2, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [animated, rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!animated) return <>{children}</>;

  return (
    <Animated.View style={[{ width: size, height: size }, animStyle]}>
      {children}
    </Animated.View>
  );
}

// ── Score 5: Full Bloom (5-6 petals, teal) ──

export function FlowerGreat({
  size = "medium",
  color = "#2A9D8F",
  animated = true,
}: FlowerProps) {
  const s = SIZE_MAP[size];
  const cx = s / 2;
  const cy = s / 2;
  const petalR = s * 0.22;
  const petalDist = s * 0.24;

  return (
    <SwayWrapper animated={animated} size={s}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {/* Stem */}
        <Path
          d={`M${cx} ${cy + petalR * 0.5} L${cx} ${s}`}
          stroke="#6B8F71"
          strokeWidth={s * 0.04}
          strokeLinecap="round"
        />
        {/* 6 petals arranged in a circle */}
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const px = cx + Math.cos(rad) * petalDist;
          const py = cy + Math.sin(rad) * petalDist;
          return (
            <Ellipse
              key={angle}
              cx={px}
              cy={py}
              rx={petalR}
              ry={petalR * 0.65}
              fill={color}
              opacity={0.85}
              rotation={angle}
              origin={`${px}, ${py}`}
            />
          );
        })}
        {/* Center */}
        <Circle cx={cx} cy={cy} r={s * 0.1} fill="#E9C46A" />
      </Svg>
    </SwayWrapper>
  );
}

// ── Score 4: Open Flower (4-5 petals, sage) ──

export function FlowerGood({
  size = "medium",
  color = "#6B8F71",
  animated = true,
}: FlowerProps) {
  const s = SIZE_MAP[size];
  const cx = s / 2;
  const cy = s / 2;
  const petalR = s * 0.2;
  const petalDist = s * 0.2;

  return (
    <SwayWrapper animated={animated} size={s}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {/* Stem */}
        <Path
          d={`M${cx} ${cy + petalR * 0.5} L${cx} ${s}`}
          stroke="#6B8F71"
          strokeWidth={s * 0.04}
          strokeLinecap="round"
        />
        {/* 5 petals */}
        {[0, 72, 144, 216, 288].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const px = cx + Math.cos(rad) * petalDist;
          const py = cy + Math.sin(rad) * petalDist;
          return (
            <Ellipse
              key={angle}
              cx={px}
              cy={py}
              rx={petalR}
              ry={petalR * 0.6}
              fill={color}
              opacity={0.8}
              rotation={angle}
              origin={`${px}, ${py}`}
            />
          );
        })}
        {/* Center */}
        <Circle cx={cx} cy={cy} r={s * 0.09} fill="#E9C46A" opacity={0.9} />
      </Svg>
    </SwayWrapper>
  );
}

// ── Score 3: Half-Open Bud (gold) ────────────

export function FlowerOkay({
  size = "medium",
  color = "#E9C46A",
  animated = true,
}: FlowerProps) {
  const s = SIZE_MAP[size];
  const cx = s / 2;
  const cy = s * 0.45;

  return (
    <SwayWrapper animated={animated} size={s}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {/* Stem */}
        <Path
          d={`M${cx} ${cy + s * 0.1} L${cx} ${s}`}
          stroke="#6B8F71"
          strokeWidth={s * 0.04}
          strokeLinecap="round"
        />
        {/* Small leaf on stem */}
        <Path
          d={`M${cx} ${s * 0.7} Q${cx + s * 0.15} ${s * 0.62} ${cx + s * 0.08} ${s * 0.55}`}
          stroke="#6B8F71"
          strokeWidth={s * 0.025}
          fill="none"
          strokeLinecap="round"
        />
        {/* Half-open petals (3 visible, partially closed) */}
        <Ellipse cx={cx - s * 0.1} cy={cy} rx={s * 0.12} ry={s * 0.18} fill={color} opacity={0.75} rotation={-15} origin={`${cx - s * 0.1}, ${cy}`} />
        <Ellipse cx={cx} cy={cy - s * 0.05} rx={s * 0.1} ry={s * 0.17} fill={color} opacity={0.85} />
        <Ellipse cx={cx + s * 0.1} cy={cy} rx={s * 0.12} ry={s * 0.18} fill={color} opacity={0.75} rotation={15} origin={`${cx + s * 0.1}, ${cy}`} />
      </Svg>
    </SwayWrapper>
  );
}

// ── Score 2: Drooping Flower (sienna) ────────

export function FlowerLow({
  size = "medium",
  color = "#E76F51",
  animated = true,
}: FlowerProps) {
  const s = SIZE_MAP[size];
  const cx = s / 2;

  return (
    <SwayWrapper animated={animated} size={s}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {/* Curved drooping stem */}
        <Path
          d={`M${cx} ${s * 0.9} Q${cx} ${s * 0.5} ${cx - s * 0.15} ${s * 0.35}`}
          stroke="#8B7355"
          strokeWidth={s * 0.04}
          fill="none"
          strokeLinecap="round"
        />
        {/* Drooping petals (tilted down-left) */}
        <G rotation={-30} origin={`${cx - s * 0.15}, ${s * 0.35}`}>
          <Ellipse cx={cx - s * 0.25} cy={s * 0.35} rx={s * 0.1} ry={s * 0.14} fill={color} opacity={0.65} />
          <Ellipse cx={cx - s * 0.15} cy={s * 0.25} rx={s * 0.09} ry={s * 0.13} fill={color} opacity={0.7} />
          <Ellipse cx={cx - s * 0.05} cy={s * 0.32} rx={s * 0.1} ry={s * 0.14} fill={color} opacity={0.65} />
        </G>
        {/* Center dot */}
        <Circle cx={cx - s * 0.15} cy={s * 0.33} r={s * 0.05} fill="#8B7355" opacity={0.6} />
      </Svg>
    </SwayWrapper>
  );
}

// ── Score 1: Wilted (crimson) ────────────────

export function FlowerBad({
  size = "medium",
  color = "#C1484B",
  animated = true,
}: FlowerProps) {
  const s = SIZE_MAP[size];
  const cx = s / 2;

  return (
    <SwayWrapper animated={animated} size={s}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {/* Wilted stem — severely curved */}
        <Path
          d={`M${cx + s * 0.05} ${s * 0.95} Q${cx + s * 0.1} ${s * 0.55} ${cx - s * 0.2} ${s * 0.4}`}
          stroke="#8B7355"
          strokeWidth={s * 0.035}
          fill="none"
          strokeLinecap="round"
          opacity={0.7}
        />
        {/* Fallen petals */}
        <Ellipse cx={cx - s * 0.22} cy={s * 0.42} rx={s * 0.08} ry={s * 0.11} fill={color} opacity={0.5} rotation={-40} origin={`${cx - s * 0.22}, ${s * 0.42}`} />
        <Ellipse cx={cx - s * 0.28} cy={s * 0.48} rx={s * 0.07} ry={s * 0.1} fill={color} opacity={0.4} rotation={-60} origin={`${cx - s * 0.28}, ${s * 0.48}`} />
        {/* A petal on the ground */}
        <Ellipse cx={cx + s * 0.12} cy={s * 0.88} rx={s * 0.08} ry={s * 0.04} fill={color} opacity={0.35} rotation={10} origin={`${cx + s * 0.12}, ${s * 0.88}`} />
      </Svg>
    </SwayWrapper>
  );
}

// ── Empty day: Seed dot ──────────────────────

export function FlowerEmpty({ size = "medium", color = "#D5D3CB" }: Omit<FlowerProps, "animated">) {
  const s = SIZE_MAP[size];
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Circle cx={s / 2} cy={s * 0.65} r={s * 0.1} fill={color} opacity={0.5} />
      {/* Tiny soil line */}
      <Path
        d={`M${s * 0.3} ${s * 0.8} L${s * 0.7} ${s * 0.8}`}
        stroke={color}
        strokeWidth={s * 0.03}
        strokeLinecap="round"
        opacity={0.3}
      />
    </Svg>
  );
}

// ── Render flower by score ───────────────────

export function MoodFlower({
  score,
  size = "medium",
  color,
  animated = true,
}: {
  score: number | null;
  size?: "small" | "medium" | "large";
  color?: string;
  animated?: boolean;
}) {
  if (score === null || score === undefined) return <FlowerEmpty size={size} />;
  switch (score) {
    case 5: return <FlowerGreat size={size} color={color} animated={animated} />;
    case 4: return <FlowerGood size={size} color={color} animated={animated} />;
    case 3: return <FlowerOkay size={size} color={color} animated={animated} />;
    case 2: return <FlowerLow size={size} color={color} animated={animated} />;
    case 1: return <FlowerBad size={size} color={color} animated={animated} />;
    default: return <FlowerEmpty size={size} />;
  }
}
