import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";

interface StreakBarProps {
  name: string;
  streak: number;
  checkedInToday: boolean;
  unit?: string | null;
}

const MAX_DISPLAY_STREAK = 30;

/**
 * Horizontal progress bar for a habit streak.
 * Width proportional to streak (capped at 30 days for display).
 */
export function StreakBar({ name, streak, checkedInToday, unit }: StreakBarProps) {
  const { colors } = useTheme();
  const progress = Math.min(streak / MAX_DISPLAY_STREAK, 1);

  return (
    <View style={styles.row}>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.max(progress * 100, 8)}%`,
              backgroundColor: checkedInToday ? colors.primary : colors.muted,
            },
          ]}
        />
      </View>
      <View style={styles.labelWrap}>
        <Text
          style={[styles.name, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text style={[styles.days, { color: colors.mutedForeground }]}>
          {streak}d
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  barContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 100,
  },
  name: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
    flexShrink: 1,
  },
  days: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
  },
});
