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
          position: "absolute",
          marginHorizontal: 16,
          marginBottom: 14,
          height: 70,
          borderRadius: 22,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          backgroundColor: colors.glassSurface,
          elevation: 0,
          shadowColor: colors.elevatedShadowColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 18,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 8 : 10,
        },
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 4,
          marginTop: 6,
          marginBottom: 4,
        },
        tabBarLabelStyle: {
          fontFamily: "Manrope_600SemiBold",
          fontSize: 10,
          letterSpacing: 0.25,
          marginTop: 2,
        },
        tabBarActiveBackgroundColor: colors.secondary,
        tabBarBackground: () => (
          <BlurView
            intensity={resolvedMode === "dark" ? 24 : 44}
            tint={resolvedMode === "dark" ? "dark" : "light"}
            style={{ flex: 1, borderRadius: 22 }}
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
