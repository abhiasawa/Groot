import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { fonts, typography } from "../../constants/typography";
import { EMOTION_COLORS, type EmotionType } from "../../constants/card-colors";

interface EmotionsChartProps {
  data: Record<EmotionType, number>;
}

const EMOTION_LABELS: { key: EmotionType; label: string }[] = [
  { key: "happy", label: "Happy" },
  { key: "sad", label: "Sad" },
  { key: "calm", label: "Calm" },
  { key: "anxious", label: "Anxious" },
];

const BAR_MAX_HEIGHT = 140;

export function EmotionsChart({ data }: EmotionsChartProps) {
  const maxVal = Math.max(...Object.values(data), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Emotions</Text>
      <Text style={styles.subtitle}>How you've been feeling lately</Text>
      <View style={styles.separator} />

      <View style={styles.barsRow}>
        {EMOTION_LABELS.map(({ key, label }) => {
          const pct = data[key] ?? 0;
          const barHeight = Math.max((pct / maxVal) * BAR_MAX_HEIGHT, 8);

          return (
            <View key={key} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: barHeight,
                      backgroundColor: EMOTION_COLORS[key],
                    },
                  ]}
                >
                  <Text style={styles.barPct}>{pct}%</Text>
                </View>
              </View>
              <Text style={styles.barLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  title: {
    fontFamily: fonts.semiBold,
    ...typography.lg,
    color: "#1E1E1E",
  },
  subtitle: {
    fontFamily: fonts.regular,
    ...typography.xs,
    color: "#555555",
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: "#EAEAEA",
    marginVertical: 16,
  },
  barsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: BAR_MAX_HEIGHT + 30,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
  },
  barTrack: {
    width: 36,
    height: BAR_MAX_HEIGHT,
    backgroundColor: "#F0EFEB",
    borderRadius: 10,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
  },
  barPct: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: "#FFF",
  },
  barLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#555555",
    marginTop: 8,
  },
});
