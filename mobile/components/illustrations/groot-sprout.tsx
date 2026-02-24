import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Path, Ellipse } from "react-native-svg";
import { useTheme } from "../../lib/theme/provider";

interface GrootSproutProps {
  size?: number;
  message?: string;
}

export function GrootSprout({ size = 120, message }: GrootSproutProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {message ? (
        <View style={[styles.bubble, { backgroundColor: colors.card, shadowColor: colors.elevatedShadowColor }]}>
          <Text style={[styles.bubbleText, { color: colors.foreground }]}>{message}</Text>
          <View style={[styles.bubbleTail, { borderTopColor: colors.card }]} />
        </View>
      ) : null}
      <Svg width={size} height={size * 1.1} viewBox="0 0 120 132">
        {/* Ground shadow */}
        <Ellipse cx="60" cy="126" rx="30" ry="6" fill={colors.primary} opacity={0.08} />

        {/* Pot / base */}
        <Path
          d="M40 105 L42 120 Q60 128 78 120 L80 105 Z"
          fill={colors.secondary}
        />
        <Path
          d="M38 100 Q38 108 42 108 L78 108 Q82 108 82 100 Z"
          fill={colors.primary}
          opacity={0.2}
        />

        {/* Stem */}
        <Path
          d="M60 100 Q58 80 60 60"
          stroke={colors.primary}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Left leaf */}
        <Path
          d="M60 78 Q42 68 38 58 Q48 60 60 72"
          fill={colors.primary}
          opacity={0.7}
        />
        {/* Left leaf vein */}
        <Path
          d="M58 76 Q48 68 42 62"
          stroke={colors.primaryForeground}
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity={0.3}
        />

        {/* Right leaf */}
        <Path
          d="M60 70 Q78 58 84 48 Q74 52 60 65"
          fill={colors.primary}
          opacity={0.85}
        />
        {/* Right leaf vein */}
        <Path
          d="M62 68 Q74 58 80 52"
          stroke={colors.primaryForeground}
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity={0.3}
        />

        {/* Top leaf / sprout */}
        <Path
          d="M60 60 Q52 40 48 28 Q56 38 60 52 Q64 38 72 28 Q68 40 60 60"
          fill={colors.primary}
        />

        {/* Face — eyes */}
        <Circle cx="52" cy="88" r="2.5" fill={colors.foreground} opacity={0.6} />
        <Circle cx="68" cy="88" r="2.5" fill={colors.foreground} opacity={0.6} />
        {/* Eye highlights */}
        <Circle cx="53" cy="87" r="0.8" fill={colors.card} opacity={0.8} />
        <Circle cx="69" cy="87" r="0.8" fill={colors.card} opacity={0.8} />

        {/* Smile */}
        <Path
          d="M54 94 Q60 98 66 94"
          stroke={colors.foreground}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity={0.5}
        />

        {/* Cheek blush */}
        <Circle cx="47" cy="93" r="3" fill={colors.accent} opacity={0.2} />
        <Circle cx="73" cy="93" r="3" fill={colors.accent} opacity={0.2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: 240,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  bubbleText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  bubbleTail: {
    position: "absolute",
    bottom: -6,
    left: "50%",
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});

/** Returns a time-of-day greeting */
export function getGreeting(displayName?: string): string {
  const hour = new Date().getHours();
  const name = displayName ? `, ${displayName}` : "";

  if (hour < 6) return `Still up${name}? Rest is part of growing.`;
  if (hour < 12) return `Good morning${name}! Let's grow today.`;
  if (hour < 17) return `Good afternoon${name}! How's your day?`;
  if (hour < 21) return `Good evening${name}! Time to reflect.`;
  return `Winding down${name}? You did great today.`;
}
