import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useCompose } from "../../lib/compose-context";

const TAB_ORDER = ["journal", "mood", "__fab__", "tasks", "settings"] as const;

function getTabLabel(name: string, title?: string) {
  if (title) return title;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { open: openCompose } = useCompose();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 8 : 6);

  const fabScale = useSharedValue(1);
  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleFabPress = useCallback(() => {
    fabScale.value = withSpring(0.85, { damping: 15, stiffness: 400 }, () => {
      fabScale.value = withSpring(1, { damping: 12, stiffness: 350 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openCompose();
  }, [fabScale, openCompose]);

  return (
    <View
      style={[
        styles.shell,
        {
          paddingBottom: bottomInset,
          backgroundColor: colors.card,
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      <View style={styles.row}>
        {TAB_ORDER.map((slot) => {
          if (slot === "__fab__") {
            return (
              <View key="fab" style={styles.fabSlot}>
                <Animated.View style={fabAnimStyle}>
                  <Pressable
                    onPress={handleFabPress}
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                  >
                    <Plus size={26} color={colors.primaryForeground} strokeWidth={2.4} />
                  </Pressable>
                </Animated.View>
              </View>
            );
          }

          const route = state.routes.find((r) => r.name === slot);
          if (!route) return <View key={slot} style={styles.item} />;

          const descriptor = descriptors[route.key];
          if (!descriptor) return <View key={slot} style={styles.item} />;

          const focused = state.index === state.routes.findIndex((r) => r.key === route.key);
          const label = getTabLabel(route.name, typeof descriptor.options.title === "string" ? descriptor.options.title : undefined);
          const tint = focused ? colors.primary : colors.mutedForeground;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const icon =
            descriptor.options.tabBarIcon?.({
              focused,
              color: tint,
              size: 22,
            }) ?? null;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => {
                navigation.emit({ type: "tabLongPress", target: route.key });
              }}
              style={styles.item}
            >
              <View style={styles.iconWrap}>{icon}</View>
              <Text
                style={[
                  styles.label,
                  {
                    color: tint,
                    fontFamily: focused ? "Manrope_700Bold" : "Manrope_500Medium",
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingTop: 8,
    paddingHorizontal: 6,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    height: 52,
  },
  iconWrap: {
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 13,
    includeFontPadding: false,
  },
  fabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
});
