import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, AppState, Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import { Footprints, TrendingUp, Flame } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GlassCard } from "./glass-card";
import { SectionHeader } from "./section-header";

// ── Constants ──

const DEFAULT_GOAL = 10000;
const RING_SIZE = 80;
const RING_STROKE = 5;

// ── Helpers ──

function getStartOfDay(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function formatSteps(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return String(n);
}

// ── Progress Ring ──

function StepsRing({
  progress,
  color,
  bgColor,
}: {
  progress: number;
  color: string;
  bgColor: string;
}) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(progress, 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={radius}
        stroke={bgColor}
        strokeWidth={RING_STROKE}
        fill="none"
      />
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={radius}
        stroke={color}
        strokeWidth={RING_STROKE}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
      />
    </Svg>
  );
}

// ── Main Component ──

export function StepsCard({ goal = DEFAULT_GOAL }: { goal?: number }) {
  const { colors } = useTheme();
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);

  const fetchSteps = useCallback(async () => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      setAvailable(isAvailable);

      if (!isAvailable) return;

      const start = getStartOfDay();
      const end = new Date();
      const result = await Pedometer.getStepCountAsync(start, end);
      setSteps(result.steps);
    } catch {
      setAvailable(false);
    }
  }, []);

  // Fetch on mount + when app returns to foreground
  useEffect(() => {
    fetchSteps();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchSteps();
    });

    return () => sub.remove();
  }, [fetchSteps]);

  // Live pedometer subscription (updates in real-time when available)
  useEffect(() => {
    if (available !== true) return;

    const sub = Pedometer.watchStepCount((result) => {
      // watchStepCount gives steps since subscription started
      // We need to add to the base count, so refetch instead
      fetchSteps();
    });

    return () => sub.remove();
  }, [available, fetchSteps]);

  // Don't render if pedometer is unavailable
  if (available === false) return null;
  // Still loading
  if (available === null) return null;

  const progress = steps / goal;
  const pct = Math.min(Math.round(progress * 100), 100);
  const remaining = Math.max(goal - steps, 0);
  const ringColor = progress >= 1 ? colors.moodGood : colors.primary;

  // Rough calorie estimate: ~0.04 cal per step
  const calories = Math.round(steps * 0.04);
  // Rough distance: ~0.0008 km per step (avg stride)
  const distKm = (steps * 0.0008).toFixed(1);

  return (
    <GlassCard delay={50} padding={18}>
      <SectionHeader title="Steps" />

      <View style={s.row}>
        {/* Ring */}
        <View style={s.ringWrap}>
          <StepsRing
            progress={progress}
            color={ringColor}
            bgColor={colors.secondary}
          />
          <View style={s.ringCenter}>
            <Footprints size={20} color={ringColor} strokeWidth={1.8} />
          </View>
        </View>

        {/* Stats */}
        <View style={s.stats}>
          <Text style={[s.stepCount, { color: colors.foreground }]}>
            {steps.toLocaleString()}
          </Text>
          <Text style={[s.goalLabel, { color: colors.mutedForeground }]}>
            / {formatSteps(goal)} goal
          </Text>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Flame size={12} color={colors.accent} strokeWidth={2} />
              <Text style={[s.metaText, { color: colors.mutedForeground }]}>
                {calories} cal
              </Text>
            </View>
            <View style={s.metaItem}>
              <TrendingUp size={12} color={colors.chart3} strokeWidth={2} />
              <Text style={[s.metaText, { color: colors.mutedForeground }]}>
                {distKm} km
              </Text>
            </View>
          </View>
        </View>

        {/* Percentage badge */}
        <View style={[s.pctBadge, { backgroundColor: `${ringColor}18` }]}>
          <Text style={[s.pctText, { color: ringColor }]}>{pct}%</Text>
        </View>
      </View>

      {/* Progress message */}
      {progress >= 1 ? (
        <Text style={[s.progressMsg, { color: colors.moodGood }]}>
          🎉 Goal reached! Keep it up!
        </Text>
      ) : remaining > 0 ? (
        <Text style={[s.progressMsg, { color: colors.mutedForeground }]}>
          {formatSteps(remaining)} steps to go
        </Text>
      ) : null}
    </GlassCard>
  );
}

// ── Styles ──

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  ringCenter: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  stats: {
    flex: 1,
  },
  stepCount: {
    fontFamily: "Sora_700Bold",
    fontSize: 26,
    lineHeight: 30,
  },
  goalLabel: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pctText: {
    fontFamily: "Sora_700Bold",
    ...typography.sm,
  },
  progressMsg: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    marginTop: 12,
    textAlign: "center",
  },
});
