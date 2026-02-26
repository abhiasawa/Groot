import { Tabs } from "expo-router";
import { Sun, BookOpen, User, Settings } from "lucide-react-native";

import { BottomTabBar } from "../../components/ui/bottom-tab-bar";
import { ComposeModal } from "../../components/ui/compose-modal";
import { ComposeProvider, useCompose } from "../../lib/compose-context";

function ComposeOverlay() {
  const { visible, mode, close } = useCompose();
  return <ComposeModal visible={visible} onClose={close} initialMode={mode} />;
}

function TabsInner() {
  return (
    <>
      <Tabs
        initialRouteName="today"
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
          name="today"
          options={{
            title: "Today",
            tabBarIcon: ({ color, size, focused }) => (
              <Sun size={size} color={color} strokeWidth={focused ? 2.2 : 1.7} />
            ),
          }}
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
          name="mirror"
          options={{
            title: "Mirror",
            tabBarIcon: ({ color, size, focused }) => (
              <User size={size} color={color} strokeWidth={focused ? 2.2 : 1.7} />
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
        {/* Hidden routes accessible via navigation but not in tab bar */}
        <Tabs.Screen name="garden" options={{ href: null }} />
        <Tabs.Screen name="tasks" options={{ href: null }} />
        <Tabs.Screen name="mood" options={{ href: null }} />
        <Tabs.Screen name="stories" options={{ href: null }} />
        <Tabs.Screen name="topics" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="insights" options={{ href: null }} />
        <Tabs.Screen name="more" options={{ href: null }} />
      </Tabs>

      <ComposeOverlay />
    </>
  );
}

export default function TabLayout() {
  return (
    <ComposeProvider>
      <TabsInner />
    </ComposeProvider>
  );
}
