import React, { useRef, useCallback } from "react";
import { View, StyleSheet, PanResponder } from "react-native";
import { useRouter } from "expo-router";

type MainTab = "today" | "journal" | "mood" | "garden" | "mirror" | "tasks" | "settings";

const TAB_ORDER: MainTab[] = ["today", "garden", "mirror", "settings"];
const TAB_ROUTE: Record<MainTab, string> = {
  today: "/(tabs)/today",
  journal: "/(tabs)/journal",
  mood: "/(tabs)/mood",
  garden: "/(tabs)/garden",
  mirror: "/(tabs)/mirror",
  tasks: "/(tabs)/tasks",
  settings: "/(tabs)/settings",
};

interface TabSwipeViewProps {
  currentTab: MainTab;
  children: React.ReactNode;
  enabled?: boolean;
}

export function TabSwipeView({ currentTab, children, enabled = true }: TabSwipeViewProps) {
  const router = useRouter();
  const currentTabRef = useRef(currentTab);
  currentTabRef.current = currentTab;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!enabledRef.current) return false;
        const dx = Math.abs(gestureState.dx);
        const dy = Math.abs(gestureState.dy);
        return dx > 20 && dx > dy * 1.5;
      },
      onPanResponderRelease: (_, gestureState) => {
        const horizontalTravel = Math.abs(gestureState.dx);
        const horizontalVelocity = Math.abs(gestureState.vx);
        const mostlyHorizontal = horizontalTravel > Math.abs(gestureState.dy);
        const passedThreshold = horizontalTravel > 80 || horizontalVelocity > 0.4;

        if (!mostlyHorizontal || !passedThreshold) return;

        const activeIndex = TAB_ORDER.indexOf(currentTabRef.current);
        if (activeIndex === -1) return;

        const direction = gestureState.dx < 0 ? 1 : -1;
        const nextIndex = Math.max(0, Math.min(TAB_ORDER.length - 1, activeIndex + direction));

        if (nextIndex === activeIndex) return;
        const nextTab = TAB_ORDER[nextIndex];
        if (nextTab) {
          router.replace(TAB_ROUTE[nextTab] as never);
        }
      },
    }),
  ).current;

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
