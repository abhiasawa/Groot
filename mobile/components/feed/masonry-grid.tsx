import React, { useEffect, useMemo, useCallback, useRef } from "react";
import { View, StyleSheet, Dimensions, Alert } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThoughtCard } from "./thought-card";
import type { Memory } from "../../../shared/types/api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const H_PADDING = 20;
const GAP = 10;
const COLUMN_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - GAP) / 2;

/** Stagger delay per card index */
const STAGGER_MS = 60;
const DURATION_MS = 400;

interface MasonryGridProps {
  memories: Memory[];
  onCardPress?: (memory: Memory) => void;
  onDelete?: (memoryId: string) => void;
  justCapturedId?: string | null;
}

/** Animated wrapper for each card — fades in + slides up */
function AnimatedCard({
  memory,
  index,
  onPress,
  onDelete,
  isJustCaptured,
}: {
  memory: Memory;
  index: number;
  onPress?: () => void;
  onDelete?: (id: string) => void;
  isJustCaptured?: boolean;
}) {
  const progress = useSharedValue(0);
  const captureScale = useSharedValue(isJustCaptured ? 0 : 1);
  const captureGlow = useSharedValue(isJustCaptured ? 0 : 1);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Only animate entrance once per card
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    progress.value = withDelay(
      index * STAGGER_MS,
      withTiming(1, {
        duration: DURATION_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, []);

  // Special fly-in for just-captured card
  useEffect(() => {
    if (isJustCaptured) {
      captureScale.value = withSequence(
        withSpring(1.08, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 250 }),
      );
      captureGlow.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 800 }),
      );
    }
  }, [isJustCaptured]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete thought?",
      "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete?.(memory.id),
        },
      ],
    );
  }, [memory.id, onDelete]);

  const animStyle = useAnimatedStyle(() => {
    if (isJustCaptured) {
      return {
        opacity: 1,
        transform: [{ scale: captureScale.value }],
        shadowColor: "#818CF8",
        shadowOpacity: captureGlow.value * 0.4,
        shadowRadius: captureGlow.value * 16,
      };
    }
    return {
      opacity: progress.value,
      transform: [
        { translateY: (1 - progress.value) * 18 },
        { scale: 0.96 + progress.value * 0.04 },
      ],
    };
  });

  return (
    <Animated.View style={animStyle}>
      <ThoughtCard memory={memory} onPress={onPress} onLongPress={handleLongPress} />
    </Animated.View>
  );
}

/**
 * 2-column Pinterest-style masonry layout with staggered entrance animations.
 */
export function MasonryGrid({ memories, onCardPress, onDelete, justCapturedId }: MasonryGridProps) {
  const { leftCol, rightCol } = useMemo(() => {
    const left: { mem: Memory; idx: number }[] = [];
    const right: { mem: Memory; idx: number }[] = [];
    let leftH = 0;
    let rightH = 0;

    for (let i = 0; i < memories.length; i++) {
      const m = memories[i];
      const textLen = (m.content || m.media_description || "").length;
      const isMedia = m.message_type === "audio" || m.message_type === "image";
      const h = (isMedia ? 60 : 0) + Math.min(textLen * 0.4, 140) + 50;

      if (leftH <= rightH) {
        left.push({ mem: m, idx: i });
        leftH += h;
      } else {
        right.push({ mem: m, idx: i });
        rightH += h;
      }
    }

    return { leftCol: left, rightCol: right };
  }, [memories]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={styles.container}
    >
      <View style={styles.column}>
        {leftCol.map(({ mem, idx }) => (
          <AnimatedCard
            key={mem.id}
            memory={mem}
            index={idx}
            onPress={() => onCardPress?.(mem)}
            onDelete={onDelete}
            isJustCaptured={mem.id === justCapturedId}
          />
        ))}
      </View>
      <View style={styles.column}>
        {rightCol.map(({ mem, idx }) => (
          <AnimatedCard
            key={mem.id}
            memory={mem}
            index={idx}
            onPress={() => onCardPress?.(mem)}
            onDelete={onDelete}
            isJustCaptured={mem.id === justCapturedId}
          />
        ))}
      </View>
    </Animated.View>
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
