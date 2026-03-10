import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";

const TAB_ORDER = ["journal", "__fab__", "settings"] as const;

function getTabLabel(name: string, title?: string) {
  if (title) return title;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 8 : 6);

  return (
    <View
      style={[
        st.shell,
        {
          paddingBottom: bottomInset + 6,
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      <View
        style={[
          st.row,
          {
            backgroundColor: colors.glassSurface,
            borderColor: colors.glassBorder,
          },
        ]}
      >
        {TAB_ORDER.map((slot) => {
          if (slot === "__fab__") {
            return (
              <View key="fab" style={st.fabSlot}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push("/capture");
                  }}
                  style={[
                    st.fab,
                    {
                      backgroundColor: colors.primary,
                      borderColor: `${colors.background}F2`,
                    },
                  ]}
                >
                  <Plus size={28} color={colors.primaryForeground} strokeWidth={2.4} />
                </Pressable>
              </View>
            );
          }

          const route = state.routes.find((r) => r.name === slot);
          if (!route) return <View key={slot} style={st.item} />;

          const descriptor = descriptors[route.key];
          if (!descriptor) return <View key={slot} style={st.item} />;

          const focused = state.index === state.routes.findIndex((r) => r.key === route.key);
          const label = getTabLabel(
            route.name,
            typeof descriptor.options.title === "string" ? descriptor.options.title : undefined,
          );
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
              style={st.item}
            >
              <View style={st.iconWrap}>{icon}</View>
              <Text
                style={[
                  st.label,
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

const st = StyleSheet.create({
  shell: {
    paddingHorizontal: 14,
    paddingTop: 8,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    height: 60,
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
    textTransform: "uppercase",
    letterSpacing: 0.7,
    includeFontPadding: false,
  },
  fabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -34,
    borderWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },
});
