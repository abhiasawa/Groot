import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="journal"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="journal" options={{ title: "Feed" }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
