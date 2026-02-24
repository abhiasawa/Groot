import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

type MainTab = "journal" | "tasks" | "insights" | "more";

const TAB_ORDER: MainTab[] = ["journal", "tasks", "insights", "more"];
const TAB_ROUTE: Record<MainTab, string> = {
  journal: "/(tabs)/journal",
  tasks: "/(tabs)/tasks",
  insights: "/(tabs)/insights",
  more: "/(tabs)/more",
};

interface TabSwipeViewProps {
  currentTab: MainTab;
  children: React.ReactNode;
  enabled?: boolean;
}

export function TabSwipeView({ currentTab, children, enabled = true }: TabSwipeViewProps) {
  const router = useRouter();

  const gesture = Gesture.Pan()
    .enabled(enabled)
    .maxPointers(1)
    .activeOffsetX([-22, 22])
    .failOffsetY([-18, 18])
    .onEnd((event) => {
      "worklet";
      const horizontalTravel = Math.abs(event.translationX);
      const horizontalVelocity = Math.abs(event.velocityX);
      const mostlyHorizontal = horizontalTravel > Math.abs(event.translationY);
      const passedThreshold = horizontalTravel > 96 || horizontalVelocity > 900;

      if (!mostlyHorizontal || !passedThreshold) return;

      const activeIndex = TAB_ORDER.indexOf(currentTab);
      if (activeIndex === -1) return;

      const direction = event.translationX < 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(TAB_ORDER.length - 1, activeIndex + direction));

      if (nextIndex === activeIndex) return;
      const nextTab = TAB_ORDER[nextIndex];
      runOnJS(router.replace)(TAB_ROUTE[nextTab] as never);
    });

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
