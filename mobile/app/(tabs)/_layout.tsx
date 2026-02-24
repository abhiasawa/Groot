import { Tabs } from "expo-router";
import { BookOpen, CheckSquare, BarChart3, Menu } from "lucide-react-native";

import { BottomTabBar } from "../../components/ui/bottom-tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="journal"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
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
