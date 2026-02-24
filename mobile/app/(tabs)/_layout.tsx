import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform } from "react-native";
import { BookOpen, CheckSquare, BarChart3, Menu } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../lib/theme/provider";

export default function TabLayout() {
  const { colors, resolvedMode } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 12 : 14);
  const tabBarHeight = 66 + bottomInset;

  return (
    <Tabs
      initialRouteName="journal"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: bottomInset,
          paddingHorizontal: 9,
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          backgroundColor: colors.background,
          elevation: 6,
          shadowColor: colors.elevatedShadowColor,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 3,
          marginTop: 3,
          marginBottom: 4,
          paddingTop: 4,
          paddingBottom: 4,
          minHeight: 48,
          overflow: "hidden",
        },
        tabBarLabelStyle: {
          fontFamily: "Manrope_600SemiBold",
          fontSize: 11,
          lineHeight: 14,
          letterSpacing: 0.1,
          marginTop: 2,
        },
        tabBarActiveBackgroundColor: colors.secondary,
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={resolvedMode === "dark" ? 18 : 28}
            tint={resolvedMode === "dark" ? "dark" : "light"}
            style={{ flex: 1 }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size} color={color} strokeWidth={1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) => (
            <CheckSquare size={size} color={color} strokeWidth={1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="stories"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size} color={color} strokeWidth={1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="topics"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Menu size={size} color={color} strokeWidth={1.6} />
          ),
        }}
      />
    </Tabs>
  );
}
