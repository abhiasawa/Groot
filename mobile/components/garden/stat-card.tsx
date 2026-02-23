import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { Card, CardContent } from "../ui/card";
import type { LucideIcon } from "lucide-react-native";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Optional trend percentage (positive = up, negative = down). */
  trend?: number;
}

/* ------------------------------------------------------------------ */
/*  StatCard                                                           */
/* ------------------------------------------------------------------ */

export function StatCard({ icon: Icon, label, value, trend }: StatCardProps) {
  const { colors } = useTheme();

  const trendColor =
    trend !== undefined
      ? trend >= 0
        ? colors.moodGood
        : colors.destructive
      : undefined;

  const trendLabel =
    trend !== undefined
      ? `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`
      : null;

  return (
    <Card>
      <CardContent style={styles.content}>
        <View style={styles.header}>
          <Icon size={18} color={colors.mutedForeground} />
          {trendLabel ? (
            <Text style={[styles.trend, { color: trendColor }]}>
              {trendLabel}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.value, { color: colors.foreground }]}>
          {value}
        </Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  content: {
    gap: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: typography.xl.fontSize,
    lineHeight: typography.xl.lineHeight,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
  },
  trend: {
    fontFamily: "Inter_500Medium",
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
  },
});
