import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { X } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { MOOD_LABELS, getMoodColor } from "../../constants/mood";
import { MoodFlower } from "../illustrations/flowers";
import { StreakVine } from "./streak-vine";
import type { DailyMood } from "../../../shared/types/api";

// ── Types ────────────────────────────────────

interface MoodMeadowProps {
  dailyMoods: DailyMood[];
  year: number;
}

interface DayCell {
  date: string;
  score: number | null;
  mood: string | null;
  isToday: boolean;
  streakLength: number;
  showVine: boolean; // vine connecting to previous day
}

// ── Constants ────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const DAYS_PER_ROW = 7;
const CELL_PADDING = 4;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 40 - CELL_PADDING * (DAYS_PER_ROW - 1)) / DAYS_PER_ROW);

// ── Helpers ──────────────────────────────────

function buildMeadowGrid(year: number, dailyMoods: DailyMood[]): DayCell[] {
  const moodMap = new Map<string, DailyMood>();
  for (const dm of dailyMoods) {
    moodMap.set(dm.date, dm);
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const cells: DayCell[] = [];

  let streakCount = 0;
  const current = new Date(start);

  while (current <= end && current <= today) {
    const dateStr = current.toISOString().slice(0, 10);
    const entry = moodMap.get(dateStr);
    const hasEntry = !!entry;

    if (hasEntry) {
      streakCount++;
    } else {
      streakCount = 0;
    }

    const prevDateStr = new Date(current.getTime() - 86400000)
      .toISOString()
      .slice(0, 10);
    const prevHadEntry = moodMap.has(prevDateStr);

    cells.push({
      date: dateStr,
      score: entry?.score ?? null,
      mood: entry?.mood ?? null,
      isToday: dateStr === todayStr,
      streakLength: streakCount,
      showVine: hasEntry && prevHadEntry && current.getDay() !== 0, // don't show vine at start of row
    });

    current.setDate(current.getDate() + 1);
  }

  return cells;
}

function getFlowerSize(mood: string | null): "small" | "medium" | "large" {
  // In future can use message length; for now: score-based
  if (!mood) return "small";
  const len = mood.length;
  if (len > 8) return "large";
  if (len > 4) return "medium";
  return "small";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ── Today Glow Ring ──────────────────────────

function TodayGlow({ size }: { size: number }) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const { colors } = useTheme();

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size + 6,
          height: size + 6,
          borderRadius: (size + 6) / 2,
          borderWidth: 1.5,
          borderColor: colors.primary,
          opacity: 0.4,
        },
        animStyle,
      ]}
    />
  );
}

// ── Day Detail Modal ─────────────────────────

function DayDetailModal({
  day,
  visible,
  onClose,
}: {
  day: DayCell | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();

  if (!day) return null;

  const moodColor = day.score ? getMoodColor(day.score, colors) : colors.mutedForeground;
  const moodLabel = day.score ? (MOOD_LABELS[day.score] ?? "Unknown") : "No entry";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalS.overlay} onPress={onClose}>
        <Pressable
          style={[modalS.card, { backgroundColor: colors.card }]}
          onPress={() => {}}
        >
          <View style={modalS.header}>
            <Text style={[modalS.date, { color: colors.foreground }]}>
              {formatDate(day.date)}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={modalS.flowerWrap}>
            <MoodFlower score={day.score} size="large" animated={false} />
          </View>

          <View style={[modalS.moodRow, { borderColor: colors.border }]}>
            <View style={[modalS.moodDot, { backgroundColor: moodColor }]} />
            <Text style={[modalS.moodLabel, { color: colors.foreground }]}>
              {moodLabel}
            </Text>
            {day.mood && (
              <Text style={[modalS.moodName, { color: colors.mutedForeground }]}>
                {day.mood}
              </Text>
            )}
          </View>

          {day.streakLength > 1 && (
            <Text style={[modalS.streak, { color: colors.primary }]}>
              {day.streakLength}-day streak
            </Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalS = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  card: {
    borderRadius: 20,
    padding: 24,
    width: "80%",
    maxWidth: 320,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  date: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
  flowerWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  moodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  moodLabel: {
    fontFamily: "Sora_600SemiBold",
    ...typography.sm,
  },
  moodName: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
    marginLeft: "auto",
  },
  streak: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
    marginTop: 10,
    textAlign: "center",
  },
});

// ── Week Row ─────────────────────────────────

function WeekRow({ days, onDayPress }: { days: DayCell[]; onDayPress: (day: DayCell) => void }) {
  const { colors } = useTheme();

  // Pad to 7 days if the row is incomplete
  const paddedDays = [...days];
  while (paddedDays.length < DAYS_PER_ROW) {
    paddedDays.push({
      date: "",
      score: null,
      mood: null,
      isToday: false,
      streakLength: 0,
      showVine: false,
    });
  }

  return (
    <View style={rowS.row}>
      {paddedDays.map((day, i) => {
        if (!day.date) {
          return <View key={`empty-${i}`} style={[rowS.cell, { width: CELL_SIZE, height: CELL_SIZE + 12 }]} />;
        }

        const flowerSize = getFlowerSize(day.mood);

        return (
          <View key={day.date} style={[rowS.cell, { width: CELL_SIZE, height: CELL_SIZE + 12 }]}>
            {/* Vine connector to previous day */}
            {day.showVine && (
              <View style={rowS.vineWrap}>
                <StreakVine
                  streakLength={day.streakLength}
                  width={CELL_PADDING + 4}
                  height={CELL_SIZE * 0.4}
                  active={day.streakLength > 0}
                />
              </View>
            )}
            <Pressable
              onPress={() => day.score !== null && onDayPress(day)}
              style={rowS.flowerWrap}
            >
              {day.isToday && <TodayGlow size={CELL_SIZE - 4} />}
              <MoodFlower
                score={day.score}
                size={flowerSize}
                animated={day.isToday}
              />
            </Pressable>
            {/* Day number */}
            <Text
              style={[
                rowS.dayNum,
                { color: day.isToday ? colors.primary : colors.mutedForeground },
                day.isToday && rowS.dayNumToday,
              ]}
            >
              {parseInt(day.date.slice(8, 10), 10)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const rowS = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: CELL_PADDING,
    marginBottom: 4,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  flowerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  vineWrap: {
    position: "absolute",
    left: -CELL_PADDING - 2,
    top: "50%",
  },
  dayNum: {
    fontFamily: "Manrope_400Regular",
    fontSize: 9,
    marginTop: 1,
  },
  dayNumToday: {
    fontFamily: "Manrope_700Bold",
  },
});

// ── Month Header ─────────────────────────────

function MonthHeader({ monthStr }: { monthStr: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[headerS.month, { color: colors.foreground }]}>
      {monthStr}
    </Text>
  );
}

const headerS = StyleSheet.create({
  month: {
    fontFamily: "Sora_600SemiBold",
    ...typography.sm,
    marginTop: 12,
    marginBottom: 6,
  },
});

// ── Main Component ───────────────────────────

export function MoodMeadow({ dailyMoods, year }: MoodMeadowProps) {
  const { colors } = useTheme();
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null);

  const meadowData = useMemo(() => {
    const cells = buildMeadowGrid(year, dailyMoods);

    // Group into months, then weeks within each month
    const sections: { month: string; weeks: DayCell[][] }[] = [];
    let currentMonth = "";
    let currentWeek: DayCell[] = [];

    for (const cell of cells) {
      const d = new Date(cell.date + "T00:00:00");
      const monthLabel = d.toLocaleDateString("en-US", { month: "long" });

      if (monthLabel !== currentMonth) {
        if (currentWeek.length > 0 && sections.length > 0) {
          sections[sections.length - 1]!.weeks.push(currentWeek);
          currentWeek = [];
        }
        currentMonth = monthLabel;
        sections.push({ month: monthLabel, weeks: [] });
      }

      currentWeek.push(cell);
      if (d.getDay() === 6) {
        // Saturday = end of week
        sections[sections.length - 1]!.weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Push remaining week
    if (currentWeek.length > 0 && sections.length > 0) {
      sections[sections.length - 1]!.weeks.push(currentWeek);
    }

    return sections;
  }, [year, dailyMoods]);

  // Flatten to renderable items for FlatList
  const flatItems = useMemo(() => {
    const items: { type: "month"; month: string; key: string }[] | { type: "week"; days: DayCell[]; key: string }[] = [];
    const result: ({ type: "month"; month: string; key: string } | { type: "week"; days: DayCell[]; key: string })[] = [];

    for (const section of meadowData) {
      result.push({ type: "month", month: section.month, key: `m-${section.month}` });
      section.weeks.forEach((week, i) => {
        result.push({ type: "week", days: week, key: `w-${section.month}-${i}` });
      });
    }

    return result;
  }, [meadowData]);

  const onDayPress = useCallback((day: DayCell) => {
    setSelectedDay(day);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: (typeof flatItems)[number] }) => {
      if (item.type === "month") {
        return <MonthHeader monthStr={item.month} />;
      }
      return <WeekRow days={item.days} onDayPress={onDayPress} />;
    },
    [onDayPress],
  );

  // Day-of-week headers
  const dayHeaders = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <Animated.View entering={FadeIn.duration(400)} style={mainS.container}>
      {/* Day-of-week header row */}
      <View style={mainS.dayHeaderRow}>
        {dayHeaders.map((d, i) => (
          <View key={i} style={[mainS.dayHeaderCell, { width: CELL_SIZE }]}>
            <Text style={[mainS.dayHeaderText, { color: colors.mutedForeground }]}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      <FlatList
        data={flatItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={5}
      />

      {/* Legend */}
      <View style={mainS.legend}>
        {[
          { score: 5, label: "Great" },
          { score: 4, label: "Good" },
          { score: 3, label: "Okay" },
          { score: 2, label: "Low" },
          { score: 1, label: "Bad" },
        ].map((item) => (
          <View key={item.score} style={mainS.legendItem}>
            <MoodFlower score={item.score} size="small" animated={false} />
            <Text style={[mainS.legendLabel, { color: colors.mutedForeground }]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <DayDetailModal
        day={selectedDay}
        visible={!!selectedDay}
        onClose={() => setSelectedDay(null)}
      />
    </Animated.View>
  );
}

const mainS = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  dayHeaderRow: {
    flexDirection: "row",
    gap: CELL_PADDING,
    marginBottom: 4,
  },
  dayHeaderCell: {
    alignItems: "center",
  },
  dayHeaderText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 10,
    textTransform: "uppercase",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
    paddingBottom: 4,
  },
  legendItem: {
    alignItems: "center",
    gap: 2,
  },
  legendLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 9,
  },
});
