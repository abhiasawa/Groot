import React from "react";
import { View, StyleSheet, PanResponder } from "react-native";
import { useRouter } from "expo-router";

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

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      if (!enabled) return false;
      const dx = Math.abs(gestureState.dx);
      const dy = Math.abs(gestureState.dy);
      return dx > 20 && dx > dy * 1.25;
    },
    onPanResponderRelease: (_, gestureState) => {
      const horizontalTravel = Math.abs(gestureState.dx);
      const horizontalVelocity = Math.abs(gestureState.vx);
      const mostlyHorizontal = horizontalTravel > Math.abs(gestureState.dy);
      const passedThreshold = horizontalTravel > 96 || horizontalVelocity > 0.55;

      if (!mostlyHorizontal || !passedThreshold) return;

      const activeIndex = TAB_ORDER.indexOf(currentTab);
      if (activeIndex === -1) return;

      const direction = gestureState.dx < 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(TAB_ORDER.length - 1, activeIndex + direction));

      if (nextIndex === activeIndex) return;
      const nextTab = TAB_ORDER[nextIndex];
      router.replace(TAB_ROUTE[nextTab] as never);
    },
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
