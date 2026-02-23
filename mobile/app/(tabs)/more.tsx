import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Flame,
  CheckSquare,
  BarChart3,
  Hash,
  Users,
  User,
  Settings,
  ChevronRight,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";

// ── Menu items ───────────────────────────────

interface MenuItem {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  route: string;
}

function useMenuItems(): MenuItem[] {
  const { colors } = useTheme();

  return [
    {
      key: "habits",
      label: "Habits",
      description: "Track your daily habits and streaks",
      icon: <Flame size={22} color={colors.chart3} strokeWidth={1.5} />,
      route: "/habits",
    },
    {
      key: "tasks",
      label: "Tasks",
      description: "View and manage your to-dos",
      icon: <CheckSquare size={22} color={colors.chart2} strokeWidth={1.5} />,
      route: "/tasks",
    },
    {
      key: "insights",
      label: "Insights",
      description: "Weekly reports and analysis",
      icon: <BarChart3 size={22} color={colors.chart1} strokeWidth={1.5} />,
      route: "/insights",
    },
    {
      key: "topics",
      label: "Topics",
      description: "Explore themes from your conversations",
      icon: <Hash size={22} color={colors.chart4} strokeWidth={1.5} />,
      route: "/topics",
    },
    {
      key: "people",
      label: "People",
      description: "People mentioned in your memories",
      icon: <Users size={22} color={colors.chart5} strokeWidth={1.5} />,
      route: "/people",
    },
    {
      key: "profile",
      label: "Profile",
      description: "Facts Groot has learned about you",
      icon: <User size={22} color={colors.primary} strokeWidth={1.5} />,
      route: "/profile",
    },
    {
      key: "settings",
      label: "Settings",
      description: "Theme, notifications, and preferences",
      icon: <Settings size={22} color={colors.mutedForeground} strokeWidth={1.5} />,
      route: "/settings",
    },
  ];
}

// ── Component ────────────────────────────────

export default function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const items = useMenuItems();

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>More</Text>

        <View style={s.list}>
          {items.map((item, index) => (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                s.menuItem,
                pressed && s.menuItemPressed,
                index === items.length - 1 && s.menuItemLast,
              ]}
              onPress={() => router.push(item.route as never)}
            >
              <View style={s.menuIcon}>{item.icon}</View>
              <View style={s.menuContent}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuDescription}>{item.description}</Text>
              </View>
              <ChevronRight
                size={18}
                color={colors.mutedForeground}
                strokeWidth={1.5}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const styles = (c: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      padding: 20,
      paddingBottom: 40,
    },
    pageTitle: {
      fontFamily: "Inter_700Bold",
      ...typography["2xl"],
      color: c.foreground,
      marginBottom: 20,
    },
    list: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemPressed: {
      backgroundColor: c.secondary,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: c.secondary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    menuContent: {
      flex: 1,
    },
    menuLabel: {
      fontFamily: "Inter_600SemiBold",
      ...typography.base,
      color: c.foreground,
      marginBottom: 2,
    },
    menuDescription: {
      fontFamily: "Inter_400Regular",
      ...typography.xs,
      color: c.mutedForeground,
    },
  });
