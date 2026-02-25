import { Tabs } from "expo-router";
import { BookOpen, Activity, CheckSquare, Settings } from "lucide-react-native";

import { BottomTabBar } from "../../components/ui/bottom-tab-bar";
import { ChatScreen } from "../../components/ui/chat-screen";
import { ComposeProvider, useCompose } from "../../lib/compose-context";

function ChatOverlay() {
  const { visible, close } = useCompose();
  return <ChatScreen visible={visible} onClose={close} />;
}

function TabsInner() {
  return (
    <>
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
          name="today"
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
        {/* Hidden routes accessible via navigation but not in tab bar */}
        <Tabs.Screen name="stories" options={{ href: null }} />
        <Tabs.Screen name="topics" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="insights" options={{ href: null }} />
        <Tabs.Screen name="more" options={{ href: null }} />
      </Tabs>

      <ChatOverlay />
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
