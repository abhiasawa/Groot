import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Flame,
  CheckSquare,
  BookOpen,
  BarChart3,
  Hash,
  Users,
  User,
  Settings,
  Sparkles,
  HeartPulse,
  ArrowUpRight,
  Clock3,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GradientBackground } from "../../components/ui/gradient-background";
import { GlassCard } from "../../components/ui/glass-card";
import { PressScale } from "../../components/ui/press-scale";
import { SectionHeader } from "../../components/ui/section-header";
import { SearchInput } from "../../components/ui/search-input";
import { PillBadge } from "../../components/ui/pill-badge";

type GroupKey = "workflow" | "insight" | "account";
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
      key: "habits",
      label: "Habits",
      description: "Track routines and streaks",
      route: "/habits",
      group: "workflow",
      icon: <Flame size={18} color={colors.chart3} strokeWidth={1.6} />,
    },
    {
      key: "tasks",
      label: "Tasks",
      description: "Plan and close loops",
      route: "/(tabs)/tasks",
      group: "workflow",
      icon: <CheckSquare size={18} color={colors.chart2} strokeWidth={1.6} />,
    },
    {
      key: "people",
      label: "People",
      description: "Relationship memory graph",
      route: "/people",
      group: "workflow",
      icon: <Users size={18} color={colors.chart5} strokeWidth={1.6} />,
    },
    {
      key: "insights",
      label: "Insights",
      description: "Weekly synthesis reports",
      route: "/insights",
      group: "insight",
      icon: <BarChart3 size={18} color={colors.chart1} strokeWidth={1.6} />,
    },
    {
      key: "stories",
      label: "Stories",
      description: "Storyworthy moments",
      route: "/(tabs)/stories",
      group: "insight",
      icon: <Sparkles size={18} color={colors.chart4} strokeWidth={1.6} />,
    },
    {
      key: "mood",
      label: "Mood",
      description: "Emotional patterns and trends",
      route: "/(tabs)/mood",
      group: "insight",
      icon: <HeartPulse size={18} color={colors.chart5} strokeWidth={1.6} />,
    },
    {
      key: "topics",
      label: "Topics",
      description: "Conversation themes and tags",
      route: "/topics",
      group: "insight",
      icon: <Hash size={18} color={colors.primary} strokeWidth={1.6} />,
    },
    {
      key: "profile",
      label: "Profile",
      description: "Knowledge graph about you",
      route: "/profile",
      group: "account",
      icon: <User size={18} color={colors.accent} strokeWidth={1.6} />,
    },
    {
      key: "settings",
      label: "Settings",
      description: "Theme, notifications, account",
      route: "/settings",
      group: "account",
      icon: <Settings size={18} color={colors.mutedForeground} strokeWidth={1.6} />,
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
    return items.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(term),
    );
  }, [items, query]);

  const byGroup = useMemo(() => {
    const groupMap: Record<GroupKey, MenuItem[]> = {
      workflow: [],
      insight: [],
      account: [],
    };
    filtered.forEach((item) => groupMap[item.group].push(item));
    return groupMap;
  }, [filtered]);

  const pinned = filtered.filter((item) =>
    ["tasks", "habits", "insights", "settings"].includes(item.key),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <GradientBackground>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Studio</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Build your day, review your patterns, and manage your space.
            </Text>
          </View>

          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search sections..."
          />

          <View style={styles.featuredRow}>
            <FeaturedShortcut
              label="Start Review"
              subtitle="Jump into tasks"
              route="/(tabs)/tasks"
              icon={<Clock3 size={16} color="#FFFFFF" strokeWidth={1.8} />}
            />
            <FeaturedShortcut
              label="Reflect"
              subtitle="Open journal"
              route="/(tabs)/journal"
              icon={<BookOpen size={16} color="#FFFFFF" strokeWidth={1.8} />}
            />
          </View>

          <View style={styles.section}>
            <SectionHeader title="Pinned" />
            {pinned.length === 0 ? (
              <GlassCard padding={16}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No matching actions. Try a broader search term.
                </Text>
              </GlassCard>
            ) : (
              pinned.map((item, index) => (
                <PressScale
                  key={item.key}
                  onPress={() => router.push(item.route as never)}
                  style={index < pinned.length - 1 ? styles.rowGap : undefined}
                >
                  <GlassCard padding={14}>
                    <MenuRow item={item} />
                  </GlassCard>
                </PressScale>
              ))
            )}
          </View>

          <MenuGroup title="Workflows" items={byGroup.workflow} />
          <MenuGroup title="Insights" items={byGroup.insight} />
          <MenuGroup title="Profile & App" items={byGroup.account} />

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
            <MenuRow item={item} />
            {item.group === "insight" ? (
              <View style={styles.tagRow}>
                <PillBadge label="Analysis" small />
              </View>
            ) : null}
          </GlassCard>
        </PressScale>
      ))}
    </View>
  );
}

function FeaturedShortcut({
  label,
  subtitle,
  route,
  icon,
}: {
  label: string;
  subtitle: string;
  route: string;
  icon: React.ReactNode;
}) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <PressScale style={styles.featuredCard} onPress={() => router.push(route as never)}>
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featuredGradient}
      >
        <View style={styles.featuredIconWrap}>{icon}</View>
        <Text style={styles.featuredLabel}>{label}</Text>
        <Text style={styles.featuredSubtitle}>{subtitle}</Text>
      </LinearGradient>
    </PressScale>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>{item.icon}</View>
      <View style={styles.copyWrap}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.label}</Text>
        <Text style={[styles.rowBody, { color: colors.mutedForeground }]}>{item.description}</Text>
      </View>
      <ArrowUpRight size={16} color={colors.mutedForeground} strokeWidth={1.8} />
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
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
  },
  featuredRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  featuredCard: {
    flex: 1,
  },
  featuredGradient: {
    borderRadius: 18,
    padding: 14,
    minHeight: 92,
  },
  featuredIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  featuredLabel: {
    fontFamily: "Sora_600SemiBold",
    ...typography.sm,
    color: "#FFFFFF",
  },
  featuredSubtitle: {
    marginTop: 3,
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    color: "rgba(255,255,255,0.86)",
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
    borderRadius: 12,
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
  tagRow: {
    marginTop: 10,
    flexDirection: "row",
  },
  emptyText: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
  },
  bottomGap: {
    height: 88,
  },
});
