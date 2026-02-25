import React from "react";
import Svg, { Path, Circle, Ellipse } from "react-native-svg";
import { useTheme } from "../../lib/theme/provider";

interface StreakVineProps {
  /** Number of consecutive days in the streak */
  streakLength: number;
  /** Width of the vine segment */
  width?: number;
  /** Height of the vine segment */
  height?: number;
  /** Whether the streak is currently active or broken */
  active?: boolean;
}

/**
 * Curved SVG vine that connects consecutive check-in days.
 * Longer streaks = thicker vine, broken = wilted gray.
 */
export function StreakVine({
  streakLength,
  width = 40,
  height = 20,
  active = true,
}: StreakVineProps) {
  const { colors } = useTheme();

  // Vine thickness scales with streak length (1-3px range)
  const thickness = Math.min(1 + streakLength * 0.3, 3);
  const vineColor = active ? colors.primary : colors.mutedForeground;
  const leafColor = active ? "#6B8F71" : colors.mutedForeground;
  const opacity = active ? 0.7 : 0.3;

  const midY = height / 2;
  // Gentle S-curve
  const curve = height * 0.25;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Main vine curve */}
      <Path
        d={`M0 ${midY} C${width * 0.3} ${midY - curve} ${width * 0.7} ${midY + curve} ${width} ${midY}`}
        stroke={vineColor}
        strokeWidth={thickness}
        fill="none"
        strokeLinecap="round"
        opacity={opacity}
      />
      {/* Small leaf at midpoint for active streaks >= 3 */}
      {active && streakLength >= 3 && (
        <Ellipse
          cx={width / 2}
          cy={midY - curve * 0.3}
          rx={3}
          ry={1.5}
          fill={leafColor}
          opacity={0.6}
          rotation={-30}
          origin={`${width / 2}, ${midY - curve * 0.3}`}
        />
      )}
      {/* Berry dots for longer streaks >= 7 */}
      {active && streakLength >= 7 && (
        <Circle
          cx={width * 0.3}
          cy={midY - curve * 0.4}
          r={1.5}
          fill={colors.accent}
          opacity={0.5}
        />
      )}
    </Svg>
  );
}
