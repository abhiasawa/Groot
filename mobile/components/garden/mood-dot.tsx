import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../../lib/theme/provider";
import { getMoodColor, getMoodColorFromName } from "../../constants/mood";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MoodDotProps {
  /** Numeric score (1-5) or free-text mood name. */
  mood?: string | number;
  /** Dot diameter in dp. Defaults to 8. */
  size?: number;
}

/* ------------------------------------------------------------------ */
/*  MoodDot                                                            */
/* ------------------------------------------------------------------ */

export function MoodDot({ mood, size = 8 }: MoodDotProps) {
  const { colors } = useTheme();

  let dotColor: string;

  if (mood === undefined || mood === null) {
    dotColor = colors.moodNone;
  } else if (typeof mood === "number") {
    dotColor = getMoodColor(mood, colors);
  } else {
    dotColor = getMoodColorFromName(mood, colors);
  }

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: dotColor,
        },
      ]}
      accessibilityLabel={
        mood !== undefined && mood !== null
          ? `Mood: ${String(mood)}`
          : "No mood recorded"
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  dot: {},
});
