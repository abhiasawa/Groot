import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

interface MoodFaceProps {
  size?: number;
  color?: string;
}

/** Score 5: Big happy grin */
export function FaceExcellent({ size = 40, color = "#5BAE7C" }: MoodFaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="19" fill={color} opacity={0.15} />
      <Circle cx="20" cy="20" r="16" fill={color} opacity={0.25} />
      {/* Eyes — happy arcs */}
      <Path d="M12 16 Q14 13 16 16" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <Path d="M24 16 Q26 13 28 16" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Big smile */}
      <Path d="M12 23 Q20 31 28 23" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Score 4: Gentle smile */
export function FaceGood({ size = 40, color = "#7EC8A0" }: MoodFaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="19" fill={color} opacity={0.15} />
      <Circle cx="20" cy="20" r="16" fill={color} opacity={0.25} />
      {/* Eyes — dots */}
      <Circle cx="14" cy="16" r="2" fill={color} />
      <Circle cx="26" cy="16" r="2" fill={color} />
      {/* Gentle smile */}
      <Path d="M13 23 Q20 28 27 23" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Score 3: Neutral flat mouth */
export function FaceOkay({ size = 40, color = "#F0C76E" }: MoodFaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="19" fill={color} opacity={0.15} />
      <Circle cx="20" cy="20" r="16" fill={color} opacity={0.25} />
      {/* Eyes — dots */}
      <Circle cx="14" cy="16" r="2" fill={color} />
      <Circle cx="26" cy="16" r="2" fill={color} />
      {/* Flat mouth */}
      <Path d="M14 24 L26 24" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/** Score 2: Slightly sad */
export function FaceBad({ size = 40, color = "#E8945C" }: MoodFaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="19" fill={color} opacity={0.15} />
      <Circle cx="20" cy="20" r="16" fill={color} opacity={0.25} />
      {/* Eyes — dots */}
      <Circle cx="14" cy="16" r="2" fill={color} />
      <Circle cx="26" cy="16" r="2" fill={color} />
      {/* Slight frown */}
      <Path d="M14 26 Q20 22 26 26" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Score 1: Frowning with downturned eyes */
export function FaceTerrible({ size = 40, color = "#D47B7B" }: MoodFaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="19" fill={color} opacity={0.15} />
      <Circle cx="20" cy="20" r="16" fill={color} opacity={0.25} />
      {/* Eyes — sad downward arcs */}
      <Path d="M12 17 Q14 19 16 17" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <Path d="M24 17 Q26 19 28 17" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Deep frown */}
      <Path d="M13 27 Q20 21 27 27" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Render the correct face for a mood score (1-5) */
export function MoodFace({ score, size, color }: { score: number; size?: number; color?: string }) {
  switch (score) {
    case 5: return <FaceExcellent size={size} color={color} />;
    case 4: return <FaceGood size={size} color={color} />;
    case 3: return <FaceOkay size={size} color={color} />;
    case 2: return <FaceBad size={size} color={color} />;
    case 1: return <FaceTerrible size={size} color={color} />;
    default: return <FaceOkay size={size} color={color} />;
  }
}
