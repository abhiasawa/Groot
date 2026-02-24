import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Hash, User, Settings, Sparkles, HeartPulse, ArrowUpRight } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { GradientBackground } from "../../components/ui/gradient-background";
import { GlassCard } from "../../components/ui/glass-card";
import { PressScale } from "../../components/ui/press-scale";
import { SectionHeader } from "../../components/ui/section-header";
import { SearchInput } from "../../components/ui/search-input";
import { TabSwipeView } from "../../components/ui/tab-swipe-view";

type GroupKey = "discover" | "account";
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
      key: "stories",
      label: "Stories",
      description: "Storyworthy moments",
      route: "/(tabs)/stories",
      group: "discover",
      icon: <Sparkles size={18} color={colors.primary} strokeWidth={1.7} />,
    },
    {
      key: "mood",
      label: "Mood",
      description: "Emotion patterns and trends",
      route: "/(tabs)/mood",
      group: "discover",
      icon: <HeartPulse size={18} color={colors.primary} strokeWidth={1.7} />,
    },
    {
      key: "topics",
      label: "Topics",
      description: "Conversation themes and tags",
      route: "/(tabs)/topics",
      group: "discover",
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
  const [query, setQuery] = useState("");
  const items = useMenuItems();

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const term = query.trim().toLowerCase();
    return items.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(term));
  }, [items, query]);

  const byGroup = useMemo(() => {
    const groupMap: Record<GroupKey, MenuItem[]> = {
      discover: [],
      account: [],
    };
    filtered.forEach((item) => groupMap[item.group].push(item));
    return groupMap;
  }, [filtered]);

  return (
    <SafeAreaView style={styles.safe}>
      <TabSwipeView currentTab="more">
        <GradientBackground>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>More</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Discovery and account tools.
              </Text>
            </View>

            <SearchInput value={query} onChangeText={setQuery} placeholder="Search tools..." />

            <MenuGroup title="Discover" items={byGroup.discover} />
            <MenuGroup title="Account" items={byGroup.account} />

            <View style={styles.bottomGap} />
          </ScrollView>
        </GradientBackground>
      </TabSwipeView>
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
