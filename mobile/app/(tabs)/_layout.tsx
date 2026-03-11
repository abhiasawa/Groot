import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import {
  House,
  Search,
  Plus,
  BookOpen,
  User,
} from "lucide-react-native";

import { ComposeModal } from "../../components/ui/compose-modal";
import { fonts } from "../../constants/typography";

export default function TabsLayout() {
  const [composeVisible, setComposeVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: "#1E1E1E",
          tabBarInactiveTintColor: "rgba(30,30,30,0.4)",
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <House size={size} color={color} strokeWidth={1.8} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, size }) => (
              <Search size={size} color={color} strokeWidth={1.8} />
            ),
          }}
        />
        <Tabs.Screen
          name="capture-fab"
          options={{
            title: "",
            tabBarIcon: () => (
              <View style={styles.fab}>
                <Plus size={22} color="#1E1E1E" strokeWidth={2.4} />
              </View>
            ),
            tabBarLabel: () => null,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setComposeVisible(true);
            },
          }}
        />
        <Tabs.Screen
          name="journey"
          options={{
            title: "Journey",
            tabBarIcon: ({ color, size }) => (
              <BookOpen size={size} color={color} strokeWidth={1.8} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <User size={size} color={color} strokeWidth={1.8} />
            ),
          }}
        />
      </Tabs>

      <ComposeModal
        visible={composeVisible}
        onClose={() => {
          setComposeVisible(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#F0EFEB",
    borderTopWidth: 0,
    elevation: 0,
    height: 88,
    paddingBottom: 24,
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFBB2C",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#FFBB2C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
