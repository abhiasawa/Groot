import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  CheckSquare,
  BookOpen,
  BarChart3,
  Hash,
  User,
  Settings,
  Sparkles,
  HeartPulse,
  ArrowUpRight,
  CalendarCheck2,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GradientBackground } from "../../components/ui/gradient-background";
import { GlassCard } from "../../components/ui/glass-card";
import { PressScale } from "../../components/ui/press-scale";
import { SectionHeader } from "../../components/ui/section-header";
import { SearchInput } from "../../components/ui/search-input";
import { PillBadge } from "../../components/ui/pill-badge";

type GroupKey = "plan" | "insight" | "account";
interface MenuItem {
  key: string;
  label: string;
  description: string;
  route: string;
  group: GroupKey;
  icon: React.ReactNode;
}

function useMenuItems(): MenuItem[] {
  const { colors } = useTheme();

  return [
    {
      key: "tasks",
      label: "Tasks",
      description: "Plan and close loops",
      route: "/(tabs)/tasks",
      group: "plan",
      icon: <CheckSquare size={18} color={colors.primary} strokeWidth={1.7} />,
    },
    {
      key: "journal",
      label: "Journal",
      description: "Memory timeline and entries",
      route: "/(tabs)/journal",
      group: "plan",
      icon: <BookOpen size={18} color={colors.primary} strokeWidth={1.7} />,
    },
    {
      key: "insights",
      label: "Insights",
      description: "Weekly synthesis reports",
      route: "/(tabs)/insights",
      group: "insight",
      icon: <BarChart3 size={18} color={colors.primary} strokeWidth={1.7} />,
    },
    {
      key: "stories",
      label: "Stories",
      description: "Storyworthy moments",
      route: "/(tabs)/stories",
      group: "insight",
      icon: <Sparkles size={18} color={colors.primary} strokeWidth={1.7} />,
    },
    {
      key: "mood",
      label: "Mood",
      description: "Emotion patterns and trends",
      route: "/(tabs)/mood",
      group: "insight",
      icon: <HeartPulse size={18} color={colors.primary} strokeWidth={1.7} />,
    },
    {
      key: "topics",
      label: "Topics",
      description: "Conversation themes and tags",
      route: "/(tabs)/topics",
      group: "insight",
      icon: <Hash size={18} color={colors.primary} strokeWidth={1.7} />,
    },
    {
      key: "profile",
      label: "Profile",
      description: "Knowledge graph about you",
      route: "/(tabs)/profile",
      group: "account",
      icon: <User size={18} color={colors.primary} strokeWidth={1.7} />,
    },
    {
      key: "settings",
      label: "Settings",
      description: "Theme, notifications, account",
      route: "/(tabs)/settings",
      group: "account",
      icon: <Settings size={18} color={colors.primary} strokeWidth={1.7} />,
    },
  ];
}

export default function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const items = useMenuItems();

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const term = query.trim().toLowerCase();
    return items.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(term));
  }, [items, query]);

  const byGroup = useMemo(() => {
    const groupMap: Record<GroupKey, MenuItem[]> = {
      plan: [],
      insight: [],
      account: [],
    };
    filtered.forEach((item) => groupMap[item.group].push(item));
    return groupMap;
  }, [filtered]);

  return (
    <SafeAreaView style={styles.safe}>
      <GradientBackground>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Planner</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Everything you use daily, organized for quick execution.</Text>
          </View>

          <SearchInput value={query} onChangeText={setQuery} placeholder="Search tools..." />

          <View style={styles.topActionsRow}>
            <PressScale style={styles.topActionCell} onPress={() => router.push("/(tabs)/tasks" as never)}>
              <GlassCard padding={14} accentColor={colors.primary}>
                <View style={styles.topActionHead}>
                  <CalendarCheck2 size={16} color={colors.accent} strokeWidth={1.8} />
                  <PillBadge label="Today" small />
                </View>
                <Text style={[styles.topActionTitle, { color: colors.foreground }]}>Start Work Block</Text>
                <Text style={[styles.topActionBody, { color: colors.mutedForeground }]}>Open task queue</Text>
              </GlassCard>
            </PressScale>

            <PressScale style={styles.topActionCell} onPress={() => router.push("/(tabs)/journal" as never)}>
              <GlassCard padding={14}>
                <View style={styles.topActionHead}>
                  <BookOpen size={16} color={colors.accent} strokeWidth={1.8} />
                  <PillBadge label="Reflect" small />
                </View>
                <Text style={[styles.topActionTitle, { color: colors.foreground }]}>Write Journal</Text>
                <Text style={[styles.topActionBody, { color: colors.mutedForeground }]}>Capture daily notes</Text>
              </GlassCard>
            </PressScale>
          </View>

          <MenuGroup title="Planning" items={byGroup.plan} />
          <MenuGroup title="Insights" items={byGroup.insight} />
          <MenuGroup title="Account" items={byGroup.account} />

          <View style={styles.bottomGap} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

function MenuGroup({ title, items }: { title: string; items: MenuItem[] }) {
  const { colors } = useTheme();
  const router = useRouter();
  if (!items.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      {items.map((item, index) => (
        <PressScale
          key={item.key}
          onPress={() => router.push(item.route as never)}
          style={index < items.length - 1 ? styles.rowGap : undefined}
        >
          <GlassCard padding={14}>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>{item.icon}</View>
              <View style={styles.copyWrap}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.rowBody, { color: colors.mutedForeground }]}>{item.description}</Text>
              </View>
              <ArrowUpRight size={16} color={colors.mutedForeground} strokeWidth={1.8} />
            </View>
          </GlassCard>
        </PressScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontFamily: "Sora_700Bold",
    ...typography.title,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
  },
  topActionsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  topActionCell: {
    flex: 1,
  },
  topActionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  topActionTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
  topActionBody: {
    marginTop: 2,
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  section: {
    marginTop: 24,
  },
  rowGap: {
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  copyWrap: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
    marginBottom: 1,
  },
  rowBody: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
  },
  bottomGap: {
    height: 88,
  },
});
