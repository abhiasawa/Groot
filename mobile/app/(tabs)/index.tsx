import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BookOpen, CheckSquare, ChevronRight, Clock3 } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useHome } from "../../lib/api/queries";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { PressScale } from "../../components/ui/press-scale";
import { SectionHeader } from "../../components/ui/section-header";
import { PillBadge } from "../../components/ui/pill-badge";
import type { HomeData } from "../../../shared/types/api";

function greetingByHour() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDateLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { data, isLoading, refetch } = useHome();
  const router = useRouter();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    refetch().finally(() => setIsPullRefreshing(false));
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  const home = data as HomeData | undefined;
  if (!home) {
    return (
      <SafeAreaView style={styles.flex}>
        <GradientBackground>
          <View style={styles.center}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Start your journal</Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Your planner dashboard will appear once you add your first entry.</Text>
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  const shortcuts = [
    {
      label: "New Journal",
      description: "Capture thoughts",
      icon: <BookOpen size={18} color={colors.primary} strokeWidth={1.8} />,
      route: "/(tabs)/journal",
    },
    {
      label: "Open Tasks",
      description: "Execute priorities",
      icon: <CheckSquare size={18} color={colors.primary} strokeWidth={1.8} />,
      route: "/(tabs)/tasks",
    },
  ] as const;

  return (
    <SafeAreaView style={styles.flex}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <PillBadge label={formatDateLabel()} />
            <Text style={[styles.heading, { color: colors.foreground }]}>{greetingByHour()}</Text>
            <Text style={[styles.name, { color: colors.foreground }]}>{home.displayName || "there"}</Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>Plan your day, write your journal, and close your loops.</Text>
          </View>

          <GlassCard padding={18} accentColor={colors.primary} style={styles.cardGap}>
            <View style={styles.planTop}>
              <View style={styles.planTopLeft}>
                <Clock3 size={14} color={colors.accent} strokeWidth={1.9} />
                <Text style={[styles.planLabel, { color: colors.accent }]}>Today Plan</Text>
              </View>
              <PillBadge label={`${home.pendingTasks} open`} small />
            </View>

            <View style={styles.planStats}>
              <PlanStat label="Tasks" value={home.pendingTasks} />
              <PlanStat label="Journal" value={home.recentMemories?.length ?? 0} />
            </View>
          </GlassCard>

          <View style={styles.section}>
            <SectionHeader title="Quick Actions" />
            <View style={styles.shortcutGrid}>
              {shortcuts.map((item) => (
                <PressScale
                  key={item.label}
                  style={styles.shortcutCell}
                  onPress={() => router.push(item.route as never)}
                >
                  <GlassCard padding={14}>
                    <View style={styles.shortcutRow}>
                      <View style={styles.shortcutIconWrap}>{item.icon}</View>
                      <View style={styles.shortcutCopy}>
                        <Text style={[styles.shortcutTitle, { color: colors.foreground }]}>{item.label}</Text>
                        <Text style={[styles.shortcutBody, { color: colors.mutedForeground }]}>{item.description}</Text>
                      </View>
                      <ChevronRight size={16} color={colors.mutedForeground} strokeWidth={1.8} />
                    </View>
                  </GlassCard>
                </PressScale>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Latest Note" action="Open" onAction={() => router.push("/(tabs)/journal")} />
            <GlassCard padding={16}>
              {home.recentMemories?.slice(0, 1).map((memory, index) => (
                <View
                  key={memory.id}
                  style={[
                    styles.memoryRow,
                    index === 0 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Text style={[styles.memoryText, { color: colors.foreground }]} numberOfLines={3}>
                    {memory.content}
                  </Text>
                </View>
              ))}

              {!home.recentMemories?.length ? (
                <Text style={[styles.memoryText, { color: colors.mutedForeground }]}>No entries yet. Start with a short daily reflection.</Text>
              ) : null}
            </GlassCard>
          </View>

          <View style={styles.bottomGap} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

function PlanStat({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 44,
  },
  header: {
    marginBottom: 14,
  },
  heading: {
    marginTop: 10,
    fontFamily: "Manrope_500Medium",
    ...typography.base,
  },
  name: {
    fontFamily: "Sora_700Bold",
    ...typography["2xl"],
  },
  subheading: {
    marginTop: 2,
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
  },
  cardGap: {
    marginBottom: 22,
  },
  planTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  planTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  planLabel: {
    fontFamily: "Manrope_700Bold",
    ...typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  planStats: {
    flexDirection: "row",
    gap: 12,
  },
  statCell: {
    flex: 1,
  },
  statValue: {
    fontFamily: "Sora_700Bold",
    ...typography.xl,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
  },
  section: {
    marginBottom: 22,
  },
  shortcutGrid: {
    gap: 10,
  },
  shortcutCell: {
    width: "100%",
  },
  shortcutRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  shortcutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  shortcutCopy: {
    flex: 1,
  },
  shortcutTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.sm,
  },
  shortcutBody: {
    marginTop: 2,
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  memoryRow: {
    paddingVertical: 10,
  },
  memoryText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  emptyTitle: {
    textAlign: "center",
    fontFamily: "Sora_700Bold",
    ...typography.lg,
  },
  emptyCopy: {
    marginTop: 6,
    textAlign: "center",
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
  },
  bottomGap: {
    height: 90,
  },
});
