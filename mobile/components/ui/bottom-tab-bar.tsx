import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../lib/theme/provider";

const PRIMARY_TABS = new Set(["journal", "tasks", "insights", "more"]);

function getTabLabel(name: string, title?: string) {
  if (title) return title;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 10 : 8);

  const visibleRoutes = state.routes.filter((route) => PRIMARY_TABS.has(route.name));

  return (
    <View
      style={[
        styles.shell,
        {
          paddingBottom: bottomInset,
          backgroundColor: colors.background,
          borderTopColor: colors.glassBorder,
        },
      ]}
    >
      <View style={styles.row}>
        {visibleRoutes.map((route) => {
          const descriptor = descriptors[route.key];
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
              style={[
                styles.item,
                focused && {
                  backgroundColor: colors.secondary,
                  borderColor: colors.primary,
                  borderWidth: 1,
                },
              ]}
            >
              <View style={styles.iconWrap}>{icon}</View>
              <Text
                style={[
                  styles.label,
                  {
                    color: tint,
                    fontFamily: "Manrope_600SemiBold",
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
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  item: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  iconWrap: {
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 16,
    includeFontPadding: false,
  },
});
