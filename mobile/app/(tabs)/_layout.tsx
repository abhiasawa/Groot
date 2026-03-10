import { Tabs } from "expo-router";
import { BookOpen, Activity, CheckSquare, Settings } from "lucide-react-native";

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
        options={{ href: null }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, size, focused }) => (
            <BookOpen size={size} color={color} strokeWidth={focused ? 2.2 : 1.7} />
          ),
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: "Pulse",
          tabBarIcon: ({ color, size, focused }) => (
            <Activity size={size} color={color} strokeWidth={focused ? 2.2 : 1.7} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size, focused }) => (
            <CheckSquare size={size} color={color} strokeWidth={focused ? 2.2 : 1.7} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <Settings size={size} color={color} strokeWidth={focused ? 2.2 : 1.7} />
          ),
        }}
      />
    </Tabs>
  );
}
