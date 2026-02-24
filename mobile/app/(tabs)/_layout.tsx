import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform } from "react-native";
import { Home, BookOpen, CheckSquare, Menu } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";

export default function TabLayout() {
  const { colors, resolvedMode } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: Platform.OS === "ios" ? 86 : 72,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 20 : 10,
          paddingHorizontal: 10,
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          backgroundColor: colors.background,
          elevation: 8,
          shadowColor: colors.elevatedShadowColor,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 2,
          marginVertical: 2,
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontFamily: "Manrope_600SemiBold",
          fontSize: 11,
          letterSpacing: 0.1,
          marginTop: 3,
        },
        tabBarActiveBackgroundColor: colors.secondary,
        tabBarIconStyle: {
          marginTop: 1,
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
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={1.6} />
          ),
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
