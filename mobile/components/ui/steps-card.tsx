import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  AppState,
  Platform,
  Dimensions,
  PermissionsAndroid,
} from "react-native";
import { Pedometer } from "expo-sensors";
import {
  initialize,
  readRecords,
  requestPermission,
  getSdkStatus,
  SdkAvailabilityStatus,
} from "react-native-health-connect";
import { Footprints, MapPin, Flame, Target } from "lucide-react-native";
import Svg, { Rect } from "react-native-svg";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GlassCard } from "./glass-card";

// ── Constants ──

const DEFAULT_GOAL = 10000;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHORT_DAY = ["M", "T", "W", "T", "F", "S", "S"];

// ── Types ──

type DaySteps = { date: string; steps: number; dayLabel: string; isToday: boolean };
type StepsStatus = "loading" | "ready" | "no_health_connect";

// ── Helpers ──

function getStartOfDayISO(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Build array of past 7 days (ending today) */
function buildWeekDays(): { start: Date; end: Date; dayLabel: string; isToday: boolean }[] {
  const now = new Date();
  const days: { start: Date; end: Date; dayLabel: string; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    days.push({
      start,
      end: i === 0 ? now : end,
      dayLabel: DAY_LABELS[start.getDay() === 0 ? 6 : start.getDay() - 1] ?? "",
      isToday: i === 0,
    });
  }
  return days;
}

// ── Mini Week Chart ──

function MiniWeekChart({
  weekData,
  goal,
  colors,
}: {
  weekData: DaySteps[];
  goal: number;
  colors: Record<string, string>;
}) {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 80; // card padding
  const barGap = 8;
  const barWidth = (chartWidth - barGap * 6) / 7;
  const chartHeight = 64;

  // Smart scale: use data max so bars are always proportionally visible
  // Only include goal in scale if any day actually approached it (>30%)
  const maxSteps = useMemo(() => {
    const dataMax = Math.max(...weekData.map((d) => d.steps), 1); // min 1 to avoid /0
    const anyNearGoal = dataMax > goal * 0.3;
    const ceiling = anyNearGoal ? Math.max(dataMax, goal) : dataMax;
    return ceiling * 1.15; // 15% headroom
  }, [weekData, goal]);

  return (
    <View style={cs.chartWrap}>
      <Svg width={chartWidth} height={chartHeight}>
        {weekData.map((day, i) => {
          const ratio = maxSteps > 0 ? day.steps / maxSteps : 0;
          // Min bar height of 4px for any non-zero day so it's always visible
          const barH = day.steps > 0 ? Math.max(ratio * chartHeight, 4) : 0;
          const x = i * (barWidth + barGap);
          const y = chartHeight - barH;
          const metGoal = day.steps >= goal;
          const barColor = day.isToday
            ? colors.primary
            : metGoal
              ? colors.moodGood
              : `${colors.primary}55`;

          return (
            <Rect
              key={day.date}
              x={x}
              y={y}
              width={barWidth}
              height={barH || 2}
              rx={4}
              ry={4}
              fill={barColor}
              opacity={barH === 0 ? 0.15 : 1}
            />
          );
        })}
      </Svg>

      {/* Day labels */}
      <View style={[cs.dayRow, { width: chartWidth }]}>
        {weekData.map((day, i) => (
          <Text
            key={day.date}
            style={[
              cs.dayText,
              {
                width: barWidth + (i < 6 ? barGap : 0),
                color: day.isToday ? colors.primary : colors.mutedForeground,
                fontFamily: day.isToday ? "Manrope_700Bold" : "Manrope_400Regular",
              },
            ]}
          >
            {day.isToday ? "Today" : SHORT_DAY[DAY_LABELS.indexOf(day.dayLabel)] ?? ""}
          </Text>
        ))}
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  chartWrap: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.12)",
  },
  dayRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  dayText: {
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 0.3,
  },
});

// ── Main Component ──

export function StepsCard({ goal = DEFAULT_GOAL }: { goal?: number }) {
  const { colors } = useTheme();
  const [steps, setSteps] = useState(0);
  const [liveSteps, setLiveSteps] = useState(0);
  const [weekData, setWeekData] = useState<DaySteps[]>([]);
  const [status, setStatus] = useState<StepsStatus>("loading");
  const baselineRef = useRef(0);

  // ── Read today from Health Connect ──
  const readHealthConnectToday = useCallback(async (): Promise<number> => {
    try {
      const sdkStatus = await getSdkStatus();
      if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) return 0;

      const ok = await initialize();
      if (!ok) return 0;

      // Request Health Connect permission for Steps read access
      await requestPermission([{ accessType: "read", recordType: "Steps" }]);

      const startTime = getStartOfDayISO();
      const endTime = new Date().toISOString();

      const { records } = await readRecords("Steps", {
        timeRangeFilter: { operator: "between", startTime, endTime },
      });

      let total = 0;
      for (const record of records) {
        total += record.count;
      }
      return total;
    } catch {
      return 0;
    }
  }, []);

  // ── Read past 7 days from Health Connect ──
  const readWeekHistory = useCallback(async () => {
    try {
      const sdkStatus = await getSdkStatus();
      if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) return;
      const ok = await initialize();
      if (!ok) return;

      const days = buildWeekDays();
      const results: DaySteps[] = [];

      for (const day of days) {
        try {
          const { records } = await readRecords("Steps", {
            timeRangeFilter: {
              operator: "between",
              startTime: day.start.toISOString(),
              endTime: day.end.toISOString(),
            },
          });
          let total = 0;
          for (const record of records) {
            total += record.count;
          }
          results.push({
            date: day.start.toISOString().slice(0, 10),
            steps: total,
            dayLabel: day.dayLabel,
            isToday: day.isToday,
          });
        } catch {
          results.push({
            date: day.start.toISOString().slice(0, 10),
            steps: 0,
            dayLabel: day.dayLabel,
            isToday: day.isToday,
          });
        }
      }

      setWeekData(results);
    } catch {
      // Silently fail
    }
  }, []);

  // ── Main load ──
  const loadSteps = useCallback(async () => {
    if (Platform.OS !== "android") {
      setStatus("no_health_connect");
      return;
    }

    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
      );
      if (!granted) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
          {
            title: "Step Tracking",
            message: "The Garden needs access to your activity data to count steps.",
            buttonPositive: "Allow",
            buttonNegative: "Deny",
          },
        );
      }
    } catch {
      // Permission request failed, continue anyway
    }

    const hcSteps = await readHealthConnectToday();
    baselineRef.current = hcSteps;
    setSteps(hcSteps);
    setStatus("ready");

    readWeekHistory();
  }, [readHealthConnectToday, readWeekHistory]);

  // Check on mount + when app returns to foreground
  useEffect(() => {
    loadSteps();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") loadSteps();
    });

    return () => sub.remove();
  }, [loadSteps]);

  // Subscribe to live pedometer
  useEffect(() => {
    if (Platform.OS !== "android") return;

    let subscription: { remove: () => void } | null = null;

    Pedometer.isAvailableAsync().then((available) => {
      if (!available) return;
      subscription = Pedometer.watchStepCount((result) => {
        setLiveSteps(result.steps);
      });
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Update displayed steps when live count changes
  useEffect(() => {
    if (status === "ready") {
      setSteps(baselineRef.current + liveSteps);
    }
  }, [liveSteps, status]);

  // ── Derived values ──
  const progress = goal > 0 ? Math.min(steps / goal, 1) : 0;
  const pct = Math.round(progress * 100);
  const calories = Math.round(steps * 0.04);
  const distKm = (steps * 0.0008).toFixed(1);

  // ── No Health Connect ──
  if (status === "no_health_connect") {
    return (
      <GlassCard delay={50} padding={20}>
        <View style={s.headerRow}>
          <View style={s.iconWrap}>
            <Footprints size={16} color={colors.mutedForeground} strokeWidth={1.8} />
          </View>
          <Text style={[s.headerLabel, { color: colors.mutedForeground }]}>Steps</Text>
        </View>
        <Text style={[s.unavailableText, { color: colors.mutedForeground }]}>
          Step tracking unavailable on this device.
        </Text>
      </GlassCard>
    );
  }

  // ── Loading ──
  if (status === "loading") {
    return (
      <GlassCard delay={50} padding={20}>
        <View style={s.headerRow}>
          <View style={[s.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Footprints size={16} color={colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={[s.headerLabel, { color: colors.foreground }]}>Steps</Text>
        </View>
        <Text style={[s.heroCount, { color: colors.mutedForeground }]}>—</Text>
        <View style={[s.progressTrack, { backgroundColor: colors.secondary }]}>
          <View style={[s.progressFill, { width: "0%", backgroundColor: colors.secondary }]} />
        </View>
      </GlassCard>
    );
  }

  // ── Ready ──
  const goalReached = steps >= goal;
  const accentColor = goalReached ? colors.moodGood : colors.primary;

  return (
    <GlassCard delay={50} padding={20}>
      {/* Header: icon + label + percentage */}
      <View style={s.headerRow}>
        <View style={[s.iconWrap, { backgroundColor: `${accentColor}15` }]}>
          <Footprints size={16} color={accentColor} strokeWidth={1.8} />
        </View>
        <Text style={[s.headerLabel, { color: colors.foreground }]}>Steps</Text>
        <View style={{ flex: 1 }} />
        <Text style={[s.pctLabel, { color: accentColor }]}>{pct}%</Text>
      </View>

      {/* Hero step count */}
      <Text style={[s.heroCount, { color: colors.foreground }]}>
        {formatNumber(steps)}
      </Text>

      {/* Progress bar */}
      <View style={[s.progressTrack, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            s.progressFill,
            {
              width: `${pct}%`,
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>

      {/* Goal label */}
      <Text style={[s.goalText, { color: colors.mutedForeground }]}>
        {goalReached ? "Goal reached!" : `${formatNumber(Math.max(goal - steps, 0))} to go`}
        {"  ·  "}
        <Text style={{ color: colors.mutedForeground }}>
          Goal {formatNumber(goal)}
        </Text>
      </Text>

      {/* Stat pills */}
      <View style={s.statsRow}>
        <View style={[s.statPill, { backgroundColor: `${colors.accent}12` }]}>
          <Flame size={13} color={colors.accent} strokeWidth={2} />
          <Text style={[s.statValue, { color: colors.foreground }]}>{calories}</Text>
          <Text style={[s.statUnit, { color: colors.mutedForeground }]}>cal</Text>
        </View>
        <View style={[s.statPill, { backgroundColor: `${colors.chart3}12` }]}>
          <MapPin size={13} color={colors.chart3} strokeWidth={2} />
          <Text style={[s.statValue, { color: colors.foreground }]}>{distKm}</Text>
          <Text style={[s.statUnit, { color: colors.mutedForeground }]}>km</Text>
        </View>
        <View style={[s.statPill, { backgroundColor: `${colors.primary}12` }]}>
          <Target size={13} color={colors.primary} strokeWidth={2} />
          <Text style={[s.statValue, { color: colors.foreground }]}>{formatNumber(goal)}</Text>
          <Text style={[s.statUnit, { color: colors.mutedForeground }]}>goal</Text>
        </View>
      </View>

      {/* Weekly mini chart */}
      {weekData.length === 7 && (
        <MiniWeekChart weekData={weekData} goal={goal} colors={colors} />
      )}
    </GlassCard>
  );
}

// ── Styles ──

const s = StyleSheet.create({
  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  headerLabel: {
    fontFamily: "Sora_600SemiBold",
    ...typography.sm,
  },
  pctLabel: {
    fontFamily: "Sora_700Bold",
    ...typography.sm,
  },

  // Hero count
  heroCount: {
    fontFamily: "Sora_700Bold",
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1,
    marginBottom: 10,
  },

  // Progress bar
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Goal text
  goalText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  statValue: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
  },
  statUnit: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
  },

  // Unavailable
  unavailableText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    marginTop: 4,
  },
});
