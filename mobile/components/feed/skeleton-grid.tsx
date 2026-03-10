import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
} from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
const H_PADDING = 20;
const GAP = 10;
const COL_W = (SCREEN_WIDTH - H_PADDING * 2 - GAP) / 2;

// Varied heights for visual interest
const LEFT_HEIGHTS = [120, 80, 140, 100];
const RIGHT_HEIGHTS = [90, 130, 100, 80];

function SkeletonCard({ height, delay }: { height: number; delay: number }) {
  const shimmer = useSharedValue(0.4);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(300)}
      style={[styles.card, { height }, style]}
    >
      <View style={styles.pillSkeleton} />
      <View style={styles.lineSkeleton} />
      <View style={[styles.lineSkeleton, { width: "60%" }]} />
      <View style={styles.metaSkeleton} />
    </Animated.View>
  );
}

export function SkeletonGrid() {
  return (
    <View style={styles.container}>
      <View style={styles.column}>
        {LEFT_HEIGHTS.map((h, i) => (
          <SkeletonCard key={`l${i}`} height={h} delay={i * 80} />
        ))}
      </View>
      <View style={styles.column}>
        {RIGHT_HEIGHTS.map((h, i) => (
          <SkeletonCard key={`r${i}`} height={h} delay={i * 80 + 40} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: GAP,
  },
  column: {
    flex: 1,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    backgroundColor: "#F0EFED",
    justifyContent: "space-between",
  },
  pillSkeleton: {
    width: 48,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E5E4E1",
  },
  lineSkeleton: {
    width: "85%",
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E5E4E1",
  },
  metaSkeleton: {
    width: 40,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E4E1",
    alignSelf: "flex-end",
  },
});
