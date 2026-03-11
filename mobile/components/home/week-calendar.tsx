import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import { fonts } from "../../constants/typography";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDates(): { label: string; date: number; isToday: boolean }[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  return DAY_LABELS.map((label, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    return {
      label,
      date: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

interface WeekCalendarProps {
  selectedDate?: number;
  onSelectDate?: (date: number) => void;
}

export function WeekCalendar({ selectedDate, onSelectDate }: WeekCalendarProps) {
  const week = useMemo(() => getWeekDates(), []);

  return (
    <View style={styles.container}>
      {week.map((day) => {
        const isActive = selectedDate != null ? day.date === selectedDate : day.isToday;
        return (
          <Pressable
            key={day.label}
            onPress={() => onSelectDate?.(day.date)}
            style={styles.dayColumn}
          >
            <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>
              {day.label}
            </Text>
            <View style={[styles.dayCircle, isActive && styles.dayCircleActive]}>
              <Text
                style={[styles.dayNumber, isActive && styles.dayNumberActive]}
              >
                {day.date}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  dayColumn: {
    alignItems: "center",
    gap: 6,
  },
  dayLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "rgba(30,30,30,0.4)",
  },
  dayLabelActive: {
    color: "#1E1E1E",
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: "#FFBB2C",
  },
  dayNumber: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#1E1E1E",
  },
  dayNumberActive: {
    fontFamily: fonts.semiBold,
    color: "#1E1E1E",
  },
});
