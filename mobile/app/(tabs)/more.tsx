import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
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
  Sparkles,
  Heart,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GradientBackground } from "../../components/ui/gradient-background";
import { GlassCard } from "../../components/ui/glass-card";
import { PressScale } from "../../components/ui/press-scale";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PADDING = 20;
const GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;

// ── Menu items ───────────────────────────────

interface MenuItem {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  group: "core" | "reflection" | "system";
}

function useMenuItems(): MenuItem[] {
  const { colors } = useTheme();

  return [
    {
      key: "habits",
      label: "Habits",
      description: "Daily routines and streaks",
      icon: <Flame size={24} color={colors.chart3} strokeWidth={1.5} />,
      route: "/habits",
      group: "core",
    },
    {
      key: "tasks",
      label: "Tasks",
      description: "To-dos and reminders",
      icon: <CheckSquare size={24} color={colors.chart2} strokeWidth={1.5} />,
      route: "/tasks",
      group: "core",
    },
    {
      key: "people",
      label: "People",
      description: "Important relationships",
      icon: <Users size={24} color={colors.chart5} strokeWidth={1.5} />,
      route: "/people",
      group: "core",
    },
    {
      key: "insights",
      label: "Insights",
      description: "Weekly reflections and trends",
      icon: <BarChart3 size={24} color={colors.chart1} strokeWidth={1.5} />,
      route: "/insights",
      group: "reflection",
    },
    {
      key: "stories",
      label: "Stories",
      description: "Highlights worth remembering",
      icon: <Sparkles size={24} color={colors.chart4} strokeWidth={1.5} />,
      route: "/(tabs)/stories",
      group: "reflection",
    },
    {
      key: "mood",
      label: "Mood",
      description: "Emotional patterns over time",
      icon: <Heart size={24} color={colors.chart2} strokeWidth={1.5} />,
      route: "/(tabs)/mood",
      group: "reflection",
    },
    {
      key: "topics",
      label: "Topics",
      description: "Conversation themes",
      icon: <Hash size={24} color={colors.chart4} strokeWidth={1.5} />,
      route: "/topics",
      group: "reflection",
    },
    {
      key: "profile",
      label: "Profile",
      description: "What Groot knows about you",
      icon: <User size={24} color={colors.primary} strokeWidth={1.5} />,
      route: "/profile",
      group: "system",
    },
    {
      key: "settings",
      label: "Settings",
      description: "Notifications and app preferences",
      icon: <Settings size={24} color={colors.mutedForeground} strokeWidth={1.5} />,
      route: "/settings",
      group: "system",
    },
  ];
}

// ── Component ────────────────────────────────

export default function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const items = useMenuItems();

  const coreItems = items.filter((item) => item.group === "core");
  const reflectionItems = items.filter((item) => item.group === "reflection");
  const systemItems = items.filter((item) => item.group === "system");

  return (
    <SafeAreaView style={s.safeArea}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.pageTitle, { color: colors.foreground }]}>More</Text>
          <Text style={[s.pageSubtitle, { color: colors.mutedForeground }]}>
            Fewer sections, clearer flow.
          </Text>

          {[
            { title: "Daily Essentials", values: coreItems },
            { title: "Reflection Deep Dives", values: reflectionItems },
            { title: "Profile & App", values: systemItems },
          ].map((section, sectionIndex) => (
            <View key={section.title} style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>
                {section.title}
              </Text>
              <View style={s.grid}>
                {section.values.map((item, index) => (
                  <PressScale
                    key={item.key}
                    onPress={() => router.push(item.route as never)}
                    style={{ width: CARD_WIDTH }}
                  >
                    <GlassCard
                      padding={16}
                      delay={(sectionIndex * 6 + index) * 70}
                    >
                      <View style={s.cardContent}>
                        <View
                          style={[
                            s.iconContainer,
                            { backgroundColor: colors.glassSurface },
                          ]}
                        >
                          {item.icon}
                        </View>
                        <Text
                          style={[s.cardLabel, { color: colors.foreground }]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            s.cardDescription,
                            { color: colors.mutedForeground },
                          ]}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                      </View>
                    </GlassCard>
                  </PressScale>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    padding: PADDING,
    paddingBottom: 40,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    ...typography.title,
  },
  pageSubtitle: {
    fontFamily: "Inter_400Regular",
    ...typography.sm,
    marginTop: 4,
    marginBottom: 18,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    ...typography.sm,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  cardContent: {
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardLabel: {
    fontFamily: "Inter_600SemiBold",
    ...typography.sm,
    marginBottom: 4,
    textAlign: "center",
  },
  cardDescription: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
    textAlign: "center",
  },
});
