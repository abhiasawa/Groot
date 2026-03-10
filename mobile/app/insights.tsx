import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSegments } from "expo-router";
import {
  Brain,
  Filter,
  Heart,
  Lightbulb,
  Menu,
  Orbit,
  Sparkles,
  Sprout,
  TrendingUp,
  UserCircle2,
} from "lucide-react-native";

import { GradientBackground } from "../components/ui/gradient-background";
import { GlassCard } from "../components/ui/glass-card";
import { useMirror } from "../lib/api/queries";
import { useTheme } from "../lib/theme/provider";
import { typography } from "../constants/typography";

type ForestView = "insights" | "forest" | "patterns";

function nodeColor(type: string, colors: ReturnType<typeof useTheme>["colors"]) {
  if (type === "health") return colors.moodGreat;
  if (type === "ideas") return colors.chart3;
  return colors.primary;
}

export default function InsightsScreen() {
  const { colors } = useTheme();
  const segments = useSegments();
  const isTabRoute = segments[0] === "(tabs)";
  const { data, isLoading, refetch } = useMirror();
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<ForestView>("forest");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const clusters = useMemo(() => {
    const patterns = data?.patterns ?? [];
    const grouped = new Map<string, number>();
    patterns.forEach((pattern) => {
      const key = pattern.category?.toLowerCase() || "work";
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });
    return [
      { key: "work", label: "Work", icon: Brain, size: 106, left: 52, top: 64 },
      { key: "ideas", label: "Ideas", icon: Lightbulb, size: 82, left: 228, top: 72 },
      { key: "health", label: "Health", icon: Heart, size: 118, left: 136, top: 198 },
    ].map((item) => ({ ...item, count: grouped.get(item.key) ?? 0 }));
  }, [data?.patterns]);

  const topTabs: Array<{ key: ForestView; label: string }> = [
    { key: "insights", label: "Insights" },
    { key: "forest", label: "Forest Map" },
    { key: "patterns", label: "Patterns" },
  ];

  const weeklyInsight = data?.weeklyReports?.[0];
  const patterns = data?.patterns ?? [];
  const milestones = data?.milestones ?? [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <GradientBackground>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </GradientBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.stickyHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerRow}>
              <View style={[styles.roundButton, { backgroundColor: colors.secondary }]}>
                <Menu size={18} color={colors.foreground} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Groot Forest View</Text>
              <View style={[styles.roundButton, { backgroundColor: colors.secondary }]}>
                <Filter size={18} color={colors.foreground} />
              </View>
            </View>

            <View style={styles.tabRow}>
              {topTabs.map((tab) => {
                const active = view === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setView(tab.key)}
                    style={[
                      styles.topTab,
                      active ? [styles.topTabActive, { borderBottomColor: colors.primary }] : null,
                    ]}
                  >
                    <Text style={[styles.topTabText, { color: active ? colors.primary : colors.mutedForeground }]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {view === "forest" ? (
            <>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Neural Forest</Text>
                <View style={[styles.dynamicBadge, { backgroundColor: `${colors.primary}16` }]}>
                  <Text style={[styles.dynamicText, { color: colors.primary }]}>Dynamic View</Text>
                </View>
              </View>

              <GlassCard padding={0} style={styles.forestCard}>
                <View style={[styles.forestCanvas, { backgroundColor: colors.card }]}>
                  <View style={[styles.connector, styles.connectorA, { backgroundColor: `${colors.primary}30` }]} />
                  <View style={[styles.connector, styles.connectorB, { backgroundColor: `${colors.primary}24` }]} />
                  <View style={[styles.connector, styles.connectorC, { backgroundColor: `${colors.primary}24` }]} />

                  {clusters.map((cluster) => {
                    const Icon = cluster.icon;
                    return (
                      <View
                        key={cluster.key}
                        style={[
                          styles.nodeWrap,
                          {
                            width: cluster.size,
                            height: cluster.size,
                            left: cluster.left,
                            top: cluster.top,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.node,
                            {
                              width: cluster.size,
                              height: cluster.size,
                              borderRadius: cluster.size / 2,
                              backgroundColor: nodeColor(cluster.key, colors),
                            },
                          ]}
                        >
                          <Icon size={cluster.key === "health" ? 28 : 24} color={colors.primaryForeground} />
                          <Text style={[styles.nodeLabel, { color: colors.primaryForeground }]}>{cluster.label}</Text>
                          <Text style={[styles.nodeCount, { color: `${colors.primaryForeground}CC` }]}>
                            {cluster.count} active
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  <View style={[styles.smallNode, { left: 26, top: 176, backgroundColor: `${colors.primary}36` }]} />
                  <View
                    style={[
                      styles.smallNode,
                      {
                        right: 24,
                        bottom: 78,
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: `${colors.accent}20`,
                      },
                    ]}
                  />
                </View>
              </GlassCard>

              <Text style={[styles.canvasCaption, { color: colors.mutedForeground }]}>
                &quot;Health&quot; is currently your most active node, growing from recent check-ins and recurring care themes.
              </Text>

              <GlassCard padding={18} style={styles.echoCard}>
                <View style={styles.echoHead}>
                  <Sprout size={18} color={colors.primary} />
                  <Text style={[styles.echoTitle, { color: colors.foreground }]}>Echoes</Text>
                </View>
                <Text style={[styles.echoBody, { color: colors.mutedForeground }]}>
                  {data?.narrativeBio ?? "The forest is quiet today. I feel like my ideas are starting to take root, but I need more light to see them clearly."}
                </Text>
                <View style={styles.echoFooter}>
                  <View>
                    <Text style={[styles.echoMeta, { color: colors.mutedForeground }]}>Entry from your memory stream</Text>
                    <Text style={[styles.echoLink, { color: colors.primary }]}>Update this reflection?</Text>
                  </View>
                  <View style={[styles.echoButton, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.echoButtonText, { color: colors.primaryForeground }]}>Update</Text>
                  </View>
                </View>
              </GlassCard>

              <View style={styles.statsGrid}>
                <GlassCard padding={16} style={[styles.statCard, { backgroundColor: `${colors.moodGreat}14` }]}>
                  <TrendingUp size={18} color={colors.moodGreat} />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {Math.max(72, Math.min(96, (data?.stats?.daysActive ?? 0) + 72))}%
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Clarity Score</Text>
                </GlassCard>
                <GlassCard padding={16} style={styles.statCard}>
                  <Brain size={18} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{patterns.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active Clusters</Text>
                </GlassCard>
              </View>
            </>
          ) : null}

          {view === "insights" ? (
            <>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Forest Insights</Text>
                <View style={[styles.dynamicBadge, { backgroundColor: `${colors.accent}16` }]}>
                  <Text style={[styles.dynamicText, { color: colors.accent }]}>Weekly Read</Text>
                </View>
              </View>

              <GlassCard padding={18} style={styles.reportCard}>
                <View style={styles.reportHead}>
                  <View style={[styles.reportBadge, { backgroundColor: `${colors.primary}14` }]}>
                    <Sparkles size={16} color={colors.primary} />
                  </View>
                  <View style={styles.reportCopy}>
                    <Text style={[styles.reportTitle, { color: colors.foreground }]}>Garden Summary</Text>
                    <Text style={[styles.reportMeta, { color: colors.mutedForeground }]}>
                      {weeklyInsight?.week_start ? `Week of ${weeklyInsight.week_start}` : "Latest synthesis"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.reportBody, { color: colors.mutedForeground }]}>
                  {weeklyInsight?.summary ?? data?.narrativeBio ?? "Your mindspace is stabilizing around work, health, and recurring reflection patterns."}
                </Text>
                {weeklyInsight?.key_topics?.length ? (
                  <View style={styles.pillRow}>
                    {weeklyInsight.key_topics.slice(0, 3).map((topic) => (
                      <View key={topic} style={[styles.topicPill, { backgroundColor: `${colors.primary}12` }]}>
                        <Text style={[styles.topicPillText, { color: colors.primary }]}>#{topic}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </GlassCard>

              <View style={styles.statsGrid}>
                <GlassCard padding={16} style={styles.statCard}>
                  <Orbit size={18} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{data?.stats?.totalMemories ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Memories Rooted</Text>
                </GlassCard>
                <GlassCard padding={16} style={styles.statCard}>
                  <Sprout size={18} color={colors.chart5} />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{data?.stats?.daysActive ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Days Active</Text>
                </GlassCard>
              </View>

              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Milestones</Text>
              </View>

              <View style={styles.listStack}>
                {(milestones.length ? milestones : [{ id: "fallback", title: "No milestones yet", description: "Capture a few more seeds and patterns will begin to bloom.", icon: "sprout" }]).slice(0, 3).map((item) => (
                  <GlassCard key={item.id} padding={16}>
                    <View style={styles.milestoneRow}>
                      <View style={[styles.milestoneIcon, { backgroundColor: `${colors.primary}14` }]}>
                        <Sprout size={16} color={colors.primary} />
                      </View>
                      <View style={styles.milestoneCopy}>
                        <Text style={[styles.milestoneTitle, { color: colors.foreground }]}>{item.title}</Text>
                        <Text style={[styles.milestoneBody, { color: colors.mutedForeground }]}>{item.description}</Text>
                      </View>
                    </View>
                  </GlassCard>
                ))}
              </View>
            </>
          ) : null}

          {view === "patterns" ? (
            <>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pattern Library</Text>
                <View style={[styles.dynamicBadge, { backgroundColor: `${colors.primary}16` }]}>
                  <Text style={[styles.dynamicText, { color: colors.primary }]}>{patterns.length} live</Text>
                </View>
              </View>

              <View style={styles.listStack}>
                {patterns.length ? (
                  patterns.map((pattern) => (
                    <GlassCard key={pattern.id} padding={16}>
                      <View style={styles.patternHead}>
                        <View style={[styles.patternIcon, { backgroundColor: `${colors.primary}12` }]}>
                          <TrendingUp size={16} color={colors.primary} />
                        </View>
                        <View style={styles.patternCopy}>
                          <Text style={[styles.patternTitle, { color: colors.foreground }]}>{pattern.title}</Text>
                          <Text style={[styles.patternMeta, { color: colors.primary }]}>
                            {pattern.category} • {Math.round(pattern.confidence * 100)}% confidence
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.patternBody, { color: colors.mutedForeground }]}>{pattern.description}</Text>
                      <View style={styles.pillRow}>
                        <View style={[styles.topicPill, { backgroundColor: `${colors.accent}14` }]}>
                          <Text style={[styles.topicPillText, { color: colors.accent }]}>{pattern.timeframe}</Text>
                        </View>
                      </View>
                    </GlassCard>
                  ))
                ) : (
                  <GlassCard padding={18}>
                    <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No patterns detected yet</Text>
                    <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                      Keep recording seeds and reflections. This area will start grouping themes once the garden has more history.
                    </Text>
                  </GlassCard>
                )}
              </View>
            </>
          ) : null}

          {!isTabRoute ? (
            <View style={styles.bottomNav}>
              {[
                { label: "Forest", Icon: Sprout },
                { label: "Vault", Icon: Brain },
                { label: "Patterns", Icon: TrendingUp },
                { label: "Profile", Icon: UserCircle2 },
              ].map(({ label, Icon }, index) => {
                const Comp = Icon;
                return (
                  <View key={label} style={styles.bottomNavItem}>
                    <Comp size={18} color={index === 2 ? colors.primary : colors.mutedForeground} />
                    <Text style={[styles.bottomNavText, { color: index === 2 ? colors.primary : colors.mutedForeground }]}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingBottom: 110,
  },
  stickyHeader: {
    paddingTop: 6,
    borderBottomWidth: 1,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  topTab: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  topTabActive: {
    borderBottomWidth: 3,
  },
  topTabText: {
    fontFamily: "Manrope_700Bold",
    ...typography.xs,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.xl,
  },
  dynamicBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dynamicText: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  forestCard: {
    marginHorizontal: 20,
    overflow: "hidden",
  },
  forestCanvas: {
    height: 360,
    position: "relative",
  },
  connector: {
    position: "absolute",
    height: 2,
  },
  connectorA: {
    left: "32%",
    top: "30%",
    width: "20%",
    transform: [{ rotate: "33deg" }],
  },
  connectorB: {
    left: "46%",
    top: "31%",
    width: "16%",
    transform: [{ rotate: "-30deg" }],
  },
  connectorC: {
    left: "44%",
    top: "49%",
    width: "2%",
    height: "20%",
  },
  nodeWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  node: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  nodeLabel: {
    fontFamily: "Sora_600SemiBold",
    ...typography.xs,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  nodeCount: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.caption,
    marginTop: 4,
  },
  smallNode: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  canvasCaption: {
    marginTop: 14,
    marginBottom: 18,
    paddingHorizontal: 28,
    textAlign: "center",
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 21,
  },
  echoCard: {
    marginHorizontal: 20,
    marginBottom: 18,
  },
  echoHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  echoTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
  },
  echoBody: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 22,
    marginBottom: 16,
  },
  echoFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  echoMeta: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  echoLink: {
    fontFamily: "Manrope_700Bold",
    ...typography.xs,
  },
  echoButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  echoButtonText: {
    fontFamily: "Manrope_700Bold",
    ...typography.xs,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
  },
  statValue: {
    fontFamily: "Sora_700Bold",
    ...typography["2xl"],
    marginTop: 10,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  reportCard: {
    marginHorizontal: 20,
    marginBottom: 18,
  },
  reportHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  reportBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  reportCopy: {
    flex: 1,
  },
  reportTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
    marginBottom: 4,
  },
  reportMeta: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.caption,
  },
  reportBody: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 22,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  topicPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  topicPillText: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  listStack: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 18,
  },
  milestoneRow: {
    flexDirection: "row",
    gap: 12,
  },
  milestoneIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneCopy: {
    flex: 1,
  },
  milestoneTitle: {
    fontFamily: "Manrope_700Bold",
    ...typography.sm,
    marginBottom: 4,
  },
  milestoneBody: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    lineHeight: 18,
  },
  patternHead: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  patternIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  patternCopy: {
    flex: 1,
  },
  patternTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.base,
    marginBottom: 4,
  },
  patternMeta: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  patternBody: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 22,
  },
  emptyTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 22,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bottomNavItem: {
    alignItems: "center",
    gap: 6,
  },
  bottomNavText: {
    fontFamily: "Manrope_700Bold",
    ...typography.caption,
  },
});
