import React from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import { Tabs, useRouter } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BookOpen, CheckSquare } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NotoMascot } from "../../components/ui/noto-mascot";
import { fonts } from "../../constants/typography";
import { notoTheme, colors } from "../../lib/theme/tokens";

const TAB_ITEMS = [
  { name: "index", label: "Journal", Icon: BookOpen },
  { name: "tasks", label: "Tasks", Icon: CheckSquare },
] as const;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBarContainer,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {/* FAB — floating above tab bar center */}
      <Pressable
        onPress={() => router.push("/capture")}
        style={styles.fabButton}
        accessibilityLabel="Capture a new thought"
        accessibilityRole="button"
      >
        <View style={styles.fabWrap}>
          <NotoMascot size={48} compact />
        </View>
      </Pressable>

      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const item = TAB_ITEMS.find((t) => t.name === route.name);
          if (!item) return null;
          const isFocused = state.index === index;
          const { Icon, label } = item;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <React.Fragment key={route.key}>
              {/* Spacer for FAB between Journal (index 0) and Tasks (index 1) */}
              {index === 1 && <View style={styles.fabSpacer} />}
              <Pressable
                onPress={onPress}
                style={styles.tabItem}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={label}
              >
                <Icon
                  size={22}
                  color={isFocused ? notoTheme.foreground : colors.textFaded}
                  strokeWidth={isFocused ? 2.2 : 1.8}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused
                        ? notoTheme.foreground
                        : colors.textFaded,
                    },
                    isFocused && styles.tabLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tasks" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: colors.pageBg,
    borderTopWidth: 1,
    borderTopColor: notoTheme.border,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 4,
  },
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontFamily: fonts.bold,
  },
  fabSpacer: {
    width: 72,
  },
  fabButton: {
    position: "absolute",
    top: -28,
    alignSelf: "center",
    zIndex: 10,
  },
  fabWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4338CA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
});
