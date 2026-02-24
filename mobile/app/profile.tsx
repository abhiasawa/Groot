import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { User, Trash2, Pin, Zap, Heart, Target, Sparkles } from "lucide-react-native";

import { useTheme } from "../lib/theme/provider";
import { useProfile } from "../lib/api/queries";
import { useDeleteProfileFact } from "../lib/api/mutations";
import { typography } from "../constants/typography";
import { GlassCard } from "../components/ui/glass-card";
import { GradientBackground } from "../components/ui/gradient-background";
import { PressScale } from "../components/ui/press-scale";
import { SectionHeader } from "../components/ui/section-header";
import { PillBadge } from "../components/ui/pill-badge";
import { DeepScreenHeader } from "../components/ui/deep-screen-header";
import type { ProfileFact, ProfileData } from "../../shared/types/api";

interface CategoryConfig {
  key: keyof ProfileData["facts"];
  label: string;
  description: string;
  icon: React.ReactNode;
}

function useCategoryConfigs(): CategoryConfig[] {
  const { colors } = useTheme();

  return [
    {
      key: "static",
      label: "About You",
      description: "Core facts that stay mostly stable.",
      icon: <Pin size={15} color={colors.chart1} strokeWidth={1.8} />,
    },
    {
      key: "dynamic",
      label: "Current State",
      description: "Things that shift with your season.",
      icon: <Zap size={15} color={colors.chart2} strokeWidth={1.8} />,
    },
    {
      key: "preference",
      label: "Preferences",
      description: "What you like, dislike, and lean toward.",
      icon: <Heart size={15} color={colors.chart4} strokeWidth={1.8} />,
    },
    {
      key: "goal",
      label: "Goals",
      description: "Outcomes you are aiming to achieve.",
      icon: <Target size={15} color={colors.chart3} strokeWidth={1.8} />,
    },
  ];
}

function formatMentionDate(dateStr: string | null): string {
  if (!dateStr) return "Not mentioned recently";

  return `Last mentioned ${new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

function confidenceColor(
  confidence: number,
  colors: ReturnType<typeof useTheme>["colors"],
): { background: string; text: string } {
  if (confidence >= 0.82) {
    return { background: `${colors.moodGood}26`, text: colors.moodGood };
  }
  if (confidence >= 0.6) {
    return { background: `${colors.chart2}26`, text: colors.chart2 };
  }
  return { background: `${colors.mutedForeground}22`, text: colors.mutedForeground };
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, refetch } = useProfile();
  const deleteFact = useDeleteProfileFact();
  const categories = useCategoryConfigs();
  const [isPullRefreshing, setIsPullRefreshing] = React.useState(false);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    refetch().finally(() => setIsPullRefreshing(false));
  }, [refetch]);

  const sections = useMemo(() => {
    if (!data) return [];
    return categories
      .map((cat) => ({ ...cat, facts: data.facts[cat.key] ?? [] }))
      .filter((cat) => cat.facts.length > 0);
  }, [categories, data]);

  const summary = useMemo(() => {
    const allFacts = sections.flatMap((section) => section.facts);

    return {
      total: allFacts.length,
      categories: sections.length,
      strong: allFacts.filter((fact) => fact.confidence >= 0.75).length,
    };
  }, [sections]);

  const handleDelete = useCallback(
    (fact: ProfileFact) => {
      Alert.alert("Delete fact", `Remove \"${fact.key}: ${fact.value}\" from your profile?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteFact.mutate({ factId: fact.id }),
        },
      ]);
    },
    [deleteFact],
  );

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

  return (
    <SafeAreaView style={styles.flex}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <DeepScreenHeader
            title="Profile"
            subtitle="The knowledge graph Groot is building about you."
            onBack={() => router.back()}
            tags={["Identity", "Memory Graph"]}
          />

          {summary.total === 0 ? (
            <Animated.View entering={FadeInDown.duration(420)}>
              <GlassCard padding={26}>
                <View style={styles.emptyInner}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: colors.glassSurface }]}>
                    <User size={38} color={colors.mutedForeground} strokeWidth={1.2} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No profile facts yet</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Share your goals, preferences, and routines. Groot will organize them here automatically.</Text>
                </View>
              </GlassCard>
            </Animated.View>
          ) : (
            <>
              <GlassCard padding={18} accentColor={colors.primary} style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Sparkles size={13} color={colors.accent} strokeWidth={1.8} />
                  <Text style={[styles.summaryLabel, { color: colors.accent }]}>Profile Coverage</Text>
                </View>
                <View style={styles.summaryRow}>
                  <SummaryStat label="Facts" value={summary.total} />
                  <SummaryStat label="Active Buckets" value={summary.categories} />
                  <SummaryStat label="High Confidence" value={summary.strong} />
                </View>
              </GlassCard>

              {sections.map((section, sectionIndex) => (
                <View key={section.key} style={styles.sectionWrap}>
                  <SectionHeader title={section.label} />
                  <Text style={[styles.sectionDescription, { color: colors.mutedForeground }]}>
                    {section.description}
                  </Text>

                  {section.facts.map((fact: ProfileFact, factIndex: number) => {
                    const confidence = Math.round(fact.confidence * 100);
                    const tone = confidenceColor(fact.confidence, colors);

                    return (
                      <GlassCard
                        key={fact.id}
                        padding={14}
                        delay={sectionIndex * 80 + factIndex * 55}
                        style={styles.factCard}
                      >
                        <View style={styles.factHeader}>
                          <View style={styles.factHeaderLeft}>
                            <View style={[styles.categoryIconBadge, { backgroundColor: colors.glassSurface }]}>
                              {section.icon}
                            </View>
                            <Text style={[styles.factKey, { color: colors.mutedForeground }]}>{fact.key}</Text>
                          </View>

                          <View style={styles.factHeaderRight}>
                            <PillBadge
                              label={`${confidence}%`}
                              color={tone.background}
                              textColor={tone.text}
                              small
                            />
                            <PressScale onPress={() => handleDelete(fact)} style={styles.deleteButton}>
                              <Trash2 size={16} color={colors.destructive} strokeWidth={1.6} />
                            </PressScale>
                          </View>
                        </View>

                        <Text style={[styles.factValue, { color: colors.foreground }]}>{fact.value}</Text>
                        <Text style={[styles.factMeta, { color: colors.mutedForeground }]}>
                          {formatMentionDate(fact.lastMentioned)}
                        </Text>
                      </GlassCard>
                    );
                  })}
                </View>
              ))}
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.stat}>
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
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  summaryCard: {
    marginBottom: 22,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  summaryLabel: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
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
  sectionWrap: {
    marginBottom: 22,
  },
  sectionDescription: {
    marginTop: -8,
    marginBottom: 12,
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  factCard: {
    marginBottom: 9,
  },
  factHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  factHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  categoryIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  factHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deleteButton: {
    padding: 5,
  },
  factKey: {
    fontFamily: "Manrope_600SemiBold",
    ...typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  factValue: {
    fontFamily: "Manrope_500Medium",
    ...typography.base,
    lineHeight: 22,
  },
  factMeta: {
    marginTop: 6,
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  emptyInner: {
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    fontFamily: "Sora_700Bold",
    ...typography.lg,
  },
  emptySubtitle: {
    textAlign: "center",
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 20,
  },
});
