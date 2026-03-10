import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";

import { ThoughtCard } from "./thought-card";
import type { Memory } from "../../../shared/types/api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const H_PADDING = 20;
const GAP = 8;
const COLUMN_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - GAP) / 2;

interface MasonryGridProps {
  memories: Memory[];
  onCardPress?: (memory: Memory) => void;
}

/**
 * Simple 2-column masonry layout.
 * Distributes cards into the shorter column to approximate
 * a Pinterest-style staggered grid.
 */
export function MasonryGrid({ memories, onCardPress }: MasonryGridProps) {
  const { leftCol, rightCol } = useMemo(() => {
    const left: Memory[] = [];
    const right: Memory[] = [];
    // Rough height estimation: voice/image cards are taller
    let leftH = 0;
    let rightH = 0;

    for (const m of memories) {
      const textLen = (m.content || m.media_description || "").length;
      const isMedia = m.message_type === "audio" || m.message_type === "image";
      // Estimate height in arbitrary units
      const h = (isMedia ? 60 : 0) + Math.min(textLen * 0.4, 120) + 40;

      if (leftH <= rightH) {
        left.push(m);
        leftH += h;
      } else {
        right.push(m);
        rightH += h;
      }
    }

    return { leftCol: left, rightCol: right };
  }, [memories]);

  return (
    <View style={styles.container}>
      <View style={styles.column}>
        {leftCol.map((m) => (
          <ThoughtCard key={m.id} memory={m} onPress={() => onCardPress?.(m)} />
        ))}
      </View>
      <View style={styles.column}>
        {rightCol.map((m) => (
          <ThoughtCard key={m.id} memory={m} onPress={() => onCardPress?.(m)} />
        ))}
      </View>
    </View>
  );
}

export { COLUMN_WIDTH };

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: GAP,
  },
  column: {
    flex: 1,
  },
});
